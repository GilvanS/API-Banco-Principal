import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UsuarioContaService } from '../services/UsuarioContaService';
import { CartaoService } from '../services/CartaoService';
import { TransacaoService } from '../services/TransacaoService';
import { StatusCartao, TipoCartao } from '../entities/Cartao';

const router = Router();

// GET /api/cards - Listar cartões do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const cartoes = await CartaoService.buscarCartoesUsuario(userId);

    const response = cartoes.map(cartao => ({
      id: cartao.id,
      type: cartao.tipo,
      ownership: cartao.titularidade,
      brand: cartao.bandeira,
      lastFourDigits: cartao.numero.slice(-4),
      expiryDate: cartao.dataValidade,
      status: cartao.status,
      isActive: cartao.ativo,
      isVirtual: cartao.isVirtual,
      limit: cartao.limite,
      availableLimit: cartao.limiteDisponivel,
      currentInvoice: cartao.faturaAtual,
      invoiceDueDate: cartao.dataVencimentoFatura,
      invoiceClosingDate: cartao.dataFechamentoFatura,
      permissions: {
        onlinePurchases: cartao.permiteCompraOnline,
        internationalPurchases: cartao.permiteCompraExterior,
        withdrawals: cartao.permiteSaque
      },
      createdAt: cartao.dataCriacao
    }));

    res.json({ cards: response });
  } catch (error) {
    console.error('Erro ao listar cartões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/cards/request - Solicitar novo cartão
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { type, ownership = 'titular', brand = 'visa', isVirtual = false } = req.body;

    // Validações
    if (!type || !Object.values(TipoCartao).includes(type)) {
      return res.status(400).json({ error: 'Tipo de cartão inválido' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se já possui cartão do mesmo tipo
    const cartoesExistentes = await CartaoService.buscarCartoesUsuario(userId);
    const jaTemTipo = cartoesExistentes.some(c => c.tipo === type && c.ativo);
    
    if (jaTemTipo && ownership === 'titular') {
      return res.status(400).json({ error: 'Usuário já possui cartão deste tipo' });
    }

    // Solicitar cartão
    const novoCartao = await CartaoService.solicitarCartaoAdicional({
      usuarioId: userId,
      bandeira: brand,
      limite: 1000.00
    });

    const response = {
      cardId: novoCartao.id,
      type: novoCartao.tipo,
      ownership: novoCartao.titularidade,
      brand: novoCartao.bandeira,
      isVirtual: novoCartao.isVirtual,
      status: 'REQUESTED',
      estimatedDelivery: isVirtual ? 'Imediato' : '7-10 dias úteis',
      requestDate: novoCartao.dataCriacao
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Erro ao solicitar cartão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/cards/:cardId/block - Bloquear cartão
router.put('/:cardId/block', authMiddleware, async (req, res) => {
  try {
    const userId = req.usuario?.id;
    const { cardId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se o cartão pertence ao usuário
    const cartoes = await CartaoService.buscarCartoesUsuario(userId);
    const cartao = cartoes.find(c => c.id === cardId);
    
    if (!cartao) {
      return res.status(404).json({ error: 'Cartão não encontrado' });
    }

    if (cartao.status === StatusCartao.BLOQUEADO) {
      return res.status(400).json({ error: 'Cartão já está bloqueado' });
    }

    // Bloquear cartão
    await CartaoService.bloquearCartao(cardId, reason || 'Bloqueio solicitado pelo usuário');

    const response = {
      cardId,
      status: 'BLOCKED',
      reason: reason || 'Bloqueio solicitado pelo usuário',
      blockedAt: new Date(),
      message: 'Cartão bloqueado com sucesso'
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao bloquear cartão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/cards/:cardId/unblock - Desbloquear cartão
router.put('/:cardId/unblock', authMiddleware, async (req, res) => {
  try {
    const userId = req.usuario?.id;
    const { cardId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se o cartão pertence ao usuário
    const cartoes = await CartaoService.buscarCartoesUsuario(userId);
    const cartao = cartoes.find(c => c.id === cardId);
    
    if (!cartao) {
      return res.status(404).json({ error: 'Cartão não encontrado' });
    }

    if (cartao.status === StatusCartao.ATIVO) {
      return res.status(400).json({ error: 'Cartão já está ativo' });
    }

    // Desbloquear cartão
    await CartaoService.desbloquearCartao(cardId);

    const response = {
      cardId,
      status: 'ACTIVE',
      unblockedAt: new Date(),
      message: 'Cartão desbloqueado com sucesso'
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao desbloquear cartão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/cards/:cardId/invoice - Consultar fatura do cartão
router.get('/:cardId/invoice', authMiddleware, async (req, res) => {
  try {
    const userId = req.usuario?.id;
    const { cardId } = req.params;
    const { month, year } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se o cartão pertence ao usuário
    const cartoes = await CartaoService.buscarCartoesUsuario(userId);
    const cartao = cartoes.find(c => c.id === cardId);
    
    if (!cartao) {
      return res.status(404).json({ error: 'Cartão não encontrado' });
    }

    if (cartao.tipo !== TipoCartao.CREDITO) {
      return res.status(400).json({ error: 'Fatura disponível apenas para cartões de crédito' });
    }

    // Buscar transações do cartão
    const dataInicio = month && year ? new Date(parseInt(year as string), parseInt(month as string) - 1, 1) : new Date();
    const dataFim = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + 1, 0);

    // Simular busca de transações da fatura (implementar conforme necessário)
    const transacoes = [];

    const response = {
      cardId,
      invoiceMonth: dataInicio.getMonth() + 1,
      invoiceYear: dataInicio.getFullYear(),
      totalAmount: cartao.faturaAtual,
      minimumAmount: cartao.faturaAtual * 0.15, // 15% do valor total
      dueDate: cartao.dataVencimentoFatura,
      closingDate: cartao.dataFechamentoFatura,
      status: cartao.faturaAtual > 0 ? 'PENDING' : 'PAID',
      transactions: transacoes,
      summary: {
        previousBalance: 0,
        purchases: cartao.faturaAtual,
        payments: 0,
        fees: 0,
        interest: 0,
        totalAmount: cartao.faturaAtual
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar fatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/cards/:cardId/settings - Atualizar configurações do cartão
router.put('/:cardId/settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.usuario?.id;
    const { cardId } = req.params;
    const { onlinePurchases, internationalPurchases, withdrawals, limit } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se o cartão pertence ao usuário
    const cartoes = await CartaoService.buscarCartoesUsuario(userId);
    const cartao = cartoes.find(c => c.id === cardId);
    
    if (!cartao) {
      return res.status(404).json({ error: 'Cartão não encontrado' });
    }

    // Atualizar configurações
    await CartaoService.atualizarConfiguracoes(userId, cardId, {
      permiteCompraOnline: onlinePurchases,
      permiteCompraExterior: internationalPurchases,
      permiteSaque: withdrawals,
      limite: limit
    });

    const response = {
      cardId,
      settings: {
        onlinePurchases: onlinePurchases ?? cartao.permiteCompraOnline,
        internationalPurchases: internationalPurchases ?? cartao.permiteCompraExterior,
        withdrawals: withdrawals ?? cartao.permiteSaque,
        limit: limit ?? cartao.limite
      },
      updatedAt: new Date(),
      message: 'Configurações atualizadas com sucesso'
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao atualizar configurações do cartão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;