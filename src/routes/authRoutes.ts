import { Router, Request, Response } from "express";
import { body } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../database/data-source";
import { UsuarioConta } from "../entities/UsuarioConta";
import { validateRequest } from "../middleware/validateRequest";
import { LoggerService } from "../services/LoggerService";

const router = Router();
const usuarioRepository = AppDataSource.getRepository(UsuarioConta);

const JWT_SECRET = process.env.JWT_SECRET || "sua_chave_secreta_aqui";

interface LoginRequest {
    cpf: string;
    senha: string;
}

router.post("/login",
    [
        body("cpf").notEmpty().withMessage("CPF é obrigatório"),
        body("senha").notEmpty().withMessage("Senha é obrigatória"),
        validateRequest
    ],
    async (req: Request<{}, {}, LoginRequest>, res: Response) => {
        try {
            const { cpf, senha } = req.body;

            // Buscar usuário com senha
            const usuario = await usuarioRepository.findOne({
                where: { cpf },
                select: ["id", "nomeCompleto", "cpf", "senha", "role", "ativo"]
            });

            if (!usuario) {
                LoggerService.warn("Tentativa de login com CPF inexistente", { cpf });
                return res.status(401).json({ erro: "CPF ou senha inválidos" });
            }

            if (!usuario.ativo) {
                LoggerService.warn("Tentativa de login com conta inativa", { cpf });
                return res.status(401).json({ erro: "Conta inativa" });
            }

            // Verificar senha
            const senhaValida = await bcrypt.compare(senha, usuario.senha);
            if (!senhaValida) {
                LoggerService.warn("Tentativa de login com senha incorreta", { cpf });
                return res.status(401).json({ erro: "CPF ou senha inválidos" });
            }

            // Gerar token JWT
            const payload = {
                id: usuario.id,
                cpf: usuario.cpf,
                role: usuario.role
            };

            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

            LoggerService.info("Login realizado com sucesso", { 
                cpf: usuario.cpf, 
                role: usuario.role 
            });

            return res.json({
                token,
                usuario: {
                    id: usuario.id,
                    nomeCompleto: usuario.nomeCompleto,
                    cpf: usuario.cpf,
                    role: usuario.role
                }
            });
        } catch (error) {
            LoggerService.error("Erro no login", error);
            return res.status(500).json({ erro: "Erro interno do servidor" });
        }
    }
);

export default router; 