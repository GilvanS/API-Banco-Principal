const express = require('express');
const router = express.Router();
const cartaoController = require('../controllers/cartaoController');
const { autenticarToken } = require('../middleware/auth');

// Rota para bloquear cartão
router.patch('/:cartaoId/bloquear', autenticarToken, cartaoController.bloquearCartao);

// Rota para desbloquear cartão
router.patch('/:cartaoId/desbloquear', autenticarToken, cartaoController.desbloquearCartao);

// Rota para solicitar novo cartão
router.post('/solicitar', autenticarToken, cartaoController.solicitarCartao);

// Rota para consultar fatura do cartão
router.get('/:cartaoId/fatura', autenticarToken, cartaoController.consultarFatura);

// Rota para pagar fatura do cartão
router.post('/:cartaoId/fatura/pagar', autenticarToken, cartaoController.pagarFatura);

// Rota para listar cartões do usuário
router.get('/meus-cartoes', autenticarToken, cartaoController.listarMeusCartoes);

module.exports = router;