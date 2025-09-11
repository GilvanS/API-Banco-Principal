// src/services/CartaoService.ts
import { AppDataSource } from '../database/data-source';
import { Cartao, TipoCartao, StatusCartao, BandeiraCartao, TitularidadeCartao } from '../entities/Cartao';
import { UsuarioConta } from '../entities/UsuarioConta';
import { LoggerService } from './LoggerService';
import * as bcrypt from 'bcrypt';

export class CartaoService {
    private static repository = AppDataSource.getRepository(Cartao);
    private static usuarioRepository = AppDataSource.getRepository(UsuarioConta);

    static async solicitarSegundaVia(dados: {
        usuarioId: string;
        motivo: 'perda' | 'roubo' | 'danificacao';
        bandeira?: BandeiraCartao;
    }) {
        try {
            const usuario = await this.usuarioRepository.findOne({
                where: { id: dados.usuarioId }
            });

            if (!usuario) {
                throw new Error("Usuário não encontrado");
            }

            // Buscar cartão ativo atual do usuário
            const cartaoAtual = await this.repository.findOne({
                where: { 
                    usuarioConta: { id: dados.usuarioId },
                    status: StatusCartao.ATIVO,
                    ativo: true
                },
                order: { dataCriacao: "DESC" }
            });

            if (!cartaoAtual) {
                throw new Error("Nenhum cartão ativo encontrado para substituição");
            }

            // Invalidar cartão atual
            cartaoAtual.status = StatusCartao.CANCELADO;
            cartaoAtual.ativo = false;
            cartaoAtual.dataSubstituicao = new Date();
            await this.repository.save(cartaoAtual);

            // Criar nova segunda via
            const novoCartao = this.repository.create({
                usuarioConta: usuario,
                tipo: TipoCartao.MULTIPLO, // Sempre cartão múltiplo
                bandeira: dados.bandeira || cartaoAtual.bandeira, // Manter bandeira ou usar nova
                titularidade: TitularidadeCartao.TITULAR,
                numero: this.gerarNumeroCartao(dados.bandeira || cartaoAtual.bandeira),
                cvv: this.gerarCVV(),
                dataValidade: this.gerarDataValidade(),
                limite: cartaoAtual.limite, // Manter mesmo limite
                limiteDisponivel: cartaoAtual.limite || 0,
                pin: await bcrypt.hash("1234", 10), // PIN padrão
                ehSegundaVia: true,
                motivoSubstituicao: dados.motivo,
                cartaoAnteriorId: cartaoAtual.id,
                status: StatusCartao.ATIVO,
                ativo: true
            });

            await this.repository.save(novoCartao);

            LoggerService.info("Segunda via de cartão solicitada com sucesso", {
                usuarioId: dados.usuarioId,
                motivo: dados.motivo,
                cartaoAnteriorId: cartaoAtual.id,
                novoCartaoId: novoCartao.id
            });

            return novoCartao;
        } catch (error) {
            LoggerService.error("Erro ao solicitar segunda via de cartão", error);
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

    private static gerarNumeroCartao(bandeira?: BandeiraCartao): string {
        let prefixo = "4"; // Padrão Visa
        
        if (bandeira === BandeiraCartao.MASTERCARD) {
            prefixo = "5";
        } else if (bandeira === BandeiraCartao.VISA) {
            prefixo = "4";
        }
        
        // Gerar 15 dígitos restantes para completar 16 dígitos
        let numero = prefixo;
        for (let i = 0; i < 15; i++) {
            numero += Math.floor(Math.random() * 10);
        }
        
        return numero;
    }

    private static gerarCVV(): string {
        return Math.random().toString().slice(2, 5);
    }

    private static gerarDataValidade(): string {
        const data = new Date();
        data.setFullYear(data.getFullYear() + 5);
        return `${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear().toString().slice(-2)}`;
    }

    // Novos métodos para a refatoração
    static async listarCartoes(usuarioId: string) {
        try {
            const cartoes = await this.repository.find({
                where: { usuarioConta: { id: usuarioId } },
                relations: ["usuarioConta"],
                order: { dataCriacao: "DESC" }
            });

            return cartoes.map((cartao: Cartao) => ({
                id: cartao.id,
                tipo: cartao.tipo,
                bandeira: cartao.bandeira,
                numero: `****${cartao.numero.slice(-4)}`,
                dataValidade: cartao.dataValidade,
                limite: cartao.limite,
                faturaAtual: cartao.faturaAtual || 0,
                limiteDisponivel: cartao.limiteDisponivel || cartao.limite,
                dataVencimentoFatura: cartao.dataVencimentoFatura,
                dataFechamentoFatura: cartao.dataFechamentoFatura,
                ativo: cartao.ativo,
                status: cartao.status,
                isVirtual: cartao.isVirtual || false,
                permiteCompraOnline: cartao.permiteCompraOnline !== false,
                permiteCompraExterior: cartao.permiteCompraExterior !== false,
                permiteSaque: cartao.permiteSaque !== false
            }));
        } catch (error) {
            LoggerService.error("Erro ao listar cartões", error);
            throw error;
        }
    }

    static async solicitarNovoCartao(usuarioId: string, dados: {
        tipo: TipoCartao;
        bandeira: BandeiraCartao;
        isVirtual?: boolean;
    }) {
        try {
            const usuario = await this.usuarioRepository.findOne({
                where: { id: usuarioId }
            });

            if (!usuario) {
                throw new Error("Usuário não encontrado");
            }

            const cartao = this.repository.create({
                usuarioConta: usuario,
                tipo: dados.tipo,
                bandeira: dados.bandeira,
                titularidade: TitularidadeCartao.TITULAR,
                numero: this.gerarNumeroCartao(dados.bandeira),
                cvv: this.gerarCVV(),
                dataValidade: this.gerarDataValidade(),
                limite: dados.tipo === TipoCartao.CREDITO ? 1000.00 : 0,
                faturaAtual: 0,
                limiteDisponivel: dados.tipo === TipoCartao.CREDITO ? 1000.00 : 0,
                ativo: true,
                status: StatusCartao.ATIVO,
                isVirtual: dados.isVirtual || false,
                permiteCompraOnline: true,
                permiteCompraExterior: false,
                permiteSaque: dados.tipo === TipoCartao.DEBITO,
                pin: dados.tipo === TipoCartao.DEBITO ? await bcrypt.hash("1234", 10) : null // PIN padrão para débito
            });

            // Definir datas de fatura para cartão de crédito
            if (dados.tipo === TipoCartao.CREDITO) {
                const hoje = new Date();
                const dataFechamento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 5);
                const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 15);
                
                cartao.dataFechamentoFatura = dataFechamento;
                cartao.dataVencimentoFatura = dataVencimento;
            }

            await this.repository.save(cartao);

            LoggerService.info("Novo cartão solicitado", {
                usuarioId,
                tipo: dados.tipo,
                bandeira: dados.bandeira,
                isVirtual: dados.isVirtual
            });

            return cartao;
        } catch (error) {
            LoggerService.error("Erro ao solicitar novo cartão", error);
            throw error;
        }
    }

    static async consultarFatura(usuarioId: string, cartaoId: string) {
        try {
            const cartao = await this.repository.findOne({
                where: { 
                    id: cartaoId,
                    usuarioConta: { id: usuarioId },
                    tipo: TipoCartao.CREDITO
                },
                relations: ["usuarioConta"]
            });

            if (!cartao) {
                throw new Error("Cartão de crédito não encontrado");
            }

            return {
                faturaAtual: cartao.faturaAtual || 0,
                limite: cartao.limite,
                limiteDisponivel: cartao.limiteDisponivel || cartao.limite,
                dataVencimento: cartao.dataVencimentoFatura,
                dataFechamento: cartao.dataFechamentoFatura,
                valorMinimo: (cartao.faturaAtual || 0) * 0.15, // 15% do valor da fatura
                jurosRotativo: 12.5 // Taxa de juros ao mês
            };
        } catch (error) {
            LoggerService.error("Erro ao consultar fatura", error);
            throw error;
        }
    }

    static async atualizarConfiguracoes(usuarioId: string, cartaoId: string, configuracoes: {
        permiteCompraOnline?: boolean;
        permiteCompraExterior?: boolean;
        permiteSaque?: boolean;
        limite?: number;
    }) {
        try {
            const cartao = await this.repository.findOne({
                where: { 
                    id: cartaoId,
                    usuarioConta: { id: usuarioId }
                },
                relations: ["usuarioConta"]
            });

            if (!cartao) {
                throw new Error("Cartão não encontrado");
            }

            if (configuracoes.permiteCompraOnline !== undefined) {
                cartao.permiteCompraOnline = configuracoes.permiteCompraOnline;
            }
            if (configuracoes.permiteCompraExterior !== undefined) {
                cartao.permiteCompraExterior = configuracoes.permiteCompraExterior;
            }
            if (configuracoes.permiteSaque !== undefined) {
                cartao.permiteSaque = configuracoes.permiteSaque;
            }
            if (configuracoes.limite !== undefined && cartao.tipo === TipoCartao.CREDITO) {
                cartao.limite = configuracoes.limite;
                cartao.limiteDisponivel = configuracoes.limite - (cartao.faturaAtual || 0);
            }

            await this.repository.save(cartao);

            LoggerService.info("Configurações do cartão atualizadas", {
                usuarioId,
                cartaoId,
                configuracoes
            });

            return cartao;
        } catch (error) {
            LoggerService.error("Erro ao atualizar configurações do cartão", error);
            throw error;
        }
    }

    static async bloquearCartaoComMotivo(usuarioId: string, cartaoId: string, motivo: string) {
        try {
            const cartao = await this.repository.findOne({
                where: { 
                    id: cartaoId,
                    usuarioConta: { id: usuarioId }
                },
                relations: ["usuarioConta"]
            });

            if (!cartao) {
                throw new Error("Cartão não encontrado");
            }

            cartao.status = StatusCartao.BLOQUEADO;
            cartao.ativo = false;
            cartao.motivoBloqueio = motivo;

            await this.repository.save(cartao);

            LoggerService.info("Cartão bloqueado", {
                usuarioId,
                cartaoId,
                motivo
            });

            return cartao;
        } catch (error) {
            LoggerService.error("Erro ao bloquear cartão", error);
            throw error;
        }
    }

    static async desbloquearCartaoComValidacao(usuarioId: string, cartaoId: string) {
        try {
            const cartao = await this.repository.findOne({
                where: { 
                    id: cartaoId,
                    usuarioConta: { id: usuarioId }
                },
                relations: ["usuarioConta"]
            });

            if (!cartao) {
                throw new Error("Cartão não encontrado");
            }

            if (cartao.status !== StatusCartao.BLOQUEADO) {
                throw new Error("Cartão não está bloqueado");
            }

            cartao.status = StatusCartao.ATIVO;
            cartao.ativo = true;
            cartao.motivoBloqueio = undefined;

            await this.repository.save(cartao);

            LoggerService.info("Cartão desbloqueado", {
                usuarioId,
                cartaoId
            });

            return cartao;
        } catch (error) {
            LoggerService.error("Erro ao desbloquear cartão", error);
            throw error;
        }
    }
}