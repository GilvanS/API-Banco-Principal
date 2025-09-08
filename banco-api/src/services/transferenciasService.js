const createError = require('http-errors');
const contasModel = require('../models/contasModel');
const transferenciasModel = require('../models/transferenciasModel');

async function realizarTransferencia(contaOrigem, contaDestino, valor, token) {
    if (contaOrigem === contaDestino) {
        throw createError(422, 'Conta de origem e destino devem ser diferentes.');
    }

    if (valor < 10) {
        throw createError(422, 'O valor da transferencia deve ser maior ou igual a R$10,00.');
    }

    const contaOrigemData = await contasModel.getContaById(contaOrigem);
    const contaDestinoData = await contasModel.getContaById(contaDestino);

    if (!contaOrigemData || !contaDestinoData) {
        throw createError(404, 'Conta de origem ou destino nao encontrada.');
    }

    if (!contaOrigemData.ativa || !contaDestinoData.ativa) {
        throw createError(422, 'Conta de origem ou destino esta inativa.');
    }

    if (contaOrigemData.saldo < valor) {
        throw createError(422, 'Saldo insuficiente para realizar a transferencia.');
    }

    let autenticada = false;
    if (valor >= 5000) {
        if (!token || token !== '123456') {
            throw createError(401, 'Autenticacao necessaria para transferencias acima de R$5.000,00.');
        }
        autenticada = true;
    }

    await contasModel.atualizarSaldo(contaOrigem, -valor);
    await contasModel.atualizarSaldo(contaDestino, valor);
    await transferenciasModel.inserirTransferencia(contaOrigem, contaDestino, valor, autenticada);

    return { message: 'Transferencia realizada com sucesso.' };
}

async function getTransferencias(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const transferencias = await transferenciasModel.getTransferenciasPaginadas(limit, offset);
    const total = await transferenciasModel.getTotalTransferencias();

    return {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        transferencias,
    };
}

async function getTransferencia(id) {
    const transferencia = await transferenciasModel.getTransferenciaById(id);

    return transferencia;
}

async function atualizarTransferencia(id, contaOrigem, contaDestino, valor, token) {
    const transferencia = await transferenciasModel.getTransferenciaById(id);
    if (!transferencia) {
        throw createError(404, 'Transferencia nao encontrada.');
    }

    if (valor < 10) {
        throw createError(422, 'O valor da transferencia deve ser maior ou igual a R$10,00.');
    }

    const contaOrigemData = await contasModel.getContaById(contaOrigem);
    const contaDestinoData = await contasModel.getContaById(contaDestino);

    if (!contaOrigemData || !contaDestinoData) {
        throw createError(404, 'Conta de origem ou destino nao encontrada.');
    }

    if (!contaOrigemData.ativa || !contaDestinoData.ativa) {
        throw createError(422, 'Conta de origem ou destino esta inativa.');
    }

    if (contaOrigemData.saldo < valor) {
        throw createError(422, 'Saldo insuficiente para realizar a transferencia.');
    }

    let autenticada = false;
    if (valor >= 5000) {
        if (!token || token !== '123456') {
            throw createError(401, 'Autenticacao necessaria para transferencias acima de R$5.000,00.');
        }
        autenticada = true;
    }

    await contasModel.atualizarSaldo(contaOrigem, -valor);
    await contasModel.atualizarSaldo(contaDestino, valor);

    await transferenciasModel.atualizarTransferencia(id, contaOrigem, contaDestino, valor, autenticada);

    return { message: 'Transferencia atualizada com sucesso.' };
}

async function modificarTransferencia(id, campos) {
    const transferencia = await transferenciasModel.getTransferenciaById(id);
    if (!transferencia) {
        throw createError(404, 'Transferencia nao encontrada.');
    }

    if (campos.valor && campos.valor < 10) {
        throw createError(422, 'O valor da transferencia deve ser maior ou igual a R$10,00.');
    }

    let valorAlterado = false;
    if (campos.valor && campos.valor !== transferencia.valor) {
        valorAlterado = true;
    }

    if (campos.contaOrigem) {
        const contaOrigemData = await contasModel.getContaById(campos.contaOrigem);
        if (!contaOrigemData || !contaOrigemData.ativa) {
            throw createError(422, 'Conta de origem invalida ou inativa.');
        }
    }

    if (campos.contaDestino) {
        const contaDestinoData = await contasModel.getContaById(campos.contaDestino);
        if (!contaDestinoData || !contaDestinoData.ativa) {
            throw createError(422, 'Conta de destino invalida ou inativa.');
        }
    }

    if (campos.valor >= 5000) {
        if (!campos.token || campos.token !== '123456') {
            throw createError(401, 'Autenticacao necessaria para transferencias acima de R$5.000,00.');
        }
        campos.autenticada = true;
    }

    if (valorAlterado) {
        const contaOrigemData = await contasModel.getContaById(transferencia.contaOrigem);
        const contaDestinoData = await contasModel.getContaById(transferencia.contaDestino);

        if (!contaOrigemData || !contaDestinoData) {
            throw createError(404, 'Conta de origem ou destino nao encontrada.');
        }

        if (contaOrigemData.saldo < campos.valor) {
            throw createError(422, 'Saldo insuficiente para realizar a transferencia.');
        }

        // Atualizar o saldo das contas
        await contasModel.atualizarSaldo(transferencia.contaOrigem, transferencia.valor);
        await contasModel.atualizarSaldo(transferencia.contaDestino, -transferencia.valor);

        await contasModel.atualizarSaldo(campos.contaOrigem || transferencia.contaOrigem, -campos.valor);
        await contasModel.atualizarSaldo(campos.contaDestino || transferencia.contaDestino, campos.valor);
    }

    await transferenciasModel.modificarTransferencia(id, campos);

    return { message: 'Transferencia modificada com sucesso.' };
}

async function removerTransferencia(id) {
    const transferencia = await transferenciasModel.getTransferenciaById(id);
    if (!transferencia) {
        throw createError(404, 'Transferencia nao encontrada.');
    }

    const contaOrigemData = await contasModel.getContaById(transferencia.contaOrigem);
    const contaDestinoData = await contasModel.getContaById(transferencia.contaDestino);

    if (!contaOrigemData || !contaDestinoData) {
        throw createError(404, 'Conta de origem ou destino nao encontrada.');
    }

    // Reverter o saldo das contas
    await contasModel.atualizarSaldo(transferencia.contaOrigem, transferencia.valor);
    await contasModel.atualizarSaldo(transferencia.contaDestino, -transferencia.valor);

    await transferenciasModel.removerTransferencia(id);

    return { message: 'Transferencia removida com sucesso.' };
}

async function transferirPorCpf(cpfOrigem, cpfDestino, valor, descricao = '') {
    // Buscar contas pelos CPFs
    const contaOrigem = await contasModel.getContaByCpf(cpfOrigem);
    const contaDestino = await contasModel.getContaByCpf(cpfDestino);

    if (!contaOrigem) {
        throw createError(404, 'Conta de origem não encontrada para o CPF informado');
    }

    if (!contaDestino) {
        throw createError(404, 'Conta de destino não encontrada para o CPF informado');
    }

    if (!contaOrigem.ativa || !contaDestino.ativa) {
        throw createError(422, 'Uma das contas está inativa');
    }

    if (contaOrigem.saldo < valor) {
        throw createError(422, 'Saldo insuficiente para realizar a transferência');
    }

    // Realizar a transferência
    await contasModel.atualizarSaldo(contaOrigem._id, -valor);
    await contasModel.atualizarSaldo(contaDestino._id, valor);

    // Registrar a transferência
    const transferencia = {
        contaOrigem: contaOrigem._id,
        contaDestino: contaDestino._id,
        valor: valor,
        descricao: descricao || `Transferência para ${contaDestino.titular}`,
        cpfOrigem: cpfOrigem,
        cpfDestino: cpfDestino,
        dataTransferencia: new Date()
    };

    const novaTransferencia = await transferenciasModel.criarTransferencia(transferencia);

    return {
        message: 'Transferência realizada com sucesso',
        transferencia: {
            id: novaTransferencia._id,
            valor: valor,
            contaOrigem: contaOrigem.titular,
            contaDestino: contaDestino.titular,
            cpfOrigem: cpfOrigem,
            cpfDestino: cpfDestino,
            descricao: transferencia.descricao,
            data: transferencia.dataTransferencia
        }
    };
}

module.exports = {
    realizarTransferencia,
    getTransferencias,
    atualizarTransferencia,
    modificarTransferencia,
    removerTransferencia,
    getTransferencia,
    transferirPorCpf
};
