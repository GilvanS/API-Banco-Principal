import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UsuarioContaService } from '../services/UsuarioContaService';
import { CartaoService } from '../services/CartaoService';
import { TipoCartao } from '../entities/Cartao';

const router = Router();

// GET /api/cartoes/limite - Consultar limite do cartão
router.get('/limite', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar cartões do usuário
    const cartoes = await CartaoService.buscarCartoesUsuario(userId);
    
    if (!cartoes || cartoes.length === 0) {
      return res.status(404).json({ error: 'Nenhum cartão encontrado para este usuário' });
    }

    // Separar cartões por tipo
    const cartaoCredito = cartoes.find(c => c.tipo === TipoCartao.CREDITO && c.ativo);
    const cartaoDebito = cartoes.find(c => c.tipo === TipoCartao.DEBITO && c.ativo);

    const response: any = {
      usuario: {
        nome: usuario.nomeCompleto,
        agencia: usuario.agencia,
        conta: usuario.numeroConta
      },
      cartoes: []
    };

    // Adicionar informações do cartão de crédito se existir
    if (cartaoCredito) {
      response.cartoes.push({
        id: cartaoCredito.id,
        tipo: 'CREDITO',
        bandeira: cartaoCredito.bandeira,
        numero: `**** **** **** ${cartaoCredito.numero.slice(-4)}`,
        limite: {
          total: cartaoCredito.limite || 0,
          disponivel: cartaoCredito.limiteDisponivel || cartaoCredito.limite || 0,
          utilizado: (cartaoCredito.limite || 0) - (cartaoCredito.limiteDisponivel || cartaoCredito.limite || 0),
          faturaAtual: cartaoCredito.faturaAtual || 0
        },
        status: cartaoCredito.status,
        dataVencimento: cartaoCredito.dataVencimentoFatura,
        moeda: 'BRL'
      });
    }

    // Adicionar informações do cartão de débito se existir
    if (cartaoDebito) {
      response.cartoes.push({
        id: cartaoDebito.id,
        tipo: 'DEBITO',
        bandeira: cartaoDebito.bandeira,
        numero: `**** **** **** ${cartaoDebito.numero.slice(-4)}`,
        limite: {
          diario: usuario.limiteDebitoDiario,
          saldoConta: usuario.saldo
        },
        status: cartaoDebito.status,
        moeda: 'BRL'
      });
    }

    // Se não houver cartões ativos
    if (response.cartoes.length === 0) {
      return res.status(404).json({ error: 'Nenhum cartão ativo encontrado' });
    }

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar limite do cartão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/cartoes/limite/:cartaoId - Consultar limite de um cartão específico
router.get('/limite/:cartaoId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { cartaoId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar cartão específico
    const cartoes = await CartaoService.buscarCartoesUsuario(userId);
    const cartao = cartoes.find(c => c.id === cartaoId);
    
    if (!cartao) {
      return res.status(404).json({ error: 'Cartão não encontrado' });
    }

    let limiteInfo: any = {
      id: cartao.id,
      tipo: cartao.tipo,
      bandeira: cartao.bandeira,
      numero: `**** **** **** ${cartao.numero.slice(-4)}`,
      status: cartao.status,
      moeda: 'BRL'
    };

    if (cartao.tipo === TipoCartao.CREDITO) {
      limiteInfo.limite = {
        total: cartao.limite || 0,
        disponivel: cartao.limiteDisponivel || cartao.limite || 0,
        utilizado: (cartao.limite || 0) - (cartao.limiteDisponivel || cartao.limite || 0),
        faturaAtual: cartao.faturaAtual || 0,
        dataVencimento: cartao.dataVencimentoFatura,
        dataFechamento: cartao.dataFechamentoFatura
      };
    } else {
      limiteInfo.limite = {
        diario: usuario.limiteDebitoDiario,
        saldoConta: usuario.saldo
      };
    }

    res.json(limiteInfo);
  } catch (error) {
    console.error('Erro ao consultar limite do cartão específico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;