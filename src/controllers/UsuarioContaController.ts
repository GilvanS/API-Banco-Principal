// src/controllers/UsuarioContaController.ts
import { NextFunction, Response } from "express";
import { UsuarioContaService } from "../services/UsuarioContaService";
import { AuthRequest } from "../middleware/authMiddleware";
import { NotFoundError } from "../services/errors/NotFoundError";

const usuarioContaService = new UsuarioContaService();

export class UsuarioContaController {
    async criar(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const novoUsuario = await usuarioContaService.criar(req.body);
            return res.status(201).json(novoUsuario);
        } catch (error) {
            return next(error);
        }
    }

    async login(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const token = await usuarioContaService.login(req.body);
            return res.status(200).json({ token });
        } catch (error) {
            return next(error);
        }
    }

    async buscarTodos(_req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const resumoContas = await usuarioContaService.buscarTodosResumo();
            return res.status(200).json(resumoContas);
        } catch (error) {
            return next(error);
        }
    }

    async atualizarConta(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { id } = req.params;
            const contaAtualizada = await usuarioContaService.atualizarConta(id, req.body);

            if (!contaAtualizada) {
                throw new NotFoundError("Conta não encontrada.");
            }

            return res.status(200).json(contaAtualizada);
        } catch (error) {
            return next(error);
        }
    }

    async desativarConta(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { id } = req.params;
            const contaDesativada = await usuarioContaService.desativarConta(id);

            if (!contaDesativada) {
                throw new NotFoundError("Conta não encontrada.");
            }

            return res.status(204).send();
        } catch (error) {
            return next(error);
        }
    }
}