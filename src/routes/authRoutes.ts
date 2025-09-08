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

interface ForgotPasswordRequest {
    email: string;
}

interface ResetPasswordRequest {
    token: string;
    novaSenha: string;
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

            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "10m" });

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

// Endpoint para solicitar recuperação de senha por email
router.post("/forgot-password",
    [
        body("email").isEmail().withMessage("Email válido é obrigatório"),
        validateRequest
    ],
    async (req: Request<{}, {}, ForgotPasswordRequest>, res: Response) => {
        try {
            const { email } = req.body;

            // Buscar usuário pelo email
            const usuario = await usuarioRepository.findOne({
                where: { email },
                select: ["id", "nomeCompleto", "email", "cpf"]
            });

            if (!usuario) {
                // Por segurança, sempre retornar sucesso mesmo se email não existir
                LoggerService.warn("Tentativa de recuperação com email inexistente", { email });
                return res.json({ 
                    mensagem: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha" 
                });
            }

            // Gerar token de recuperação (válido por 15 minutos)
            const resetToken = jwt.sign(
                { 
                    id: usuario.id, 
                    email: usuario.email,
                    type: "password_reset" 
                }, 
                JWT_SECRET, 
                { expiresIn: "15m" }
            );

            LoggerService.info("Token de recuperação gerado", { 
                email: usuario.email,
                userId: usuario.id 
            });

            // Em um ambiente real, aqui você enviaria o email com o token
            // Por enquanto, vamos apenas logar o token para testes
            console.log(`\n=== TOKEN DE RECUPERAÇÃO PARA TESTES ===`);
            console.log(`Email: ${email}`);
            console.log(`Token: ${resetToken}`);
            console.log(`Válido por: 15 minutos`);
            console.log(`=========================================\n`);

            return res.json({ 
                mensagem: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha",
                // Em produção, remover esta linha:
                tokenParaTeste: resetToken
            });
        } catch (error) {
            LoggerService.error("Erro na recuperação de senha", error);
            return res.status(500).json({ erro: "Erro interno do servidor" });
        }
    }
);

// Endpoint para redefinir senha com token
router.post("/reset-password",
    [
        body("token").notEmpty().withMessage("Token é obrigatório"),
        body("novaSenha")
            .isLength({ min: 8 })
            .withMessage("Nova senha deve ter pelo menos 8 caracteres")
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage("Nova senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial"),
        validateRequest
    ],
    async (req: Request<{}, {}, ResetPasswordRequest>, res: Response) => {
        try {
            const { token, novaSenha } = req.body;

            // Verificar e decodificar o token
            let decoded: any;
            try {
                decoded = jwt.verify(token, JWT_SECRET);
            } catch (error) {
                LoggerService.warn("Token de recuperação inválido ou expirado");
                return res.status(400).json({ erro: "Token inválido ou expirado" });
            }

            // Verificar se é um token de recuperação de senha
            if (decoded.type !== "password_reset") {
                LoggerService.warn("Tentativa de uso de token inválido para recuperação");
                return res.status(400).json({ erro: "Token inválido" });
            }

            // Buscar usuário
            const usuario = await usuarioRepository.findOne({
                where: { id: decoded.id, email: decoded.email }
            });

            if (!usuario) {
                LoggerService.warn("Usuário não encontrado para recuperação de senha", { 
                    userId: decoded.id, 
                    email: decoded.email 
                });
                return res.status(404).json({ erro: "Usuário não encontrado" });
            }

            // Criptografar nova senha
            const novaSenhaCriptografada = await bcrypt.hash(novaSenha, 10);

            // Atualizar senha no banco
            usuario.senha = novaSenhaCriptografada;
            await usuarioRepository.save(usuario);

            LoggerService.info("Senha redefinida com sucesso", { 
                userId: usuario.id,
                email: usuario.email 
            });

            return res.json({ 
                mensagem: "Senha redefinida com sucesso. Você já pode fazer login com a nova senha" 
            });
        } catch (error) {
            LoggerService.error("Erro ao redefinir senha", error);
            return res.status(500).json({ erro: "Erro interno do servidor" });
        }
    }
);

export default router;