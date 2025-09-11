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
                numero: this.gerarNumeroCartao(dados.bandeira),
                cvv: this.gerarCVV(),
                dataValidade: this.gerarDataValidade(),
                limite: dados.limite || 500.00, // Limite menor para cartão adicional
                pin: null // Cartões de crédito não têm PIN
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

            return cartoes.map(cartao => ({
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