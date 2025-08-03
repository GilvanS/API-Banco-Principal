// src/services/CartaoService.ts
import { AppDataSource } from "../database/data-source";
import { Cartao, TipoCartao, BandeiraCartao, StatusCartao, TitularidadeCartao } from "../entities/Cartao";
import { UsuarioConta } from "../entities/UsuarioConta";
import { LoggerService } from "./LoggerService";
import bcrypt from "bcrypt";

export class CartaoService {
    private static repository = AppDataSource.getRepository(Cartao);
    private static usuarioRepository = AppDataSource.getRepository(UsuarioConta);

    static async solicitarCartaoAdicional(dados: {
        usuarioId: string;
        bandeira: BandeiraCartao;
        limite?: number;
    }) {
        try {
            const usuario = await this.usuarioRepository.findOne({
                where: { id: dados.usuarioId }
            });

            if (!usuario) {
                throw new Error("Usuário não encontrado");
            }

            // Verificar se o usuário já tem cartão de crédito titular
            const cartaoTitular = await this.repository.findOne({
                where: { 
                    usuarioConta: { id: dados.usuarioId },
                    tipo: TipoCartao.CREDITO,
                    titularidade: TitularidadeCartao.TITULAR
                }
            });

            if (!cartaoTitular) {
                throw new Error("Usuário deve ter um cartão de crédito titular antes de solicitar cartão adicional");
            }

            const cartao = this.repository.create({
                usuarioConta: usuario,
                tipo: TipoCartao.CREDITO,
                bandeira: dados.bandeira,
                titularidade: TitularidadeCartao.ADICIONAL,
                numero: this.gerarNumeroCartao(),
                cvv: this.gerarCVV(),
                dataValidade: this.gerarDataValidade(),
                limite: dados.limite || 500.00 // Limite menor para cartão adicional
            });

            await this.repository.save(cartao);

            LoggerService.info("Cartão adicional solicitado com sucesso", {
                usuarioId: dados.usuarioId,
                bandeira: dados.bandeira,
                titularidade: TitularidadeCartao.ADICIONAL
            });

            return cartao;
        } catch (error) {
            LoggerService.error("Erro ao solicitar cartão adicional", error);
            throw error;
        }
    }

    static async buscarCartoesUsuario(usuarioId: string) {
        try {
            const cartoes = await this.repository.find({
                where: { usuarioConta: { id: usuarioId } },
                order: { dataCriacao: "DESC" }
            });

            return cartoes;
        } catch (error) {
            LoggerService.error("Erro ao buscar cartões do usuário", error);
            throw error;
        }
    }

    static async definirPIN(cartaoId: string, pinAtual: string, novoPIN: string) {
        try {
            const cartao = await this.repository.findOne({
                where: { id: cartaoId },
                select: ["id", "tipo", "pin"]
            });

            if (!cartao) {
                throw new Error("Cartão não encontrado");
            }

            if (cartao.tipo !== TipoCartao.DEBITO) {
                throw new Error("Apenas cartões de débito possuem PIN");
            }

            if (!cartao.pin) {
                throw new Error("PIN não definido para este cartão");
            }

            const pinAtualValido = await bcrypt.compare(pinAtual, cartao.pin);
            if (!pinAtualValido) {
                throw new Error("PIN atual incorreto");
            }

            const novoPINHash = await bcrypt.hash(novoPIN, 10);
            cartao.pin = novoPINHash;
            await this.repository.save(cartao);

            LoggerService.info("PIN alterado com sucesso", { cartaoId });

            return { mensagem: "PIN alterado com sucesso" };
        } catch (error) {
            LoggerService.error("Erro ao alterar PIN", error);
            throw error;
        }
    }

    static async validarPIN(cartaoId: string, pin: string): Promise<boolean> {
        try {
            const cartao = await this.repository.findOne({
                where: { id: cartaoId },
                select: ["id", "tipo", "pin", "status"]
            });

            if (!cartao) {
                throw new Error("Cartão não encontrado");
            }

            if (cartao.tipo !== TipoCartao.DEBITO) {
                throw new Error("Apenas cartões de débito possuem PIN");
            }

            if (cartao.status !== StatusCartao.ATIVO) {
                throw new Error("Cartão não está ativo");
            }

            if (!cartao.pin) {
                throw new Error("PIN não definido para este cartão");
            }

            const pinValido = await bcrypt.compare(pin, cartao.pin);
            return pinValido;
        } catch (error) {
            LoggerService.error("Erro ao validar PIN", error);
            throw error;
        }
    }

    static async bloquearCartao(cartaoId: string) {
        try {
            const cartao = await this.repository.findOne({
                where: { id: cartaoId }
            });

            if (!cartao) {
                throw new Error("Cartão não encontrado");
            }

            cartao.status = StatusCartao.BLOQUEADO;
            await this.repository.save(cartao);

            LoggerService.info("Cartão bloqueado", { cartaoId });

            return cartao;
        } catch (error) {
            LoggerService.error("Erro ao bloquear cartão", error);
            throw error;
        }
    }

    static async desbloquearCartao(cartaoId: string) {
        try {
            const cartao = await this.repository.findOne({
                where: { id: cartaoId }
            });

            if (!cartao) {
                throw new Error("Cartão não encontrado");
            }

            cartao.status = StatusCartao.ATIVO;
            await this.repository.save(cartao);

            LoggerService.info("Cartão desbloqueado", { cartaoId });

            return cartao;
        } catch (error) {
            LoggerService.error("Erro ao desbloquear cartão", error);
            throw error;
        }
    }

    // Método de Admin
    static async atualizarLimite(cartaoId: string, limite: number) {
        try {
            const cartao = await this.repository.findOne({
                where: { id: cartaoId }
            });

            if (!cartao) {
                throw new Error("Cartão não encontrado");
            }

            if (cartao.tipo !== TipoCartao.CREDITO) {
                throw new Error("Apenas cartões de crédito podem ter limite alterado");
            }

            cartao.limite = limite;
            await this.repository.save(cartao);

            LoggerService.info("Limite do cartão atualizado por admin", {
                cartaoId,
                limite
            });

            return cartao;
        } catch (error) {
            LoggerService.error("Erro ao atualizar limite do cartão", error);
            throw error;
        }
    }

    private static gerarNumeroCartao(): string {
        return "4" + Math.random().toString().slice(2, 16);
    }

    private static gerarCVV(): string {
        return Math.random().toString().slice(2, 5);
    }

    private static gerarDataValidade(): string {
        const data = new Date();
        data.setFullYear(data.getFullYear() + 5);
        return `${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear().toString().slice(-2)}`;
    }
}