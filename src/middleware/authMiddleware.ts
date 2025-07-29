// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../entities/UsuarioConta";

const JWT_SECRET = process.env.JWT_SECRET || "desenvolvimento_chave_secreta_padrao";

/**
 * Estende a interface Request do Express para adicionar as propriedades `userId` e `userRole`.
 * Isso garante type-safety ao acessar os dados do usuário autenticado nos controllers.
 */
export interface AuthRequest extends Request {
    userId?: string;
    userRole?: UserRole;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ erro: "Token de autenticação não fornecido." });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2) {
        return res.status(401).json({ erro: "Token mal formatado." });
    }

    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ erro: "Token com formato inválido (esperado: Bearer)." });
    }

    try {
        // ATUALIZADO: O payload do token agora contém id e role
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: UserRole };

        // Adiciona o ID e o papel do usuário na requisição para uso posterior
        req.userId = decoded.id;
        req.userRole = decoded.role;

        return next();
    } catch (error) {
        return res.status(401).json({ erro: "Token inválido ou expirado." });
    }
};