// src/controllers/UsuarioContaController.ts
import { Response } from "express";
import { UsuarioContaService } from "../services/UsuarioContaService";
import { DuplicateCpfError } from "../services/errors/DuplicateCpfError";
import { AuthRequest } from "../middleware/authMiddleware"; // Importa a interface com dados de auth
import { UserRole } from "../entities/UsuarioConta";

const usuarioContaService = new UsuarioContaService();

export class UsuarioContaController {
    // ATUALIZADO: Usa AuthRequest e passa o papel do criador para o serviço
    async criar(req: AuthRequest, res: Response): Promise<Response> {
        try {
            // Garante que userRole não é undefined (authMiddleware deve ter populado)
            const criadorRole = req.userRole || UserRole.OPERADOR;
            const novoUsuario = await usuarioContaService.criar(req.body, criadorRole);
            return res.status(201).json(novoUsuario);
        } catch (error: unknown) {
            if (error instanceof DuplicateCpfError) {
                return res.status(400).json({ erro: error.message });
            }
            console.error(error);
            return res.status(500).json({ erro: "Erro interno ao criar usuário." });
        }
    }

    async login(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const token = await usuarioContaService.login(req.body);
            if (!token) {
                return res.status(401).json({ erro: "CPF ou senha inválidos." });
            }
            return res.status(200).json({ token });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ erro: "Erro interno ao realizar login." });
        }
    }

    // NOVO: Controller para buscar todos os usuários
    async buscarTodos(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const usuarios = await usuarioContaService.buscarTodos();
            return res.status(200).json(usuarios);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ erro: "Erro interno ao buscar usuários." });
        }
    }

    // NOVO: Controller para manutenção de conta pelo ADMIN
    async atualizarConta(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const contaAtualizada = await usuarioContaService.atualizarConta(id, req.body);

            if (!contaAtualizada) {
                return res.status(404).json({ erro: "Conta não encontrada." });
            }

            return res.status(200).json(contaAtualizada);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ erro: "Erro interno ao atualizar a conta." });
        }
    }
}