const cartoesModel = require('../models/cartoesModel');
const contasModel = require('../models/contasModel');
const createError = require('http-errors');

// Bloquear cartão
async function bloquearCartao(cartaoId, motivo) {
    try {
        if (!cartaoId) {
            throw createError(400, 'ID do cartão é obrigatório');
        }
        
        const cartao = await cartoesModel.getCartaoById(cartaoId);
        if (!cartao) {
            throw createError(404, 'Cartão não encontrado');
        }
        
        if (cartao.status === 'bloqueado') {
            throw createError(400, 'Cartão já está bloqueado');
        }
        
        const resultado = await cartoesModel.atualizarStatusCartao(cartaoId, 'bloqueado', motivo);
        return resultado;
    } catch (error) {
        throw error;
    }
}

// Desbloquear cartão
async function desbloquearCartao(cartaoId) {
    try {
        if (!cartaoId) {
            throw createError(400, 'ID do cartão é obrigatório');
        }
        
        const cartao = await cartoesModel.getCartaoById(cartaoId);
        if (!cartao) {
            throw createError(404, 'Cartão não encontrado');
        }
        
        if (cartao.status === 'ativo') {
            throw createError(400, 'Cartão já está ativo');
        }
        
        const resultado = await cartoesModel.atualizarStatusCartao(cartaoId, 'ativo');
        return resultado;
    } catch (error) {
        throw error;
    }
}

// Solicitar novo cartão
async function solicitarNovoCartao(dados) {
    try {
        const { usuarioId, tipo, bandeira, isVirtual } = dados;
        
        if (!usuarioId || !tipo || !bandeira) {
            throw createError(400, 'Dados obrigatórios: usuarioId, tipo e bandeira');
        }
        
        // Verificar se o usuário existe
        const usuario = await contasModel.getContaById(usuarioId);
        if (!usuario) {
            throw createError(404, 'Usuário não encontrado');
        }
        
        // Gerar número do cartão
        const numeroCartao = gerarNumeroCartao(bandeira);
        const cvv = gerarCVV();
        const dataValidade = gerarDataValidade();
        
        const novoCartao = {
            usuarioId,
            tipo,
            bandeira,
            numero: numeroCartao,
            cvv,
            dataValidade,
            status: 'ativo',
            isVirtual: isVirtual || false,
            limite: tipo === 'credito' ? 1000.00 : null,
            dataCriacao: new Date()
        };
        
        const resultado = await cartoesModel.criarCartao(novoCartao);
        return resultado;
    } catch (error) {
        throw error;
    }
}

// Consultar fatura do cartão de crédito
async function consultarFatura(cartaoId, mes, ano) {
    try {
        if (!cartaoId) {
            throw createError(400, 'ID do cartão é obrigatório');
        }
        
        const cartao = await cartoesModel.getCartaoById(cartaoId);
        if (!cartao) {
            throw createError(404, 'Cartão não encontrado');
        }
        
        if (cartao.tipo !== 'credito') {
            throw createError(400, 'Fatura disponível apenas para cartões de crédito');
        }
        
        // Se não especificado, usar mês/ano atual
        const dataAtual = new Date();
        const mesConsulta = mes || (dataAtual.getMonth() + 1);
        const anoConsulta = ano || dataAtual.getFullYear();
        
        const fatura = await cartoesModel.getFaturaCartao(cartaoId, mesConsulta, anoConsulta);
        
        return {
            cartaoId,
            mes: mesConsulta,
            ano: anoConsulta,
            valorTotal: fatura.valorTotal || 0,
            valorMinimo: fatura.valorMinimo || (fatura.valorTotal * 0.15), // 15% do total
            dataVencimento: fatura.dataVencimento,
            dataFechamento: fatura.dataFechamento,
            transacoes: fatura.transacoes || [],
            status: fatura.status || 'em_aberto'
        };
    } catch (error) {
        throw error;
    }
}

// Pagar fatura do cartão de crédito
async function pagarFatura(cartaoId, valor, tipoPagamento) {
    try {
        if (!cartaoId || !valor || !tipoPagamento) {
            throw createError(400, 'Dados obrigatórios: cartaoId, valor e tipoPagamento');
        }
        
        const cartao = await cartoesModel.getCartaoById(cartaoId);
        if (!cartao) {
            throw createError(404, 'Cartão não encontrado');
        }
        
        if (cartao.tipo !== 'credito') {
            throw createError(400, 'Pagamento de fatura disponível apenas para cartões de crédito');
        }
        
        // Verificar saldo da conta para pagamento
        const conta = await contasModel.getContaById(cartao.usuarioId);
        if (conta.saldo < valor) {
            throw createError(400, 'Saldo insuficiente para pagamento da fatura');
        }
        
        // Processar pagamento
        const resultadoPagamento = await cartoesModel.processarPagamentoFatura(cartaoId, valor, tipoPagamento);
        
        // Debitar valor da conta
        await contasModel.atualizarSaldo(cartao.usuarioId, conta.saldo - valor);
        
        return {
            cartaoId,
            valorPago: valor,
            tipoPagamento,
            dataPagamento: new Date(),
            novoSaldoFatura: resultadoPagamento.novoSaldoFatura,
            limiteDisponivel: resultadoPagamento.limiteDisponivel
        };
    } catch (error) {
        throw error;
    }
}

// Funções auxiliares
function gerarNumeroCartao(bandeira) {
    const prefixos = {
        'visa': '4',
        'mastercard': '5',
        'elo': '6'
    };
    
    const prefixo = prefixos[bandeira] || '4';
    let numero = prefixo;
    
    // Gerar 15 dígitos restantes
    for (let i = 0; i < 15; i++) {
        numero += Math.floor(Math.random() * 10);
    }
    
    return numero;
}

function gerarCVV() {
    return Math.floor(Math.random() * 900 + 100).toString();
}

function gerarDataValidade() {
    const hoje = new Date();
    const anoValidade = hoje.getFullYear() + 5; // Válido por 5 anos
    const mesValidade = String(hoje.getMonth() + 1).padStart(2, '0');
    return `${mesValidade}/${anoValidade.toString().slice(-2)}`;
}

// Listar cartões por usuário
async function listarCartoesPorUsuario(usuarioId) {
    try {
        const cartoes = await cartoesModel.getCartoesByUsuario(usuarioId);
        
        // Formatar dados para retorno
        return cartoes.map(cartao => ({
            id: cartao._id,
            tipo: cartao.tipo,
            bandeira: cartao.bandeira,
            numero: `**** **** **** ${cartao.numero.slice(-4)}`, // Mascarar número
            status: cartao.status,
            isVirtual: cartao.isVirtual,
            limite: cartao.limite,
            limiteDisponivel: cartao.limiteDisponivel,
            faturaAtual: cartao.faturaAtual,
            dataVencimentoFatura: cartao.dataVencimentoFatura,
            motivoBloqueio: cartao.motivoBloqueio
        }));
    } catch (error) {
        console.error('Erro ao listar cartões por usuário:', error);
        throw new Error('Erro ao buscar cartões do usuário');
    }
}

module.exports = {
    bloquearCartao,
    desbloquearCartao,
    solicitarNovoCartao,
    consultarFatura,
    pagarFatura,
    listarCartoesPorUsuario
};