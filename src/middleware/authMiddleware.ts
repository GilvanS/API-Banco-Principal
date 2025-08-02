// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { LoggerService } from "../services/LoggerService";

const JWT_SECRET = process.env.JWT_SECRET || "sua_chave_secreta_aqui";

export interface AuthRequest extends Request {
    usuario?: {
        id: string;
        cpf: string;
        role: string;
    };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            LoggerService.warn("Tentativa de acesso sem token");
            return res.status(401).json({ erro: "Token de autenticação necessário" });
        }

        jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
            if (err) {
                if (err.name === 'JsonWebTokenError') {
                    LoggerService.warn("Token inválido");
                    return res.status(401).json({ erro: "Token inválido" });
                }

                if (err.name === 'TokenExpiredError') {
                    LoggerService.warn("Token expirado");
                    return res.status(401).json({ erro: "Token expirado" });
                }

                LoggerService.error("Erro ao verificar token", err);
                return res.status(500).json({ erro: "Erro ao autenticar token" });
            }

            req.usuario = decoded;
            LoggerService.info("Token validado com sucesso", { 
                cpf: decoded.cpf, 
                role: decoded.role 
            });
            next();
        });
    } catch (error) {
        LoggerService.error("Erro no middleware de autenticação", error);
        return res.status(500).json({ erro: "Erro interno do servidor" });
    }
};