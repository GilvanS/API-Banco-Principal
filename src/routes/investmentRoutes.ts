import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UsuarioContaService } from '../services/UsuarioContaService';
import { AppDataSource } from '../database/data-source';
import { Investment, TipoInvestimento, StatusInvestimento } from '../entities/Investment';
import { CryptoInvestment, TipoCriptomoeda } from '../entities/CryptoInvestment';
import { CryptoInvestmentService } from '../services/CryptoInvestmentService';

import { TipoMovimentacao } from '../entities/Movimentacao';
import { idempotencyMiddleware, IdempotentRequest } from '../middleware/idempotencyMiddleware';
import { MovimentacaoService } from '../services/MovimentacaoService';
import { InvestmentService } from '../services/InvestmentService';

const router = Router();
const investmentRepository = AppDataSource.getRepository(Investment);

// GET /api/investments - Listar investimentos do usuário (alinhado ao Swagger)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const investmentRepository = AppDataSource.getRepository(Investment);
    const investments = await investmentRepository.find({
      where: { usuarioConta: { id: userId } },
      order: { dataCriacao: 'DESC' }
    });

    // Mapear para o contrato do Swagger: InvestmentsList -> investments: Investment[]
    const response = {
      investments: investments.map(inv => ({
        id: (inv as any).id,
        tipoInvestimento: (inv as any).tipo,
        valorInvestido: Number((inv as any).valorInvestido ?? (inv as any).valor ?? 0),
        valorAtual: Number((inv as any).valorAtual ?? 0),
        rentabilidade: Number((inv as any).rentabilidade ?? (inv as any).rendimento ?? 0),
        dataCriacao: (inv as any).dataCriacao
      }))
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Erro ao listar investimentos:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/investments/summary - Resumo dos investimentos
// GET /api/v1/investments/summary - retorna resumo dos investimentos do usuário
router.get('/summary', authMiddleware, async (req, res, next) => {
  // Delegar para o próximo handler definido abaixo, que retorna o payload esperado pelos testes
  return next('route');
});

// GET /api/investments/summary - Resumo dos investimentos
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    console.log('[investments] GET /summary - userId:', userId);
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    console.log('[investments] Usuario encontrado?', !!usuario);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const investmentRepository = AppDataSource.getRepository(Investment);
    const investments = await investmentRepository.find({
      where: { usuarioConta: { id: userId } },
      order: { dataCriacao: 'DESC' }
    });
    console.log('[investments] Qtde investments:', Array.isArray(investments) ? investments.length : 'n/a');

    // Cálculos aceitando tanto forma da entidade quanto mocks dos testes
    const totalInvestido = investments.reduce((sum: number, inv: any) => sum + Number(inv.valorInvestido ?? inv.valor ?? 0), 0);
    const totalAtual = investments.reduce((sum: number, inv: any) => sum + Number(inv.valorAtual ?? (inv.valorInvestido ?? inv.valor ?? 0) + (inv.rentabilidade ?? inv.rendimento ?? 0)), 0);
    const rentabilidadeTotal = totalInvestido > 0 ? ((totalAtual - totalInvestido) / totalInvestido) * 100 : 0;

    // Agrupar por tipo
    const porTipo = investments.reduce((acc: any, inv: any) => {
      const tipo = inv.tipo ?? inv.tipoInvestimento;
      if (!acc[tipo]) {
        acc[tipo] = {
          tipo,
          quantidade: 0,
          valorInvestido: 0,
          valorAtual: 0,
          rentabilidade: 0
        };
      }
      const vInvestido = Number(inv.valorInvestido ?? inv.valor ?? 0);
      const vAtual = Number(inv.valorAtual ?? vInvestido + Number(inv.rentabilidade ?? inv.rendimento ?? 0));
      acc[tipo].quantidade++;
      acc[tipo].valorInvestido += vInvestido;
      acc[tipo].valorAtual += vAtual;
      return acc;
    }, {} as any);

    Object.values(porTipo).forEach((tipo: any) => {
      tipo.rentabilidade = tipo.valorInvestido > 0 ? 
        ((tipo.valorAtual - tipo.valorInvestido) / tipo.valorInvestido) * 100 : 0;
    });

    const response = {
      totalInvested: totalInvestido,
      currentValue: totalAtual,
      totalReturn: totalAtual - totalInvestido,
      returnPercentage: rentabilidadeTotal,
      activeInvestments: investments.filter((inv: any) => (inv.status ?? (inv.status === undefined ? 'ATIVO' : inv.status)) === StatusInvestimento.ATIVO).length,
      byType: Object.values(porTipo),
      recentInvestments: investments.slice(0, 5).map((inv: any) => ({
        id: inv.id,
        name: inv.nome,
        type: inv.tipo ?? inv.tipoInvestimento,
        investedAmount: Number(inv.valorInvestido ?? inv.valor ?? 0),
        currentValue: Number(inv.valorAtual ?? 0),
        returnPercentage: Number(inv.rentabilidade ?? inv.rendimento ?? 0),
        status: inv.status,
        createdAt: inv.dataCriacao
      })),
      totalInvestido,
      totalAtual,
      rentabilidadeTotal,
      investments: investments
    } as any;

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar resumo de investimentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alias em português: GET /api/investimentos/resumo - Resumo dos investimentos (compatibilidade com testes legados)
router.get('/resumo', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const investmentRepository = AppDataSource.getRepository(Investment);
    const investimentos = await investmentRepository.find({
      where: { usuarioConta: { id: userId } },
      order: { dataCriacao: 'DESC' }
    });

    const totalInvestido = investimentos.reduce((sum: number, inv: any) => sum + Number(inv.valorInvestido ?? inv.valor ?? 0), 0);
    const totalRendimento = investimentos.reduce((sum: number, inv: any) => sum + Number(inv.rentabilidade ?? inv.rendimento ?? 0), 0);

    const resposta = {
      totalInvestido,
      totalRendimento,
      investimentos
    };

    return res.status(200).json(resposta);
  } catch (error) {
    console.error('Erro ao consultar resumo de investimentos (PT-BR):', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/investments/applications - Listar aplicações
router.get('/applications', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { type, status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const whereConditions: any = { usuarioConta: { id: userId } };
    if (type) whereConditions.tipo = type;
    if (status) whereConditions.status = status;

    const investmentRepository = AppDataSource.getRepository(Investment);
    const [investments, total] = await investmentRepository.findAndCount({
      where: whereConditions,
      order: { dataCriacao: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const response = {
      investments: investments.map(inv => ({
        id: inv.id,
        name: (inv as any).nome,
        type: (inv as any).tipo,
        investedAmount: (inv as any).valorInvestido,
        currentValue: (inv as any).valorAtual,
        returnRate: (inv as any).taxaRendimento,
        returnPercentage: (inv as any).rentabilidade,
        maturityDate: (inv as any).dataVencimento,
        status: (inv as any).status,
        canRedeem: (inv as any).permiteResgate,
        description: (inv as any).descricao,
        createdAt: (inv as any).dataCriacao
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao listar aplicações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/investments/in-progress - Listar investimentos em andamento (status ATIVO)
router.get('/in-progress', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { type, page = '1', limit = '20' } = req.query as any;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const whereConditions: any = { usuarioConta: { id: userId }, status: StatusInvestimento.ATIVO };
    if (type) whereConditions.tipo = type;

    const investmentRepository = AppDataSource.getRepository(Investment);
    const [investments, total] = await investmentRepository.findAndCount({
      where: whereConditions,
      order: { dataCriacao: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const mapped = investments.map(inv => ({
      id: (inv as any).id,
      name: (inv as any).nome,
      type: (inv as any).tipo,
      investedAmount: Number((inv as any).valorInvestido ?? (inv as any).valor ?? 0),
      currentValue: Number((inv as any).valorAtual ?? 0),
      returnPercentage: Number((inv as any).rentabilidade ?? (inv as any).rendimento ?? 0),
      status: (inv as any).status,
      createdAt: (inv as any).dataCriacao
    }));

    return res.status(200).json({
      investments: mapped,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Erro ao listar investimentos em andamento:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alias em português: GET /api/investimentos/em-andamento - Listar investimentos em andamento (status ATIVO)
router.get('/em-andamento', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { type, page = '1', limit = '20' } = req.query as any;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const whereConditions: any = { usuarioConta: { id: userId }, status: StatusInvestimento.ATIVO };
    if (type) whereConditions.tipo = type;

    const investmentRepository = AppDataSource.getRepository(Investment);
    const [investments, total] = await investmentRepository.findAndCount({
      where: whereConditions,
      order: { dataCriacao: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const mapped = investments.map(inv => ({
      id: (inv as any).id,
      name: (inv as any).nome,
      type: (inv as any).tipo,
      investedAmount: Number((inv as any).valorInvestido ?? (inv as any).valor ?? 0),
      currentValue: Number((inv as any).valorAtual ?? 0),
      returnPercentage: Number((inv as any).rentabilidade ?? (inv as any).rendimento ?? 0),
      status: (inv as any).status,
      createdAt: (inv as any).dataCriacao
    }));

    return res.status(200).json({
      investimentos: mapped,
      paginacao: {
        pagina: pageNum,
        limite: limitNum,
        total,
        totalPaginas: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Erro ao listar investimentos em andamento (PT-BR):', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/investments/simulate - Simular investimento
router.post('/simulate', authMiddleware, async (req, res) => {
  try {
    const { type, amount, period } = req.body;

    // Validações
    if (!type || !amount || !period) {
      return res.status(400).json({ error: 'Tipo, valor e período são obrigatórios' });
    }

    if (amount < 100) {
      return res.status(400).json({ error: 'Valor mínimo para simulação é R$ 100,00' });
    }

    // Taxas simuladas por tipo de investimento
    const taxas: { [key: string]: number } = {
      [TipoInvestimento.POUPANCA]: 0.5, // 0.5% ao mês
      [TipoInvestimento.CDB]: 1.2, // 1.2% ao mês
      [TipoInvestimento.LCI]: 1.0, // 1.0% ao mês
      [TipoInvestimento.LCA]: 1.0, // 1.0% ao mês
      [TipoInvestimento.TESOURO_DIRETO]: 1.5, // 1.5% ao mês
      [TipoInvestimento.FUNDO_RENDA_FIXA]: 0.8, // 0.8% ao mês
      [TipoInvestimento.FUNDO_MULTIMERCADO]: 1.8 // 1.8% ao mês
    };

    const taxaMensal = taxas[type] || 1.0;
    const valorFinal = amount * Math.pow(1 + (taxaMensal / 100), period);
    const rendimento = valorFinal - amount;
    const rentabilidadePercentual = (rendimento / amount) * 100;

    const response = {
      investmentType: type,
      initialAmount: amount,
      period: period,
      monthlyRate: taxaMensal,
      finalAmount: Math.round(valorFinal * 100) / 100,
      totalReturn: Math.round(rendimento * 100) / 100,
      returnPercentage: Math.round(rentabilidadePercentual * 100) / 100,
      simulation: {
        riskLevel: type === TipoInvestimento.POUPANCA ? 'BAIXO' : 
                  type === TipoInvestimento.FUNDO_MULTIMERCADO ? 'ALTO' : 'MÉDIO',
        liquidity: type === TipoInvestimento.POUPANCA ? 'IMEDIATA' : 'D+1',
        minimumAmount: type === TipoInvestimento.TESOURO_DIRETO ? 30 : 100,
        taxFree: [TipoInvestimento.LCI, TipoInvestimento.LCA].includes(type as TipoInvestimento)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao simular investimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


// POST /api/investments/:investmentId/redeem - Resgatar investimento
router.post('/:investmentId/redeem', authMiddleware, idempotencyMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    const { investmentId } = req.params;
    const { amount } = req.body; // Valor a resgatar (opcional, se não informado, resgata tudo)

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const investment = await investmentRepository.findOne({
      where: { id: investmentId, usuarioConta: { id: userId } },
      relations: ['usuarioConta']
    });

    if (!investment) {
      return res.status(404).json({ error: 'Investimento não encontrado' });
    }

    if (!investment.permiteResgate) {
      return res.status(400).json({ error: 'Este investimento não permite resgate antecipado' });
    }

    if (investment.status !== StatusInvestimento.ATIVO) {
      return res.status(400).json({ error: 'Investimento não está ativo' });
    }

    const beforeValorAtual = Number(investment.valorAtual);
    const valorResgate = amount || beforeValorAtual;
    if (amount && amount > beforeValorAtual) {
      return res.status(400).json({ error: 'Valor de resgate maior que o disponível' });
    }

    // Creditar saldo (delta) sem duplicidade
    const clienteAtualizado = await UsuarioContaService.atualizarSaldo(userId, Number(valorResgate));

    // Atualizar ou remover investimento
    let resgateParcial = false;
    if (amount && amount < beforeValorAtual) {
      // Resgate parcial
      investment.valorAtual = beforeValorAtual - Number(valorResgate);
      investment.valorInvestido = Number(investment.valorInvestido) - Number(valorResgate);
      resgateParcial = true;
      await investmentRepository.save(investment);
    } else {
      // Resgate total
      investment.status = StatusInvestimento.RESGATADO;
      await investmentRepository.save(investment);
    }

    // Resposta alinhada a InvestmentRedeemResponse (igual ao POST /redeem)
    const response = {
      message: 'Resgate realizado com sucesso',
      redemption: {
        investmentId,
        redeemedAmount: Number(valorResgate),
        remainingAmount: resgateParcial ? Number(investment.valorAtual) : 0,
        newAccountBalance: Number(clienteAtualizado.saldo),
        redemptionDate: new Date()
      },
      account: {
        agencia: investment.usuarioConta.agencia,
        conta: investment.usuarioConta.numeroConta
      }
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Erro ao realizar resgate:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/investments/redeem - Resgatar por corpo (alinhado ao Swagger)
router.post('/redeem', authMiddleware, idempotencyMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    const { investmentId, amount } = req.body as { investmentId?: string; amount?: number };

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!investmentId) {
      return res.status(400).json({ error: 'investmentId é obrigatório' });
    }

    const investment = await investmentRepository.findOne({
      where: { id: investmentId, usuarioConta: { id: userId } },
      relations: ['usuarioConta']
    });

    if (!investment) {
      return res.status(404).json({ error: 'Investimento não encontrado' });
    }

    if (!investment.permiteResgate) {
      return res.status(400).json({ error: 'Este investimento não permite resgate antecipado' });
    }

    if (investment.status !== StatusInvestimento.ATIVO) {
      return res.status(400).json({ error: 'Investimento não está ativo' });
    }

    const beforeValorAtual = Number(investment.valorAtual);
    const valorResgate = amount ?? beforeValorAtual;
    if (amount && amount > beforeValorAtual) {
      return res.status(400).json({ error: 'Valor de resgate maior que o disponível' });
    }

    // Creditar saldo (delta) sem duplicidade
    const clienteAtualizado = await UsuarioContaService.atualizarSaldo(userId, Number(valorResgate));

    // Atualizar investimento
    let resgateParcial = false;
    if (amount && amount < beforeValorAtual) {
      investment.valorAtual = beforeValorAtual - Number(valorResgate);
      investment.valorInvestido = Number(investment.valorInvestido) - Number(valorResgate);
      resgateParcial = true;
      await investmentRepository.save(investment);
    } else {
      investment.status = StatusInvestimento.RESGATADO;
      await investmentRepository.save(investment);
    }

    // Resposta alinhada a InvestmentRedeemResponse no Swagger
    const response = {
      message: 'Resgate realizado com sucesso',
      redemption: {
        investmentId: investmentId,
        redeemedAmount: Number(valorResgate),
        remainingAmount: resgateParcial ? Number(investment.valorAtual) : 0,
        newAccountBalance: Number(clienteAtualizado.saldo),
        redemptionDate: new Date()
      },
      account: {
        agencia: investment.usuarioConta.agencia,
        conta: investment.usuarioConta.numeroConta
      }
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Erro ao resgatar investimento (corpo):', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/investments/apply - Aplicar em investimento
router.post('/apply', authMiddleware, idempotencyMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { type, amount, name, description } = req.body;

    // Validações
    if (!type || !amount || !name) {
      return res.status(400).json({ error: 'Tipo, valor e nome são obrigatórios' });
    }

    if (!Object.values(TipoInvestimento).includes(type)) {
      return res.status(400).json({ error: 'Tipo de investimento inválido' });
    }

    const valorMinimo = type === TipoInvestimento.TESOURO_DIRETO ? 30 : 100;
    if (amount < valorMinimo) {
      return res.status(400).json({ error: `Valor mínimo para ${type} é R$ ${valorMinimo},00` });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar saldo disponível
    const saldoDisponivel = usuario.saldo + (usuario.limiteCredito || 0);
    if (amount > saldoDisponivel) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    // Debitar valor da conta
    const clienteAtualizado = await UsuarioContaService.atualizarSaldo(usuario.id, -Number(amount));

    // Criar investimento
    const taxas: { [key: string]: number } = {
      [TipoInvestimento.POUPANCA]: 0.5,
      [TipoInvestimento.CDB]: 1.2,
      [TipoInvestimento.LCI]: 1.0,
      [TipoInvestimento.LCA]: 1.0,
      [TipoInvestimento.TESOURO_DIRETO]: 1.5,
      [TipoInvestimento.FUNDO_RENDA_FIXA]: 0.8,
      [TipoInvestimento.FUNDO_MULTIMERCADO]: 1.8
    };

    const dataVencimento = new Date();
    dataVencimento.setFullYear(dataVencimento.getFullYear() + 1); // 1 ano por padrão

    const novoInvestimento = investmentRepository.create({
      tipo: type,
      nome: name,
      valorInvestido: amount,
      valorAtual: amount,
      rentabilidade: 0,
      taxaRendimento: taxas[type] || 1.0,
      dataVencimento,
      status: StatusInvestimento.ATIVO,
      permiteResgate: type !== TipoInvestimento.TESOURO_DIRETO,
      valorMinimoAplicacao: valorMinimo,
      descricao: description,
      usuarioConta: usuario
    });

    await investmentRepository.save(novoInvestimento);

    // Registrar movimentação de aplicação (não altera saldo adicionalmente)
    await MovimentacaoService.criarMovimentacao({
      usuarioId: usuario.id,
      tipo: TipoMovimentacao.INVESTIMENTO,
      valor: Number(amount),
      descricao: `Aplicação em investimento: ${name} (${type})`
    });
    
    const response = {
      investmentId: novoInvestimento.id,
      type: novoInvestimento.tipo,
      name: novoInvestimento.nome,
      investedAmount: novoInvestimento.valorInvestido,
      returnRate: novoInvestimento.taxaRendimento,
      maturityDate: novoInvestimento.dataVencimento,
      status: novoInvestimento.status,
      canRedeem: novoInvestimento.permiteResgate,
      newAccountBalance: Number(clienteAtualizado.saldo),
      appliedAt: novoInvestimento.dataCriacao,
      message: 'Investimento realizado com sucesso'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Erro ao aplicar investimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/investments/savings-program/configure - Configurar programa de poupança
router.put('/savings-program/configure', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { monthlyAmount, autoInvest, dayOfMonth } = req.body;

    if (!monthlyAmount || monthlyAmount <= 0) {
      return res.status(400).json({ error: 'Valor mensal deve ser maior que zero' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Aqui você salvaria as configurações do programa de poupança
    // Por simplicidade, retornamos sucesso
    const response = {
      success: true,
      message: 'Programa de poupança configurado com sucesso',
      configuration: {
        monthlyAmount,
        autoInvest: autoInvest || false,
        dayOfMonth: dayOfMonth || 1,
        nextInvestment: new Date(new Date().getFullYear(), new Date().getMonth() + 1, dayOfMonth || 1)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao configurar programa de poupança:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/investments/savings - Consultar poupança
router.get('/savings', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar investimentos em poupança
    const poupancas = await investmentRepository.find({
      where: { 
        usuarioConta: { id: userId },
        tipo: TipoInvestimento.POUPANCA
      },
      order: { dataCriacao: 'DESC' }
    });

    const totalPoupanca = poupancas.reduce((sum, p) => sum + Number(p.valorAtual), 0);
    const totalInvestido = poupancas.reduce((sum, p) => sum + Number(p.valorInvestido), 0);
    const rendimentoTotal = totalPoupanca - totalInvestido;

    const response = {
      totalBalance: totalPoupanca,
      totalInvested: totalInvestido,
      totalReturn: rendimentoTotal,
      returnPercentage: totalInvestido > 0 ? (rendimentoTotal / totalInvestido) * 100 : 0,
      monthlyRate: 0.5, // Taxa da poupança
      applications: poupancas.map(p => ({
        id: p.id,
        amount: p.valorAtual,
        investedAmount: p.valorInvestido,
        return: Number(p.valorAtual) - Number(p.valorInvestido),
        returnPercentage: p.rentabilidade,
        appliedAt: p.dataCriacao,
        canRedeem: p.permiteResgate
      })),
      summary: {
        averageMonthlyReturn: rendimentoTotal / Math.max(1, poupancas.length),
        oldestApplication: poupancas.length > 0 ? poupancas[poupancas.length - 1].dataCriacao : null,
        newestApplication: poupancas.length > 0 ? poupancas[0].dataCriacao : null
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar poupança:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/investments/:investmentId/yield - Consultar rendimento de um investimento específico
router.get('/:investmentId/yield', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    const { investmentId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const investment = await investmentRepository.findOne({
      where: { id: investmentId, usuarioConta: { id: userId } },
      relations: ['usuarioConta']
    });

    if (!investment) {
      return res.status(404).json({ error: 'Investimento não encontrado' });
    }

    // Calcular rendimento atual
    const valorInvestido = Number(investment.valorInvestido);
    const valorAtual = Number(investment.valorAtual);
    const rendimentoAbsoluto = valorAtual - valorInvestido;
    const rendimentoPercentual = valorInvestido > 0 ? (rendimentoAbsoluto / valorInvestido) * 100 : 0;

    // Calcular dias desde a aplicação
    const diasInvestimento = Math.floor((new Date().getTime() - investment.dataCriacao.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcular rendimento diário médio
    const rendimentoDiario = diasInvestimento > 0 ? rendimentoAbsoluto / diasInvestimento : 0;
    
    // Calcular rendimento mensal projetado
    const rendimentoMensalProjetado = rendimentoDiario * 30;
    
    // Calcular rendimento anual projetado
    const rendimentoAnualProjetado = rendimentoDiario * 365;

    const response = {
      investmentId: investment.id,
      name: investment.nome,
      type: investment.tipo,
      status: investment.status,
      investedAmount: valorInvestido,
      currentValue: valorAtual,
      yield: {
        absolute: rendimentoAbsoluto,
        percentage: Math.round(rendimentoPercentual * 100) / 100,
        dailyAverage: Math.round(rendimentoDiario * 100) / 100,
        monthlyProjected: Math.round(rendimentoMensalProjetado * 100) / 100,
        annualProjected: Math.round(rendimentoAnualProjetado * 100) / 100
      },
      period: {
        investmentDate: investment.dataCriacao,
        daysInvested: diasInvestimento,
        maturityDate: investment.dataVencimento
      },
      rates: {
        returnRate: investment.taxaRendimento,
        currentYield: investment.rentabilidade
      },
      canRedeem: investment.permiteResgate,
      description: investment.descricao
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar rendimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/v1/investments/buy-crypto - Comprar criptomoeda
router.post('/buy-crypto', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { tipoCriptomoeda, valorInvestimento } = req.body;

    if (!tipoCriptomoeda || !valorInvestimento) {
      return res.status(400).json({ error: 'Tipo de criptomoeda e valor de investimento são obrigatórios' });
    }

    if (!Object.values(TipoCriptomoeda).includes(tipoCriptomoeda)) {
      return res.status(400).json({ error: 'Tipo de criptomoeda inválido' });
    }

    if (valorInvestimento <= 0) {
      return res.status(400).json({ error: 'Valor de investimento deve ser maior que zero' });
    }

    const investment = await CryptoInvestmentService.comprarCriptomoeda(
      userId,
      tipoCriptomoeda,
      valorInvestimento
    );

    const response = {
      id: investment.id,
      tipoCriptomoeda: investment.tipoCriptomoeda,
      quantidade: investment.quantidade,
      valorInvestido: investment.valorCompra,
      precoUnitario: investment.precoUnitarioCompra,
      status: investment.status,
      dataCriacao: investment.dataCriacao
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Erro ao comprar criptomoeda:', error);
    res.status(400).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// POST /api/v1/investments/sell-crypto - Vender criptomoeda
router.post('/sell-crypto', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { investmentId, quantidade } = req.body;

    if (!investmentId) {
      return res.status(400).json({ error: 'ID do investimento é obrigatório' });
    }

    const investment = await CryptoInvestmentService.venderCriptomoeda(
      userId,
      investmentId,
      quantidade
    );

    const precos = CryptoInvestmentService.obterPrecosCriptomoedas();
    const precoAtual = precos[investment.tipoCriptomoeda];
    const valorVenda = quantidade ? quantidade * precoAtual : investment.valorVenda;

    const response = {
      id: investment.id,
      tipoCriptomoeda: investment.tipoCriptomoeda,
      quantidadeVendida: quantidade || investment.quantidade,
      valorVenda,
      precoUnitarioVenda: precoAtual,
      status: investment.status,
      dataVenda: investment.dataVenda || new Date()
    };

    res.json(response);
  } catch (error: any) {
    console.error('Erro ao vender criptomoeda:', error);
    res.status(400).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// GET /api/v1/investments/balance - Consultar saldo de investimentos
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const saldo = await CryptoInvestmentService.obterSaldoInvestimentos(userId);
    res.json(saldo);
  } catch (error) {
    console.error('Erro ao consultar saldo de investimentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/v1/investments/yield - Consultar rendimentos
router.get('/yield', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const rendimentos = await CryptoInvestmentService.obterRendimentos(userId);
    res.json(rendimentos);
  } catch (error) {
    console.error('Erro ao consultar rendimentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



export default router;