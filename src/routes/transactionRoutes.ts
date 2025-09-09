import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UsuarioContaService } from '../services/UsuarioContaService';
import { TransacaoService } from '../services/TransacaoService';
import { TipoMovimentacao } from '../entities/Movimentacao';

const router = Router();

// POST /api/transactions/deposit - Realizar depósito
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { amount, description } = req.body;

    // Validações
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor do depósito deve ser maior que zero' });
    }

    if (amount > 50000) {
      return res.status(400).json({ error: 'Valor máximo para depósito é R$ 50.000,00' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Realizar depósito
    const resultado = await TransacaoService.depositar({
      agencia: usuario.agencia,
      conta: usuario.numeroConta,
      valor: amount
    });

    const response = {
      transactionId: resultado.dados.agencia, // Usando agencia como ID temporário
      type: 'DEPOSIT',
      amount: resultado.dados.valor,
      description: `Depósito realizado na conta ${usuario.agencia}/${usuario.numeroConta}`,
      date: resultado.dados.data,
      status: 'COMPLETED',
      newBalance: resultado.dados.saldoAtual,
      fee: 0
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Erro ao realizar depósito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/transactions/withdraw - Realizar saque
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { amount, description } = req.body;

    // Validações
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor do saque deve ser maior que zero' });
    }

    if (amount > 5000) {
      return res.status(400).json({ error: 'Valor máximo para saque é R$ 5.000,00' });
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

    // Realizar saque
    const novoSaldo = usuario.saldo - amount;
    await UsuarioContaService.atualizarSaldo(usuario.id, novoSaldo);

    // Registrar movimentação
    const movimentacao = await TransacaoService.depositar({
      agencia: usuario.agencia,
      conta: usuario.numeroConta,
      valor: amount
    });

    const response = {
      transactionId: movimentacao.dados.agencia, // Usando agencia como ID temporário
      type: 'WITHDRAW',
      amount: movimentacao.dados.valor,
      description: description || 'Saque em conta',
      date: movimentacao.dados.data,
      status: 'COMPLETED',
      newBalance: novoSaldo,
      fee: 0
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Erro ao realizar saque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/transactions/transfer - Realizar transferência
router.post('/transfer', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { 
      amount, 
      destinationAccount, 
      destinationAgency, 
      destinationName, 
      description,
      transferType = 'TED'
    } = req.body;

    // Validações
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor da transferência deve ser maior que zero' });
    }

    if (!destinationAccount || !destinationAgency) {
      return res.status(400).json({ error: 'Conta e agência de destino são obrigatórias' });
    }

    if (amount > 100000) {
      return res.status(400).json({ error: 'Valor máximo para transferência é R$ 100.000,00' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Calcular taxa
    let taxa = 0;
    if (transferType === 'TED') {
      taxa = 5.90;
    } else if (transferType === 'DOC') {
      taxa = 3.50;
    }

    const valorTotal = amount + taxa;

    // Verificar saldo disponível
    const saldoDisponivel = usuario.saldo + (usuario.limiteCredito || 0);
    if (valorTotal > saldoDisponivel) {
      return res.status(400).json({ error: 'Saldo insuficiente para realizar a transferência' });
    }

    // Realizar transferência
    const resultado = await TransacaoService.transferir({
      agenciaOrigem: usuario.agencia,
      contaOrigem: usuario.numeroConta,
      nomeOrigem: usuario.nomeCompleto,
      cpfOrigem: usuario.cpf,
      agenciaDestino: destinationAgency,
      contaDestino: destinationAccount,
      nomeDestino: destinationName,
      cpfDestino: '00000000000', // CPF fictício - seria necessário obter do usuário
      valor: amount
    });

    const response = {
      transactionId: resultado.dados.agenciaOrigem, // Usando agenciaOrigem como ID temporário
      type: 'TRANSFER',
      amount: resultado.dados.valor,
      description: `Transferência enviada para ${resultado.dados.nomeDestino} (${resultado.dados.agenciaDestino}/${resultado.dados.contaDestino})`,
      date: resultado.dados.data,
      status: 'COMPLETED',
      newBalance: usuario.saldo - amount, // Ajustar conforme necessário
      fee: taxa,
      destination: {
        account: destinationAccount,
        agency: destinationAgency,
        name: destinationName
      },
      transferType
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Erro ao realizar transferência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/transactions/pix - Realizar PIX
router.post('/pix', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).usuario?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { amount, pixKey, pixKeyType, description } = req.body;

    // Validações
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor do PIX deve ser maior que zero' });
    }

    if (!pixKey || !pixKeyType) {
      return res.status(400).json({ error: 'Chave PIX e tipo são obrigatórios' });
    }

    if (amount > 50000) {
      return res.status(400).json({ error: 'Valor máximo para PIX é R$ 50.000,00' });
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

    // Realizar PIX
    const resultado = await TransacaoService.transferirPIX({
      cpfOrigem: usuario.cpf,
      pixDestino: pixKey,
      tipoPix: pixKeyType === 'email' ? 'email' : 'cpf',
      valor: amount
    });

    const response = {
      transactionId: resultado.dados.cpfOrigem, // Usando cpfOrigem como ID temporário
      type: 'PIX',
      amount: resultado.dados.valor,
      description: `PIX enviado para ${pixKeyType.toUpperCase()}: ${pixKey}`,
      date: resultado.dados.data,
      status: 'COMPLETED',
      newBalance: usuario.saldo - amount, // Ajustar conforme necessário
      fee: 0,
      pixKey,
      pixKeyType,
      transactionCode: `PIX${Date.now()}`
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Erro ao realizar PIX:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;