import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { TransacaoService } from "../services/TransacaoService";
import { validateRequest } from "../middleware/validateRequest";
import { LoggerService } from "../services/LoggerService";

const router = Router();

interface TransferenciaRequest {
    agenciaOrigem: string;
    contaOrigem: string;
    nomeOrigem: string;
    cpfOrigem: string;
    agenciaDestino: string;
    contaDestino: string;
    nomeDestino: string;
    cpfDestino: string;
    valor: number;
}

interface TransferenciaPIXRequest {
    cpfOrigem: string;
    pixDestino: string;
    tipoPix: "cpf" | "email";
    valor: number;
}

interface DepositoRequest {
    agencia: string;
    conta: string;
    valor: number;
}

interface PagamentoDebitoRequest {
    numeroCartao: string;
    pin: string;
    valor: number;
    estabelecimento: string;
}

interface CompraCreditoRequest {
    numeroCartao: string;
    valor: number;
    estabelecimento: string;
}

interface PagarFaturaRequest {
    usuarioId: string;
    valor: number;
}

// POST /transacoes/transferir - Transferência entre contas por agência/conta/nome/CPF
router.post("/transferir",
    [
        body("agenciaOrigem").notEmpty().withMessage("Agência de origem é obrigatória"),
        body("contaOrigem").notEmpty().withMessage("Conta de origem é obrigatória"),
        body("nomeOrigem").notEmpty().withMessage("Nome de origem é obrigatório"),
        body("cpfOrigem").notEmpty().withMessage("CPF de origem é obrigatório"),
        body("agenciaDestino").notEmpty().withMessage("Agência de destino é obrigatória"),
        body("contaDestino").notEmpty().withMessage("Conta de destino é obrigatória"),
        body("nomeDestino").notEmpty().withMessage("Nome de destino é obrigatório"),
        body("cpfDestino").notEmpty().withMessage("CPF de destino é obrigatório"),
        body("valor").isFloat({ min: 10 }).withMessage("Valor deve ser maior ou igual a R$ 10,00"),
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

// POST /transacoes/pix - Transferência PIX por CPF ou email
router.post("/pix",
    [
        body("cpfOrigem").notEmpty().withMessage("CPF de origem é obrigatório"),
        body("pixDestino").notEmpty().withMessage("PIX de destino é obrigatório"),
        body("tipoPix").isIn(["cpf", "email"]).withMessage("Tipo PIX deve ser 'cpf' ou 'email'"),
        body("valor").isFloat({ min: 10 }).withMessage("Valor deve ser maior ou igual a R$ 10,00"),
        validateRequest
    ],
    async (req: Request<{}, {}, TransferenciaPIXRequest>, res: Response) => {
        try {
            const resultado = await TransacaoService.transferirPIX(req.body);
            return res.json(resultado);
        } catch (error) {
            LoggerService.error("Erro ao realizar transferência PIX", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// POST /transacoes/pagamento-debito - Pagamento com cartão de débito
router.post("/pagamento-debito",
    [
        body("numeroCartao").notEmpty().withMessage("Número do cartão é obrigatório"),
        body("pin").isLength({ min: 4, max: 4 }).withMessage("PIN deve ter 4 dígitos"),
        body("valor").isFloat({ min: 0.01 }).withMessage("Valor deve ser maior que zero"),
        body("estabelecimento").notEmpty().withMessage("Estabelecimento é obrigatório"),
        validateRequest
    ],
    async (req: Request<{}, {}, PagamentoDebitoRequest>, res: Response) => {
        try {
            const resultado = await TransacaoService.pagamentoDebito(req.body);
            return res.json(resultado);
        } catch (error) {
            LoggerService.error("Erro ao realizar pagamento com débito", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// POST /transacoes/compra-credito - Compra com cartão de crédito
router.post("/compra-credito",
    [
        body("numeroCartao").notEmpty().withMessage("Número do cartão é obrigatório"),
        body("valor").isFloat({ min: 0.01 }).withMessage("Valor deve ser maior que zero"),
        body("estabelecimento").notEmpty().withMessage("Estabelecimento é obrigatório"),
        validateRequest
    ],
    async (req: Request<{}, {}, CompraCreditoRequest>, res: Response) => {
        try {
            const resultado = await TransacaoService.compraCredito(req.body);
            return res.json(resultado);
        } catch (error) {
            LoggerService.error("Erro ao realizar compra com crédito", error);
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
        const { usuarioId } = req.params;
        const { pagina = 1, limite = 10 } = req.query;
        
        const extrato = await TransacaoService.consultarExtrato(
            usuarioId, 
            parseInt(pagina as string), 
            parseInt(limite as string)
        );
        
        return res.json(extrato);
    } catch (error) {
        LoggerService.error("Erro ao consultar extrato", error);
        return res.status(400).json({ erro: (error as Error).message });
    }
});

export default router; 