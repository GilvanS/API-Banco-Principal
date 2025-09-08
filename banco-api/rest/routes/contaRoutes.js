const express = require('express');
const contaController = require('../controllers/contaController');
const autenticarToken = require('../middleware/autenticarToken');

const router = express.Router();

router.get('/', autenticarToken, contaController.getContas);
router.get('/:id', autenticarToken, contaController.getConta);
router.post('/deposito', autenticarToken, contaController.depositar);
router.post('/saque', autenticarToken, contaController.sacar);
router.all('/', (req, res) => {
    res.status(405).json({ error: 'Método não permitido.' });
});

module.exports = router;