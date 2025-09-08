const contaService = require('../../src/services/contaService');

async function getContas(req, res, next) {
    try {
        const result = await contaService.getContas();
        res.json(result);
    } catch (error) {
        next(error);
    }
}

async function getConta(req, res, next) {
    const { id } = req.params;
    try {
        const result = await contaService.getContaById(id);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

async function depositar(req, res, next) {
    const { contaId, valor } = req.body;
    try {
        const result = await contaService.depositar(contaId, valor);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

async function sacar(req, res, next) {
    const { contaId, valor } = req.body;
    try {
        const result = await contaService.sacar(contaId, valor);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getContas,
    getConta,
    depositar,
    sacar
};
