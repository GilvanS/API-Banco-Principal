import { Router, Request, Response } from "express";
import { body } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../database/data-source";
import { UsuarioConta } from "../entities/UsuarioConta";
import { validateRequest } from "../middleware/validateRequest";
import { LoggerService } from "../services/LoggerService";
import { UsuarioContaService } from "../services/UsuarioContaService";

const router = Router();
const usuarioRepository = AppDataSource.getRepository(UsuarioConta);

const JWT_SECRET = process.env.JWT_SECRET || "sua_chave_secreta_aqui";

interface LoginRequest {
    cpf: string;
    senha: string;
}

interface RegisterRequest {
    nomeCompleto: string;
    cpf: string;
    email: string;
    senha: string;
    telefone: string;
    endereco?: {
        rua?: string;
        cidade?: string;
        estado?: string;
        cep?: string;
    };
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
                select: ["id", "nomeCompleto", "cpf", "senha", "ativo", "agencia", "numeroConta"]
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
            const senhaValida = await bcrypt.compare(senha, (usuario as any).senha);
            if (!senhaValida) {
                LoggerService.warn("Tentativa de login com senha incorreta", { cpf });
                return res.status(401).json({ erro: "CPF ou senha inválidos" });
            }

            // Gerar token JWT
            const payload = {
                id: usuario.id,
                cpf: (usuario as any).cpf
            };

            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30m" });

            LoggerService.info("Login realizado com sucesso", { 
                cpf: (usuario as any).cpf
            });

            return res.json({
                token,
                usuario: {
                    id: usuario.id,
                    nomeCompleto: (usuario as any).nomeCompleto,
                    cpf: (usuario as any).cpf,
                    agencia: (usuario as any).agencia,
                    numeroConta: (usuario as any).numeroConta
                }
            });
        } catch (error) {
            LoggerService.error("Erro no login", error);
            return res.status(500).json({ erro: "Erro interno do servidor" });
        }
    }
);

router.post(
    "/register",
    [
        body("nomeCompleto").notEmpty().withMessage("Nome completo é obrigatório"),
        body("cpf").matches(/^\d{11}$/).withMessage("CPF deve conter 11 dígitos numéricos"),
        body("email").isEmail().withMessage("Email inválido"),
        body("senha").isLength({ min: 8 }).withMessage("Senha deve ter no mínimo 8 caracteres"),
        body("telefone").notEmpty().withMessage("Telefone é obrigatório"),
        body("endereco").optional().isObject().withMessage("Endereço deve ser um objeto"),
        validateRequest,
    ],
    async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
        try {
            const { nomeCompleto, cpf, email, senha, telefone, endereco } = req.body;

            const enderecoStr = endereco
                ? [endereco.rua, endereco.cidade, endereco.estado, endereco.cep]
                    .filter(Boolean)
                    .join(", ")
                : undefined;

            const cliente = await UsuarioContaService.criarCliente({
                nomeCompleto,
                cpf,
                senha,
                email,
                // @ts-ignore
                telefone,
                // @ts-ignore
                endereco: enderecoStr,
            });

            return res.status(201).json({
                message: "Usuário criado com sucesso",
                usuario: {
                    id: (cliente as any).id,
                    nomeCompleto: (cliente as any).nomeCompleto,
                    agencia: (cliente as any).agencia,
                    numeroConta: (cliente as any).numeroConta,
                },
            });
        } catch (error) {
            LoggerService.error("Erro no registro", error);
            const message = (error as Error).message || "Erro ao registrar usuário";
            return res.status(400).json({
                error: "Dados inválidos",
                message,
                statusCode: 400,
                timestamp: new Date().toISOString(),
            });
        }
    }
);

export default router;