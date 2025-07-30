// src/controllers/CartaoController.ts
import { NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { CartaoService } from "../services/CartaoService";
import { UsuarioContaService } from "../services/UsuarioContaService";
import { NotFoundError } from "../services/errors/NotFoundError";

export class CartaoController {
    private cartaoService = new CartaoService();
    private usuarioContaService = new UsuarioContaService();

    // Novo método para criar qualquer tipo de cartão
    criarCredito: unknown;
    async criar(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            // Separa o CPF do resto dos dados do cartão
            const { cpf, ...dadosCartao } = req.body;
            const conta = await this.usuarioContaService.buscarPorCpf(cpf);

            if (!conta) {
                throw new NotFoundError("Conta de usuário com o CPF informado não foi encontrada.");
            }

            const cartao = await this.cartaoService.criarCartao(conta, dadosCartao);
            return res.status(201).json(cartao);
        } catch (error) {
            return next(error);
        }
    }

    // Novo método para atualizar um cartão (limite, status)
    async atualizar(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { id } = req.params;
            const cartaoAtualizado = await this.cartaoService.atualizarCartao(id, req.body);

            if (!cartaoAtualizado) {
                throw new NotFoundError("Cartão não encontrado.");
            }
            return res.status(200).json(cartaoAtualizado);
        } catch (error) {
            return next(error);
        }
    }

    // Novo método para excluir um cartão
    async excluir(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { id } = req.params;
            const excluido = await this.cartaoService.excluirCartao(id);

            if (!excluido) {
                throw new NotFoundError("Cartão não encontrado ou já foi excluído.");
            }
            // 204 No Content é a resposta padrão para uma exclusão bem-sucedida
            return res.status(204).send();
        } catch (error) {
            return next(error);
        }
    }
}