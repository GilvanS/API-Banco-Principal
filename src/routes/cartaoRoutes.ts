// src/routes/cartaoRoutes.ts
import { Router } from "express";
import { body, param } from "express-validator";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import { CartaoController } from "../controllers/CartaoController";
import { BandeiraCartao, StatusCartao, TitularidadeCartao } from "../entities/Cartao";

const router = Router();
const cartaoController = new CartaoController();

// Rota para criar um novo cartão de CRÉDITO
router.post(
    "/credito", // Rota mais específica para a criação de cartões de crédito
    authMiddleware,
    [
        body("cpf").notEmpty().withMessage("O CPF do titular da conta é obrigatório."),
        body("titularidade").isIn(Object.values(TitularidadeCartao)).withMessage("A titularidade é inválida (titular ou adicional)."),
        body("bandeira").isIn(Object.values(BandeiraCartao)).withMessage("A bandeira do cartão é inválida."),
        // O limite agora é obrigatório para esta rota
        body("limite").isFloat({ gt: 0 }).withMessage("O limite para cartão de crédito é obrigatório e deve ser maior que zero."),
        validateRequest
    ],
    cartaoController.criarCredito // Chama o novo método do controller
);

// Rota para atualizar um cartão (limite, status)
router.patch(
    "/:id",
    authMiddleware,
    [
        param("id").isUUID().withMessage("ID do cartão inválido."),
        body("limite").optional().isFloat({ gt: 0 }).withMessage("O limite deve ser um número maior que zero."),
        body("status").optional().isIn(Object.values(StatusCartao)).withMessage("O status do cartão é inválido (ativo ou bloqueado)."),
        validateRequest
    ],
    cartaoController.atualizar
);

// Rota para excluir um cartão
router.delete(
    "/:id",
    authMiddleware,
    [
        param("id").isUUID().withMessage("ID do cartão inválido."),
        validateRequest
    ],
    cartaoController.excluir
);

export default router;