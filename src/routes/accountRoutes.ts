import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UsuarioContaService } from '../services/UsuarioContaService';
import { TransacaoService } from '../services/TransacaoService';

const router = Router();

// GET /api/account/balance - Consultar saldo da conta
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const response = {
      accountNumber: usuario.numeroConta,
      agency: usuario.agencia,
      balance: usuario.saldo,
      availableBalance: usuario.saldo - (usuario.limiteCredito || 0),
      creditLimit: usuario.limiteCredito || 0,
      usedCreditLimit: Math.max(0, (usuario.limiteCredito || 0) - usuario.saldo),
      accountType: 'CONTA_CORRENTE',
      currency: 'BRL',
      lastUpdate: usuario.dataAtualizacao
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar saldo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/account/statement - Consultar extrato da conta
router.get('/statement', authMiddleware, async (req, res) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { startDate, endDate, limit = '50', page = '1' } = req.query;
    
    // Validação de parâmetros
    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    
    if (limitNum > 100) {
      return res.status(400).json({ error: 'Limite máximo de 100 transações por página' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar transações
    const extrato = await TransacaoService.consultarExtrato(
      userId,
      pageNum,
      limitNum
    );

    const transactions = extrato.movimentacoes.map(mov => ({
      id: mov.id,
      type: mov.tipo,
      amount: mov.valor,
      description: mov.descricao,
      date: mov.dataCriacao,
      status: mov.status || 'CONCLUIDA',
      category: mov.categoria,
      destinationAccount: mov.contaDestino,
      destinationAgency: mov.agenciaDestino,
      destinationName: mov.nomeDestinatario,
      pixKey: mov.chavePix,
      transactionCode: mov.codigoTransacao,
      fee: mov.taxa || 0,
      balance: mov.saldoApos
    }));

    const response = {
      accountNumber: usuario.numeroConta,
      agency: usuario.agencia,
      currentBalance: usuario.saldo,
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: transactions.length,
        hasNext: transactions.length === limitNum
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar extrato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;