// src/controllers/CartaoController.ts
import { NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { CartaoService } from "../services/CartaoService";
import { UsuarioContaService } from "../services/UsuarioContaService";
import { NotFoundError } from "../services/errors/NotFoundError";

export class CartaoController {
    private cartaoService = new CartaoService();
    private usuarioContaService = new UsuarioContaService();

    /**
     * Solicita um novo cartão de CRÉDITO para um usuário, com opção de gerar um adicional.
     */
    async solicitarCredito(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { cpf, ...dadosSolicitacao } = req.body;
            const conta = await this.usuarioContaService.buscarPorCpf(cpf);

            if (!conta) {
                throw new NotFoundError("Conta de usuário com o CPF informado não foi encontrada.");
            }

            const cartoesGerados = await this.cartaoService.solicitarCartaoDeCredito(conta, dadosSolicitacao);
            return res.status(201).json(cartoesGerados);

        } catch (error) {
            return next(error);
        }
    }

    /**
     * Atualiza o limite ou o status de um cartão existente.
     */
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

    /**
     * Exclui permanentemente um cartão.
     */
    async excluir(req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { id } = req.params;
            const excluido = await this.cartaoService.excluirCartao(id);

            if (!excluido) {
                throw new NotFoundError("Cartão não encontrado ou já foi excluído.");
            }
            return res.status(204).send();
        } catch (error) {
            return next(error);
        }
    }
}