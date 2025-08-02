import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { CartaoService } from "../services/CartaoService";
import { BandeiraCartao, TitularidadeCartao } from "../entities/Cartao";
import { validateRequest } from "../middleware/validateRequest";
import { LoggerService } from "../services/LoggerService";

const router = Router();

interface SolicitarCartaoRequest {
    usuarioId: string;
    bandeira: BandeiraCartao;
    titularidade: TitularidadeCartao;
    limite?: number;
}

interface DefinirPINRequest {
    pinAtual: string;
    novoPIN: string;
}

// POST /cartoes - Solicitar cartão de crédito
router.post("/",
    [
        body("usuarioId").notEmpty().withMessage("ID do usuário é obrigatório"),
        body("bandeira").isIn(["master", "visa", "elo", "amex"]).withMessage("Bandeira inválida"),
        body("titularidade").isIn(["titular", "adicional"]).withMessage("Titularidade inválida"),
        body("limite").optional().isFloat({ min: 100 }).withMessage("Limite deve ser maior que R$ 100"),
        validateRequest
    ],
    async (req: Request<{}, {}, SolicitarCartaoRequest>, res: Response) => {
        try {
            const cartao = await CartaoService.solicitarCartaoCredito(req.body);
            return res.status(201).json(cartao);
        } catch (error) {
            LoggerService.error("Erro ao solicitar cartão", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// GET /cartoes/cliente/:usuarioId - Listar cartões do cliente
router.get("/cliente/:usuarioId", async (req: Request, res: Response) => {
    try {
        const cartoes = await CartaoService.buscarCartoesUsuario(req.params.usuarioId);
        return res.json(cartoes);
    } catch (error) {
        LoggerService.error("Erro ao buscar cartões do usuário", error);
        return res.status(400).json({ erro: (error as Error).message });
    }
});

// PATCH /cartoes/:id/pin - Definir PIN do cartão
router.patch("/:id/pin",
    [
        body("pinAtual").isLength({ min: 4, max: 4 }).withMessage("PIN atual deve ter 4 dígitos"),
        body("novoPIN").isLength({ min: 4, max: 4 }).withMessage("Novo PIN deve ter 4 dígitos"),
        validateRequest
    ],
    async (req: Request<{ id: string }, {}, DefinirPINRequest>, res: Response) => {
        try {
            const resultado = await CartaoService.definirPIN(
                req.params.id,
                req.body.pinAtual,
                req.body.novoPIN
            );
            return res.json(resultado);
        } catch (error) {
            LoggerService.error("Erro ao definir PIN", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// PATCH /cartoes/:id/bloquear - Bloquear cartão
router.patch("/:id/bloquear", async (req: Request<{ id: string }>, res: Response) => {
    try {
        const cartao = await CartaoService.bloquearCartao(req.params.id);
        return res.json(cartao);
    } catch (error) {
        LoggerService.error("Erro ao bloquear cartão", error);
        return res.status(400).json({ erro: (error as Error).message });
    }
});

// PATCH /cartoes/:id/desbloquear - Desbloquear cartão
router.patch("/:id/desbloquear", async (req: Request<{ id: string }>, res: Response) => {
    try {
        const cartao = await CartaoService.desbloquearCartao(req.params.id);
        return res.json(cartao);
    } catch (error) {
        LoggerService.error("Erro ao desbloquear cartão", error);
        return res.status(400).json({ erro: (error as Error).message });
    }
});

export default router; 