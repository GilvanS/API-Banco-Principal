// src/middleware/roleMiddleware.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import { UserRole } from "../entities/UsuarioConta";

/**
 * Middleware para permitir acesso apenas a usuários com o papel de ADMIN.
 */
export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    // O authMiddleware já deve ter sido executado e populado req.userRole
    if (req.userRole !== UserRole.ADMIN) {
        return res.status(403).json({ erro: "Acesso negado. Rota exclusiva para administradores." });
    }
    next();
};