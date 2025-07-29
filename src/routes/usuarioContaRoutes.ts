// src/routes/usuarioContaRoutes.ts
import { Router } from "express";
import { body } from "express-validator";
import { UsuarioContaController } from "../controllers/UsuarioContaController";
import { validateRequest } from "../middleware/validateRequest";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminOnly } from "../middleware/roleMiddleware";
import { UserRole } from "../entities/UsuarioConta";

const router = Router();
const usuarioContaController = new UsuarioContaController();

// Rota pública para login
router.post(
    "/login",
    [
        body("cpf").notEmpty().withMessage("O CPF é obrigatório."),
        body("senha").notEmpty().withMessage("A senha é obrigatória."),
        validateRequest,
    ],
    usuarioContaController.login
);

// Rota para criar usuário (protegida, acessível por ADMIN e OPERADOR)
router.post(
    "/",
    authMiddleware, // Requer autenticação
    [
        body("nomeCompleto").notEmpty().withMessage("O nome completo é obrigatório."),
        body("cpf")
            .notEmpty().withMessage("O CPF é obrigatório.")
            .customSanitizer((value: string) => value.replace(/\D/g, '')),
        body("senha")
            .isLength({ min: 8 }).withMessage("A senha deve ter no mínimo 8 caracteres.")
            .matches(/\d/).withMessage("A senha deve conter pelo menos um número.")
            .matches(/[A-Z]/).withMessage("A senha deve conter pelo menos uma letra maiúscula."),
        // Validações opcionais para ADMIN
        body("role").optional().isIn(Object.values(UserRole)).withMessage("Papel (role) inválido."),
        body("limiteCredito").optional().isFloat({ gt: 0 }).withMessage("O limite de crédito deve ser um número positivo."),
        body("contaBloqueada").optional().isBoolean().withMessage("O campo contaBloqueada deve ser um booleano."),
        validateRequest,
    ],
    usuarioContaController.criar
);

// Rota para listar todas as contas (protegida, apenas ADMIN)
router.get(
    "/",
    authMiddleware,
    adminOnly, // Apenas ADMIN pode acessar
    usuarioContaController.buscarTodos
);

// Rota para manutenção de conta (protegida, apenas ADMIN)
router.patch(
    "/:id",
    authMiddleware,
    adminOnly, // Apenas ADMIN pode acessar
    [
        body("limiteCredito").optional().isFloat({ min: 0 }).withMessage("O limite de crédito deve ser um número não negativo."),
        body("contaBloqueada").optional().isBoolean().withMessage("O campo contaBloqueada deve ser um booleano."),
        validateRequest,
    ],
    usuarioContaController.atualizarConta
);

export default router;