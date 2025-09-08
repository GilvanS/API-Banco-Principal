const mongoose = require('mongoose');

// Schema do Cartão
const CartaoSchema = new mongoose.Schema({
    usuarioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conta',
        required: true
    },
    tipo: {
        type: String,
        enum: ['debito', 'credito'],
        required: true
    },
    bandeira: {
        type: String,
        enum: ['visa', 'mastercard', 'elo'],
        required: true
    },
    numero: {
        type: String,
        required: true,
        unique: true
    },
    cvv: {
        type: String,
        required: true
    },
    dataValidade: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['ativo', 'bloqueado', 'cancelado'],
        default: 'ativo'
    },
    isVirtual: {
        type: Boolean,
        default: false
    },
    limite: {
        type: Number,
        default: null // Apenas para cartões de crédito
    },
    limiteDisponivel: {
        type: Number,
        default: null
    },
    faturaAtual: {
        type: Number,
        default: 0
    },
    dataVencimentoFatura: {
        type: Date,
        default: null
    },
    dataFechamentoFatura: {
        type: Date,
        default: null
    },
    motivoBloqueio: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const Cartao = mongoose.model('Cartao', CartaoSchema);

// Schema da Fatura
const FaturaSchema = new mongoose.Schema({
    cartaoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cartao',
        required: true
    },
    mes: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    ano: {
        type: Number,
        required: true
    },
    valorTotal: {
        type: Number,
        default: 0
    },
    valorMinimo: {
        type: Number,
        default: 0
    },
    valorPago: {
        type: Number,
        default: 0
    },
    dataVencimento: {
        type: Date,
        required: true
    },
    dataFechamento: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['em_aberto', 'paga', 'vencida'],
        default: 'em_aberto'
    },
    transacoes: [{
        descricao: String,
        valor: Number,
        data: Date,
        estabelecimento: String
    }]
}, {
    timestamps: true
});

const Fatura = mongoose.model('Fatura', FaturaSchema);

// Funções do Model

// Buscar cartão por ID
async function getCartaoById(cartaoId) {
    return await Cartao.findById(cartaoId).populate('usuarioId', 'titular saldo');
}

// Buscar cartões por usuário
async function getCartoesByUsuario(usuarioId) {
    return await Cartao.find({ usuarioId }).populate('usuarioId', 'titular saldo');
}

// Criar novo cartão
async function criarCartao(dadosCartao) {
    const cartao = new Cartao(dadosCartao);
    
    // Se for cartão de crédito, definir limite disponível
    if (dadosCartao.tipo === 'credito' && dadosCartao.limite) {
        cartao.limiteDisponivel = dadosCartao.limite;
        
        // Definir datas de vencimento e fechamento da fatura
        const hoje = new Date();
        const dataFechamento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 5); // Dia 5 do próximo mês
        const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 15); // Dia 15 do próximo mês
        
        cartao.dataFechamentoFatura = dataFechamento;
        cartao.dataVencimentoFatura = dataVencimento;
    }
    
    return await cartao.save();
}

// Atualizar status do cartão
async function atualizarStatusCartao(cartaoId, novoStatus, motivo = null) {
    const updateData = { status: novoStatus };
    
    if (novoStatus === 'bloqueado' && motivo) {
        updateData.motivoBloqueio = motivo;
    } else if (novoStatus === 'ativo') {
        updateData.motivoBloqueio = null;
    }
    
    return await Cartao.findByIdAndUpdate(cartaoId, updateData, { new: true });
}

// Buscar fatura do cartão
async function getFaturaCartao(cartaoId, mes, ano) {
    let fatura = await Fatura.findOne({ cartaoId, mes, ano });
    
    if (!fatura) {
        // Criar fatura se não existir
        const cartao = await getCartaoById(cartaoId);
        if (!cartao || cartao.tipo !== 'credito') {
            throw new Error('Cartão não encontrado ou não é de crédito');
        }
        
        const dataFechamento = new Date(ano, mes - 1, 5); // Dia 5 do mês
        const dataVencimento = new Date(ano, mes - 1, 15); // Dia 15 do mês
        
        fatura = new Fatura({
            cartaoId,
            mes,
            ano,
            valorTotal: cartao.faturaAtual || 0,
            valorMinimo: (cartao.faturaAtual || 0) * 0.15, // 15% do total
            dataFechamento,
            dataVencimento,
            transacoes: []
        });
        
        await fatura.save();
    }
    
    return fatura;
}

// Processar pagamento da fatura
async function processarPagamentoFatura(cartaoId, valorPago, tipoPagamento) {
    const cartao = await getCartaoById(cartaoId);
    if (!cartao) {
        throw new Error('Cartão não encontrado');
    }
    
    const hoje = new Date();
    const fatura = await getFaturaCartao(cartaoId, hoje.getMonth() + 1, hoje.getFullYear());
    
    let valorAPagar = valorPago;
    
    // Validar tipo de pagamento
    if (tipoPagamento === 'total') {
        valorAPagar = fatura.valorTotal;
    } else if (tipoPagamento === 'minimo') {
        valorAPagar = fatura.valorMinimo;
    }
    
    // Atualizar fatura
    fatura.valorPago += valorAPagar;
    if (fatura.valorPago >= fatura.valorTotal) {
        fatura.status = 'paga';
    }
    await fatura.save();
    
    // Atualizar cartão
    cartao.faturaAtual = Math.max(0, cartao.faturaAtual - valorAPagar);
    cartao.limiteDisponivel = cartao.limite - cartao.faturaAtual;
    await cartao.save();
    
    return {
        novoSaldoFatura: cartao.faturaAtual,
        limiteDisponivel: cartao.limiteDisponivel,
        valorPago: valorAPagar
    };
}

// Adicionar transação à fatura
async function adicionarTransacaoFatura(cartaoId, transacao) {
    const hoje = new Date();
    const fatura = await getFaturaCartao(cartaoId, hoje.getMonth() + 1, hoje.getFullYear());
    
    fatura.transacoes.push(transacao);
    fatura.valorTotal += transacao.valor;
    fatura.valorMinimo = fatura.valorTotal * 0.15;
    
    await fatura.save();
    
    // Atualizar cartão
    const cartao = await getCartaoById(cartaoId);
    cartao.faturaAtual += transacao.valor;
    cartao.limiteDisponivel = cartao.limite - cartao.faturaAtual;
    await cartao.save();
    
    return fatura;
}

module.exports = {
    Cartao,
    Fatura,
    getCartaoById,
    getCartoesByUsuario,
    criarCartao,
    atualizarStatusCartao,
    getFaturaCartao,
    processarPagamentoFatura,
    adicionarTransacaoFatura
};