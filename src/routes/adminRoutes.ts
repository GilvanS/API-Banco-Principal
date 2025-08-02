import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { UsuarioContaService } from "../services/UsuarioContaService";
import { CartaoService } from "../services/CartaoService";
import { validateRequest } from "../middleware/validateRequest";
import { requireAdmin } from "../middleware/adminMiddleware";
import { authMiddleware } from "../middleware/authMiddleware";
import { LoggerService } from "../services/LoggerService";

const router = Router();

interface AtualizarLimiteRequest {
    limiteCredito: number;
    limiteDebitoDiario?: number;
}

interface BloquearContaRequest {
    contaBloqueada: boolean;
}

interface AtualizarLimiteCartaoRequest {
    limite: number;
}

// PATCH /admin/clientes/:id/limite - Atualizar limites de crédito (Admin only)
router.patch("/clientes/:id/limite",
    authMiddleware,
    requireAdmin,
    [
        body("limiteCredito").isFloat({ min: 0 }).withMessage("Limite de crédito deve ser maior que zero"),
        body("limiteDebitoDiario").optional().isFloat({ min: 0 }).withMessage("Limite de débito diário deve ser maior que zero"),
        validateRequest
    ],
    async (req: Request<{ id: string }, {}, AtualizarLimiteRequest>, res: Response) => {
        try {
            const { limiteCredito, limiteDebitoDiario } = req.body;
            const cliente = await UsuarioContaService.atualizarLimites(req.params.id, {
                limiteCredito,
                limiteDebitoDiario
            });

            LoggerService.info("Limites atualizados por admin", {
                clienteId: req.params.id,
                limiteCredito,
                limiteDebitoDiario
            });

            return res.json(cliente);
        } catch (error) {
            LoggerService.error("Erro ao atualizar limites", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// PATCH /admin/clientes/:id/bloquear - Bloquear/desbloquear conta (Admin only)
router.patch("/clientes/:id/bloquear",
    authMiddleware,
    requireAdmin,
    [
        body("contaBloqueada").isBoolean().withMessage("Status de bloqueio deve ser true ou false"),
        validateRequest
    ],
    async (req: Request<{ id: string }, {}, BloquearContaRequest>, res: Response) => {
        try {
            const { contaBloqueada } = req.body;
            const cliente = await UsuarioContaService.bloquearConta(req.params.id, contaBloqueada);

            LoggerService.info("Status de conta alterado por admin", {
                clienteId: req.params.id,
                contaBloqueada
            });

            return res.json(cliente);
        } catch (error) {
            LoggerService.error("Erro ao alterar status da conta", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// PATCH /admin/cartoes/:id/limite - Atualizar limite do cartão (Admin only)
router.patch("/cartoes/:id/limite",
    authMiddleware,
    requireAdmin,
    [
        body("limite").isFloat({ min: 100 }).withMessage("Limite deve ser maior que R$ 100"),
        validateRequest
    ],
    async (req: Request<{ id: string }, {}, AtualizarLimiteCartaoRequest>, res: Response) => {
        try {
            const { limite } = req.body;
            const cartao = await CartaoService.atualizarLimite(req.params.id, limite);

            LoggerService.info("Limite do cartão atualizado por admin", {
                cartaoId: req.params.id,
                limite
            });

            return res.json(cartao);
        } catch (error) {
            LoggerService.error("Erro ao atualizar limite do cartão", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// DELETE /admin/clientes/:id - Desativar conta (Admin only)
router.delete("/clientes/:id",
    authMiddleware,
    requireAdmin,
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            await UsuarioContaService.desativarConta(req.params.id);

            LoggerService.info("Conta desativada por admin", {
                clienteId: req.params.id
            });

            return res.status(204).send();
        } catch (error) {
            LoggerService.error("Erro ao desativar conta", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// GET /admin/relatorio - Relatório geral (Admin only)
router.get("/relatorio",
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response) => {
        try {
            const relatorio = await UsuarioContaService.gerarRelatorio();

            LoggerService.info("Relatório gerado por admin");

            return res.json(relatorio);
        } catch (error) {
            LoggerService.error("Erro ao gerar relatório", error);
            return res.status(500).json({ erro: "Erro interno do servidor" });
        }
    }
);

export default router; 