import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UsuarioContaService } from '../services/UsuarioContaService';
import { AppDataSource } from '../database/data-source';
import { Investment, TipoInvestimento, StatusInvestimento } from '../entities/Investment';
import { TransacaoService } from '../services/TransacaoService';
import { TipoMovimentacao } from '../entities/Movimentacao';

const router = Router();
const investmentRepository = AppDataSource.getRepository(Investment);

// GET /api/investments/summary - Resumo dos investimentos
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const investments = await investmentRepository.find({
      where: { usuarioConta: { id: userId } },
      order: { dataCriacao: 'DESC' }
    });

    const totalInvestido = investments.reduce((sum, inv) => sum + Number(inv.valorInvestido), 0);
    const totalAtual = investments.reduce((sum, inv) => sum + Number(inv.valorAtual), 0);
    const rentabilidadeTotal = totalInvestido > 0 ? ((totalAtual - totalInvestido) / totalInvestido) * 100 : 0;

    // Agrupar por tipo
    const porTipo = investments.reduce((acc, inv) => {
      if (!acc[inv.tipo]) {
        acc[inv.tipo] = {
          tipo: inv.tipo,
          quantidade: 0,
          valorInvestido: 0,
          valorAtual: 0,
          rentabilidade: 0
        };
      }
      acc[inv.tipo].quantidade++;
      acc[inv.tipo].valorInvestido += Number(inv.valorInvestido);
      acc[inv.tipo].valorAtual += Number(inv.valorAtual);
      return acc;
    }, {} as any);

    // Calcular rentabilidade por tipo
    Object.values(porTipo).forEach((tipo: any) => {
      tipo.rentabilidade = tipo.valorInvestido > 0 ? 
        ((tipo.valorAtual - tipo.valorInvestido) / tipo.valorInvestido) * 100 : 0;
    });

    const response = {
      totalInvested: totalInvestido,
      currentValue: totalAtual,
      totalReturn: totalAtual - totalInvestido,
      returnPercentage: rentabilidadeTotal,
      activeInvestments: investments.filter(inv => inv.status === StatusInvestimento.ATIVO).length,
      byType: Object.values(porTipo),
      recentInvestments: investments.slice(0, 5).map(inv => ({
        id: inv.id,
        name: inv.nome,
        type: inv.tipo,
        investedAmount: inv.valorInvestido,
        currentValue: inv.valorAtual,
        returnPercentage: inv.rentabilidade,
        status: inv.status,
        createdAt: inv.dataCriacao
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar resumo de investimentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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

    const [investments, total] = await investmentRepository.findAndCount({
      where: whereConditions,
      order: { dataCriacao: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    });

    const response = {
      investments: investments.map(inv => ({
        id: inv.id,
        name: inv.nome,
        type: inv.tipo,
        investedAmount: inv.valorInvestido,
        currentValue: inv.valorAtual,
        returnRate: inv.taxaRendimento,
        returnPercentage: inv.rentabilidade,
        maturityDate: inv.dataVencimento,
        status: inv.status,
        canRedeem: inv.permiteResgate,
        description: inv.descricao,
        createdAt: inv.dataCriacao
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

// POST /api/investments/apply - Aplicar em investimento
router.post('/apply', authMiddleware, async (req, res) => {
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
    const novoSaldo = usuario.saldo - amount;
    await UsuarioContaService.atualizarSaldo(usuario.id, novoSaldo);

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

    // Registrar movimentação
    await TransacaoService.depositar({
      agencia: usuario.agencia,
      conta: usuario.numeroConta,
      valor: amount
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
      newAccountBalance: novoSaldo,
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

// POST /api/investments/:investmentId/redeem - Resgatar investimento
router.post('/:investmentId/redeem', authMiddleware, async (req, res) => {
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

    const valorResgate = amount || investment.valorAtual;
    if (amount && amount > investment.valorAtual) {
      return res.status(400).json({ error: 'Valor de resgate maior que o disponível' });
    }

    // Atualizar saldo da conta
    const novoSaldoConta = Number(investment.usuarioConta.saldo) + Number(valorResgate);
    await UsuarioContaService.atualizarSaldo(userId, novoSaldoConta);

    // Atualizar ou remover investimento
    if (amount && amount < investment.valorAtual) {
      // Resgate parcial
      investment.valorAtual = Number(investment.valorAtual) - Number(valorResgate);
      investment.valorInvestido = Number(investment.valorInvestido) - Number(valorResgate);
      await investmentRepository.save(investment);
    } else {
      // Resgate total
      investment.status = StatusInvestimento.RESGATADO;
      await investmentRepository.save(investment);
    }

    // Registrar movimentação
    await TransacaoService.depositar({
      agencia: investment.usuarioConta.agencia,
      conta: investment.usuarioConta.numeroConta,
      valor: valorResgate
    });

    const response = {
      investmentId,
      redeemedAmount: valorResgate,
      remainingAmount: amount ? Number(investment.valorAtual) - Number(valorResgate) : 0,
      newAccountBalance: novoSaldoConta,
      redeemType: amount ? 'PARTIAL' : 'TOTAL',
      redeemedAt: new Date(),
      message: 'Resgate realizado com sucesso'
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao resgatar investimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;