import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UsuarioContaService } from '../services/UsuarioContaService';
import { TransacaoService } from '../services/TransacaoService';

const router = Router();

// GET /api/accounts/{accountId}/balance - Obter saldo da conta
router.get('/:accountId/balance', authMiddleware, async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = (req as AuthRequest).usuario?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario || usuario.id !== accountId) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const response = {
      accountId: usuario.id,
      balance: usuario.saldo,
      currency: 'BRL'
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar saldo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/accounts/{accountId}/statement - Obter extrato da conta
router.get('/:accountId/statement', authMiddleware, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate, transactionType } = req.query;
    const userId = (req as AuthRequest).usuario?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario || usuario.id !== accountId) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    // Buscar transações com filtros
    const extrato = await TransacaoService.consultarExtrato(
      userId,
      1, // page
      100, // limit
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
      accountId: usuario.id,
      transactions
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar extrato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;