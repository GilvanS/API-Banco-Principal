import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { TransacaoService } from "../services/TransacaoService";
import { validateRequest } from "../middleware/validateRequest";
import { LoggerService } from "../services/LoggerService";

const router = Router();

interface TransferenciaRequest {
    agenciaOrigem: string;
    contaOrigem: string;
    agenciaDestino: string;
    contaDestino: string;
    valor: number;
    cartaoId: string;
    pin: string;
}

interface DepositoRequest {
    agencia: string;
    conta: string;
    valor: number;
}

interface CompraCreditoRequest {
    cartaoId: string;
    valor: number;
    estabelecimento: string;
}

interface PagarFaturaRequest {
    usuarioId: string;
    valor: number;
}

// POST /transacoes/transferir - Transferência entre contas por agência/conta
router.post("/transferir",
    [
        body("agenciaOrigem").notEmpty().withMessage("Agência de origem é obrigatória"),
        body("contaOrigem").notEmpty().withMessage("Conta de origem é obrigatória"),
        body("agenciaDestino").notEmpty().withMessage("Agência de destino é obrigatória"),
        body("contaDestino").notEmpty().withMessage("Conta de destino é obrigatória"),
        body("valor").isFloat({ min: 10, max: 5000 }).withMessage("Valor deve ser entre R$ 10,00 e R$ 5.000,00"),
        body("cartaoId").notEmpty().withMessage("ID do cartão é obrigatório"),
        body("pin").isLength({ min: 4, max: 4 }).withMessage("PIN deve ter 4 dígitos"),
        validateRequest
    ],
    async (req: Request<{}, {}, TransferenciaRequest>, res: Response) => {
        try {
            const resultado = await TransacaoService.transferir(req.body);
            return res.json(resultado);
        } catch (error) {
            LoggerService.error("Erro ao realizar transferência", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// POST /transacoes/depositar - Depósito em conta
router.post("/depositar",
    [
        body("agencia").notEmpty().withMessage("Agência é obrigatória"),
        body("conta").notEmpty().withMessage("Conta é obrigatória"),
        body("valor").isFloat({ min: 0.01 }).withMessage("Valor deve ser maior que zero"),
        validateRequest
    ],
    async (req: Request<{}, {}, DepositoRequest>, res: Response) => {
        try {
            const resultado = await TransacaoService.depositar(req.body);
            return res.json(resultado);
        } catch (error) {
            LoggerService.error("Erro ao realizar depósito", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// POST /transacoes/compra-credito - Compra no cartão de crédito
router.post("/compra-credito",
    [
        body("cartaoId").notEmpty().withMessage("ID do cartão é obrigatório"),
        body("valor").isFloat({ min: 0.01 }).withMessage("Valor deve ser maior que zero"),
        body("estabelecimento").notEmpty().withMessage("Estabelecimento é obrigatório"),
        validateRequest
    ],
    async (req: Request<{}, {}, CompraCreditoRequest>, res: Response) => {
        try {
            const resultado = await TransacaoService.compraCredito(req.body);
            return res.json(resultado);
        } catch (error) {
            LoggerService.error("Erro ao realizar compra no crédito", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// POST /transacoes/pagar-fatura - Pagar fatura do cartão de crédito
router.post("/pagar-fatura",
    [
        body("usuarioId").notEmpty().withMessage("ID do usuário é obrigatório"),
        body("valor").isFloat({ min: 0.01 }).withMessage("Valor deve ser maior que zero"),
        validateRequest
    ],
    async (req: Request<{}, {}, PagarFaturaRequest>, res: Response) => {
        try {
            const resultado = await TransacaoService.pagarFatura(req.body);
            return res.json(resultado);
        } catch (error) {
            LoggerService.error("Erro ao pagar fatura", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// GET /transacoes/extrato/:usuarioId - Consultar extrato
router.get("/extrato/:usuarioId", async (req: Request, res: Response) => {
    try {
        const pagina = parseInt(req.query.pagina as string) || 1;
        const limite = parseInt(req.query.limite as string) || 10;

        const extrato = await TransacaoService.consultarExtrato(
            req.params.usuarioId,
            pagina,
            limite
        );
        return res.json(extrato);
    } catch (error) {
        LoggerService.error("Erro ao consultar extrato", error);
        return res.status(400).json({ erro: (error as Error).message });
    }
});

export default router; 