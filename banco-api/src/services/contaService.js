const createError = require('http-errors');
const contasModel = require('../models/contasModel');

async function getContas(page = 1, limit = 10) {
    const contas = await contasModel.getContas();

    return {
        contas
    };
}

async function getContaById(id) {
    const contas = await contasModel.getContaById(id)
    return contas;
}

async function depositar(contaId, valor) {
    if (!contaId || !valor) {
        throw createError(400, 'Conta ID e valor são obrigatórios');
    }

    if (valor <= 0) {
        throw createError(400, 'Valor deve ser maior que zero');
    }

    if (valor > 10000) {
        throw createError(400, 'Valor máximo para depósito é R$ 10.000,00');
    }

    const conta = await contasModel.getContaById(contaId);
    if (!conta) {
        throw createError(404, 'Conta não encontrada');
    }

    await contasModel.atualizarSaldo(contaId, valor);
    
    return {
        message: 'Depósito realizado com sucesso',
        valor: valor,
        novoSaldo: conta.saldo + valor
    };
}

async function sacar(contaId, valor) {
    if (!contaId || !valor) {
        throw createError(400, 'Conta ID e valor são obrigatórios');
    }

    if (valor <= 0) {
        throw createError(400, 'Valor deve ser maior que zero');
    }

    if (valor > 5000) {
        throw createError(400, 'Valor máximo para saque é R$ 5.000,00');
    }

    const conta = await contasModel.getContaById(contaId);
    if (!conta) {
        throw createError(404, 'Conta não encontrada');
    }

    if (conta.saldo < valor) {
        throw createError(422, 'Saldo insuficiente');
    }

    await contasModel.atualizarSaldo(contaId, -valor);
    
    return {
        message: 'Saque realizado com sucesso',
        valor: valor,
        novoSaldo: conta.saldo - valor
    };
}

module.exports = {
    getContas,
    getContaById,
    depositar,
    sacar
};
