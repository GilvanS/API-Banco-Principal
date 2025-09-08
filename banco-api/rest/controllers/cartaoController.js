const cartaoService = require('../../src/services/cartaoService');
const createError = require('http-errors');

// Bloquear cartão
async function bloquearCartao(req, res) {
    try {
        const { cartaoId } = req.params;
        const { motivo } = req.body;
        
        if (!cartaoId) {
            return res.status(400).json({ error: 'ID do cartão é obrigatório' });
        }
        
        const resultado = await cartaoService.bloquearCartao(cartaoId, motivo);
        
        res.status(200).json({
            success: true,
            message: 'Cartão bloqueado com sucesso',
            data: {
                cartaoId: resultado.id,
                status: resultado.status,
                motivo: motivo || 'Bloqueio solicitado pelo usuário',
                dataBloqueio: new Date()
            }
        });
    } catch (error) {
        console.error('Erro ao bloquear cartão:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
}

// Desbloquear cartão
async function desbloquearCartao(req, res) {
    try {
        const { cartaoId } = req.params;
        
        if (!cartaoId) {
            return res.status(400).json({ error: 'ID do cartão é obrigatório' });
        }
        
        const resultado = await cartaoService.desbloquearCartao(cartaoId);
        
        res.status(200).json({
            success: true,
            message: 'Cartão desbloqueado com sucesso',
            data: {
                cartaoId: resultado.id,
                status: resultado.status,
                dataDesbloqueio: new Date()
            }
        });
    } catch (error) {
        console.error('Erro ao desbloquear cartão:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
}

// Solicitar novo cartão
async function solicitarCartao(req, res) {
    try {
        const { tipo, bandeira, isVirtual } = req.body;
        const userId = req.user?.id; // Assumindo que o middleware de autenticação adiciona o user
        
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        
        if (!tipo || !bandeira) {
            return res.status(400).json({ error: 'Tipo e bandeira do cartão são obrigatórios' });
        }
        
        if (!['debito', 'credito'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo deve ser "debito" ou "credito"' });
        }
        
        if (!['visa', 'mastercard', 'elo'].includes(bandeira)) {
            return res.status(400).json({ error: 'Bandeira deve ser "visa", "mastercard" ou "elo"' });
        }
        
        const resultado = await cartaoService.solicitarNovoCartao({
            usuarioId: userId,
            tipo,
            bandeira,
            isVirtual: isVirtual || false
        });
        
        res.status(201).json({
            success: true,
            message: 'Cartão solicitado com sucesso',
            data: {
                cartaoId: resultado.id,
                tipo: resultado.tipo,
                bandeira: resultado.bandeira,
                isVirtual: resultado.isVirtual,
                status: 'SOLICITADO',
                previsaoEntrega: isVirtual ? 'Imediato' : '7-10 dias úteis',
                dataSolicitacao: resultado.dataCriacao
            }
        });
    } catch (error) {
        console.error('Erro ao solicitar cartão:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
}

// Consultar fatura do cartão de crédito
async function consultarFatura(req, res) {
    try {
        const { cartaoId } = req.params;
        const { mes, ano } = req.query;
        
        if (!cartaoId) {
            return res.status(400).json({ error: 'ID do cartão é obrigatório' });
        }
        
        const resultado = await cartaoService.consultarFatura(cartaoId, mes, ano);
        
        res.status(200).json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Erro ao consultar fatura:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
}

// Pagar fatura do cartão de crédito
async function pagarFatura(req, res) {
    try {
        const { cartaoId } = req.params;
        const { valor, tipoPagamento } = req.body;
        
        if (!cartaoId) {
            return res.status(400).json({ error: 'ID do cartão é obrigatório' });
        }
        
        if (!valor || valor <= 0) {
            return res.status(400).json({ error: 'Valor deve ser maior que zero' });
        }
        
        if (!tipoPagamento || !['total', 'minimo', 'parcial'].includes(tipoPagamento)) {
            return res.status(400).json({ error: 'Tipo de pagamento deve ser "total", "minimo" ou "parcial"' });
        }
        
        const resultado = await cartaoService.pagarFatura(cartaoId, valor, tipoPagamento);
        
        res.status(200).json({
            success: true,
            message: 'Fatura paga com sucesso',
            data: resultado
        });
    } catch (error) {
        console.error('Erro ao pagar fatura:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
}

// Listar cartões do usuário
async function listarMeusCartoes(req, res) {
    try {
        const usuarioId = req.usuario.id;
        
        const cartoes = await cartaoService.listarCartoesPorUsuario(usuarioId);
        
        res.status(200).json({
            success: true,
            message: 'Cartões listados com sucesso',
            data: cartoes
        });
    } catch (error) {
        console.error('Erro ao listar cartões:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
}

module.exports = {
    bloquearCartao,
    desbloquearCartao,
    solicitarCartao,
    consultarFatura,
    pagarFatura,
    listarMeusCartoes
};