import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import { LoggerService } from "../services/LoggerService";

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.usuario) {
            LoggerService.warn("Tentativa de acesso sem autenticação");
            return res.status(401).json({ erro: "Token de autenticação necessário" });
        }

        if (req.usuario.role !== "admin") {
            LoggerService.warn("Tentativa de acesso admin por usuário não autorizado", {
                cpf: req.usuario.cpf,
                role: req.usuario.role
            });
            return res.status(403).json({ erro: "Acesso negado. Apenas administradores podem realizar esta operação." });
        }

        LoggerService.info("Acesso admin autorizado", {
            cpf: req.usuario.cpf,
            role: req.usuario.role
        });

        next();
    } catch (error) {
        LoggerService.error("Erro no middleware de admin", error);
        return res.status(500).json({ erro: "Erro interno do servidor" });
    }
}; 