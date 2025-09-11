import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UsuarioContaService } from '../services/UsuarioContaService';
import { TransacaoService } from '../services/TransacaoService';
import { CartaoService } from '../services/CartaoService';
import { TipoCartao } from '../entities/Cartao';

const router = Router();

// GET /api/v1/account/me - Obter dados da conta do usuário autenticado
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Remover senha da resposta
    const { senha: _, ...usuarioSemSenha } = usuario;

    const response = {
      id: usuario.id,
      nomeCompleto: usuario.nomeCompleto,
      cpf: usuario.cpf,
      email: usuario.email,
      agencia: usuario.agencia,
      numeroConta: usuario.numeroConta,
      tipoConta: usuario.tipoConta,
      saldo: usuario.saldo,
      limiteCredito: usuario.limiteCredito,
      creditoUtilizado: usuario.creditoUtilizado,
      limiteDebitoDiario: usuario.limiteDebitoDiario,
      dataCriacao: usuario.dataCriacao
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar dados da conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/v1/account/balance - Obter saldo da conta do usuário autenticado
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const response = {
      contaCorrente: {
        saldo: usuario.saldo,
        agencia: usuario.agencia,
        numeroConta: usuario.numeroConta,
        tipoConta: usuario.tipoConta,
        moeda: 'BRL'
      },
      limiteCredito: {
        limite: usuario.limiteCredito,
        utilizado: usuario.creditoUtilizado,
        disponivel: usuario.limiteCredito - usuario.creditoUtilizado
      },
      limiteDiario: {
        limite: usuario.limiteDebitoDiario,
        moeda: 'BRL'
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar saldo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/v1/account/statement - Obter extrato da conta do usuário autenticado
router.get('/statement', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, transactionType, page = 1, limit = 50 } = req.query;
    const userId = (req as AuthRequest).usuario?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar transações com filtros
    const extrato = await TransacaoService.consultarExtrato(
      userId,
      Number(page),
      Number(limit),
      startDate as string,
      endDate as string,
      transactionType as string
    );

    const transactions = extrato.movimentacoes.map(mov => ({
      id: mov.id,
      type: mov.tipo,
      description: mov.descricao,
      amount: mov.valor,
      date: mov.dataCriacao,
      status: mov.status || 'COMPLETED'
    }));

    const response = {
      account: {
        id: usuario.id,
        agencia: usuario.agencia,
        numeroConta: usuario.numeroConta,
        nomeCompleto: usuario.nomeCompleto
      },
      statement: {
        transactions,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(extrato.paginacao.total / Number(limit)),
          totalTransactions: extrato.paginacao.total,
          limit: Number(limit)
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar extrato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/v1/account/bill-inquiry - Consultar fatura do cartão de crédito
router.get('/bill-inquiry', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar cartões de crédito do usuário
    const cartoesCredito = await CartaoService.buscarCartoesUsuario(userId);
    const cartaoCredito = cartoesCredito.find(c => c.tipo === TipoCartao.CREDITO && c.ativo);

    if (!cartaoCredito) {
      return res.status(404).json({ error: 'Cartão de crédito ativo não encontrado para o usuário' });
    }

    // Consultar fatura do cartão
    const fatura = await CartaoService.consultarFatura(userId, cartaoCredito.id);

    res.status(200).json({
      cardId: cartaoCredito.id,
      cardNumber: cartaoCredito.numero,
      valorTotal: fatura.faturaAtual || 0,
      valorMinimo: fatura.valorMinimo || 0,
      limite: fatura.limite,
      limiteDisponivel: fatura.limiteDisponivel,
      dataVencimento: fatura.dataVencimento,
      dataFechamento: fatura.dataFechamento,
      jurosRotativo: fatura.jurosRotativo,
      temFaturaPendente: (fatura.faturaAtual || 0) > 0
    });

  } catch (error: any) {
    console.error('Erro ao consultar fatura:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

export default router;