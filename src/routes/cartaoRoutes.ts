import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { CartaoService } from "../services/CartaoService";
import { BandeiraCartao, Cartao } from "../entities/Cartao";
import { validateRequest } from "../middleware/validateRequest";
import { LoggerService } from "../services/LoggerService";
import { idempotencyMiddleware, IdempotentRequest } from "../middleware/idempotencyMiddleware";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import { AppDataSource } from "../database/data-source";

const router = Router();

interface SolicitarSegundaViaRequest {
    usuarioId: string;
    motivo: 'perda' | 'roubo' | 'danificacao';
    bandeira?: BandeiraCartao;
}

interface DefinirPINRequest {
    pinAtual: string;
    novoPIN: string;
}

// POST /cartoes/segunda-via - Solicitar segunda via de cartão
router.post("/segunda-via",
    authMiddleware,
    idempotencyMiddleware,
    [
        body("motivo").isIn(["perda", "roubo", "danificacao"]).withMessage("Motivo deve ser: perda, roubo ou danificacao"),
        body("bandeira").optional().isIn(["master", "visa", "elo", "amex"]).withMessage("Bandeira inválida"),
        validateRequest
    ],
    async (req: IdempotentRequest & AuthRequest & Request<{}, {}, Omit<SolicitarSegundaViaRequest, 'usuarioId'>>, res: Response) => {
        try {
            const usuarioId = req.usuario?.id;
            if (!usuarioId) {
                return res.status(401).json({ erro: "Usuário não autenticado" });
            }
            
            const dados = {
                usuarioId,
                motivo: req.body.motivo,
                bandeira: req.body.bandeira
            };
            
            const cartao = await CartaoService.solicitarSegundaVia(dados);
            return res.status(201).json(cartao);
        } catch (error) {
            LoggerService.error("Erro ao solicitar segunda via de cartão", error);
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

// GET /cartoes/debito/:id - Detalhes do cartão de débito (compatibilidade com testes)
router.get("/debito/:id", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Cartao);
        const cartao = await repo.findOne({ where: { id: req.params.id } as any });
        if (!cartao) {
            return res.status(404).json({ erro: "Cartão não encontrado" });
        }
        return res.json(cartao);
    } catch (error) {
        LoggerService.error("Erro ao obter cartão de débito", error);
        return res.status(400).json({ erro: (error as Error).message });
    }
});

// GET /cartoes/credito/:id - Detalhes do cartão de crédito (compatibilidade com testes)
router.get("/credito/:id", authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Cartao);
        const cartao = await repo.findOne({ where: { id: req.params.id } as any });
        if (!cartao) {
            return res.status(404).json({ erro: "Cartão não encontrado" });
        }
        return res.json(cartao);
    } catch (error) {
        LoggerService.error("Erro ao obter cartão de crédito", error);
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