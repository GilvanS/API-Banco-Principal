import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UsuarioContaService } from '../services/UsuarioContaService';
import { TransacaoService } from '../services/TransacaoService';
import { CartaoService } from '../services/CartaoService';
import { TipoCartao } from '../entities/Cartao';

const router = Router();

// GET /api/contas/saldo - Consultar saldo da conta corrente
router.get('/saldo', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
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

// GET /api/contas/extrato - Consultar extrato da conta corrente
router.get('/extrato', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { dataInicio, dataFim, tipoTransacao } = req.query;
    
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
      1, // page
      100, // limit
      dataInicio as string,
      dataFim as string,
      tipoTransacao as string
    );

    const transacoes = extrato.movimentacoes.map(mov => ({
      id: mov.id,
      descricao: mov.descricao,
      valor: mov.valor,
      data: mov.dataCriacao,
      tipo: mov.tipo,
      status: mov.status || 'CONCLUIDA'
    }));

    const response = {
      conta: {
        agencia: usuario.agencia,
        numeroConta: usuario.numeroConta,
        tipoConta: usuario.tipoConta
      },
      periodo: {
        dataInicio: dataInicio || null,
        dataFim: dataFim || null
      },
      transacoes,
      resumo: {
        totalTransacoes: transacoes.length,
        saldoAtual: usuario.saldo
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar extrato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;