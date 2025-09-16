// src/services/UsuarioContaService.ts
import { AppDataSource } from "../database/data-source";
import { UsuarioConta, TipoConta } from "../entities/UsuarioConta";
import { Cartao, TipoCartao, BandeiraCartao, TitularidadeCartao } from "../entities/Cartao";
import { LoggerService } from "./LoggerService";
import bcrypt from "bcrypt";

export class UsuarioContaService {
    // Obtém repositórios dinamicamente para compatibilidade com testes (jest.mock)
    private static repo() { return AppDataSource.getRepository(UsuarioConta); }
    private static cartaoRepo() { return AppDataSource.getRepository(Cartao); }

    static async criarCliente(dados: {
        nomeCompleto: string;
        cpf: string;
        senha: string;
        email?: string;
        telefone?: string;
        endereco?: string;
        tipoConta?: TipoConta;
        agencia?: string;
        numeroConta?: string;
        bandeira?: 'V' | 'M';
    }) {
        try {
            // 1. Verificar se CPF já existe
            const clienteExistente = await this.repo().findOne({
                where: { cpf: dados.cpf }
            });

            if (clienteExistente) {
                throw new Error("CPF já cadastrado");
            }

            // 2. Gerar número da conta e agência
            const numeroConta = dados.numeroConta || this.gerarNumeroConta();
            const agencia = dados.agencia || "0001"; // Agência padrão

            // 3. Hash da senha
            const senhaHash = await bcrypt.hash(dados.senha, 10);

            // 4. Criar cliente
            const cliente = this.repo().create({
                nomeCompleto: dados.nomeCompleto,
                cpf: dados.cpf,
                senha: senhaHash,
                email: dados.email,
                telefone: dados.telefone,
                endereco: dados.endereco,
                tipoConta: dados.tipoConta || TipoConta.CORRENTE,
                agencia,
                numeroConta,
                saldo: 200.00 // Saldo inicial
            });

            await this.repo().save(cliente);

            // 5. Criar cartões iniciais (débito + crédito com bandeira selecionada)
            await this.criarCartoesIniciais(cliente, dados.bandeira);

            LoggerService.info("Cliente criado com sucesso", { 
                id: cliente.id, 
                cpf: dados.cpf 
            });

            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao criar cliente", error);
            throw error;
        }
    }

    static async buscarPorId(id: string) {
        try {
            const cliente = await this.repo().findOne({
                where: { id },
                relations: ["cartoes"]
            });

            if (!cliente) {
                LoggerService.warn("Cliente não encontrado", { id });
                return null;
            }

            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao buscar cliente", error);
            throw error;
        }
    }

    static async buscarPorCPF(cpf: string) {
        try {
            const cliente = await this.repo().findOne({
                where: { cpf },
                relations: ["cartoes"]
            });

            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao buscar cliente por CPF", error);
            throw error;
        }
    }

    static async buscarTodos() {
        try {
            const clientes = await this.repo().find({
                relations: ["cartoes"],
                order: { nomeCompleto: "ASC" }
            });

            return clientes;
        } catch (error) {
            LoggerService.error("Erro ao buscar todos os clientes", error);
            throw error;
        }
    }

    static async atualizarSaldo(id: string, valor: number) {
        try {
            const cliente = await this.repo().findOne({
                where: { id }
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            cliente.saldo += valor;
            await this.repo().save(cliente);

            LoggerService.info("Saldo atualizado", { 
                id, 
                valor, 
                novoSaldo: cliente.saldo 
            });

            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao atualizar saldo", error);
            throw error;
        }
    }

    static async consultarSaldo(id: string) {
        try {
            const cliente = await this.repo().findOne({
                where: { id },
                select: ["id", "saldo", "limiteCredito", "creditoUtilizado"]
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            return {
                saldo: cliente.saldo,
                limiteCredito: cliente.limiteCredito,
                creditoUtilizado: cliente.creditoUtilizado,
                creditoDisponivel: cliente.limiteCredito - cliente.creditoUtilizado
            };
        } catch (error) {
            LoggerService.error("Erro ao consultar saldo", error);
            throw error;
        }
    }

    private static gerarNumeroConta(): string {
        return Math.random().toString().slice(2, 10);
    }

    private static async criarCartoesIniciais(usuario: UsuarioConta, bandeiraSelecionada?: 'V' | 'M') {
        try {
            // Determinar bandeira: V=Visa, M=Mastercard, padrão=Mastercard
            const bandeira = bandeiraSelecionada === 'V' ? BandeiraCartao.VISA : BandeiraCartao.MASTERCARD;
            
            // Criar cartão múltiplo (débito + crédito)
            const cartaoMultiplo = this.cartaoRepo().create({
                usuarioConta: usuario,
                tipo: TipoCartao.MULTIPLO, // Cartão múltiplo (débito + crédito)
                bandeira: bandeira,
                titularidade: TitularidadeCartao.TITULAR,
                numero: this.gerarNumeroCartao(bandeira),
                cvv: this.gerarCVV(),
                dataValidade: this.gerarDataValidade(),
                pin: await bcrypt.hash("1234", 10), // PIN padrão
                limite: 1000.00, // Limite de crédito disponível
                ehSegundaVia: false // Cartão inicial não é segunda via
            });

            await this.cartaoRepo().save(cartaoMultiplo);

            const cartaoIdSafe = (cartaoMultiplo as any)?.id || undefined;
            LoggerService.info("Cartão múltiplo criado", { 
                usuarioId: usuario.id,
                cartaoId: cartaoIdSafe,
                bandeira: bandeira,
                tipo: "MULTIPLO (Débito + Crédito)"
            });
        } catch (error) {
            LoggerService.error("Erro ao criar cartão múltiplo", error);
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

    static async atualizarSenha(id: string, novaSenha: string) {
        try {
            const cliente = await this.repo().findOne({
                where: { id }
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            (cliente as any).senha = novaSenha as any;
            await this.repo().save(cliente);

            LoggerService.info("Senha atualizada", {
                clienteId: id
            });

            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao atualizar senha", error);
            throw error;
        }
    }

    static async atualizarConfiguracoes(id: string, configuracoes: {
        notificacoesPush?: boolean;
        notificacoesEmail?: boolean;
        notificacoesSms?: boolean;
        telefone?: string;
        email?: string | null;
        endereco?: string;
    }) {
        try {
            const cliente = await this.repo().findOne({
                where: { id }
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            if (configuracoes.notificacoesPush !== undefined) {
                (cliente as any).notificacoesPush = configuracoes.notificacoesPush;
            }
            if (configuracoes.notificacoesEmail !== undefined) {
                (cliente as any).notificacoesEmail = configuracoes.notificacoesEmail;
            }
            if (configuracoes.notificacoesSms !== undefined) {
                (cliente as any).notificacoesSms = configuracoes.notificacoesSms;
            }
            if (configuracoes.telefone !== undefined) {
                (cliente as any).telefone = configuracoes.telefone;
            }
            if (configuracoes.email !== undefined) {
                (cliente as any).email = configuracoes.email as any;
            }
            if (configuracoes.endereco !== undefined) {
                (cliente as any).endereco = configuracoes.endereco;
            }

            await this.repo().save(cliente);

            LoggerService.info("Configurações atualizadas", {
                clienteId: id,
                configuracoes
            });

            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao atualizar configurações", error);
            throw error;
        }
    }

    static async atualizarEmail(id: string, email: string | null) {
        try {
            const cliente = await this.repo().findOne({ where: { id } });
            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            (cliente as any).email = email as any; // aceita null
            await this.repo().save(cliente);

            LoggerService.info("Email atualizado", {
                clienteId: id,
                email
            });

            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao atualizar email", error);
            throw error;
        }
    }

    static async buscarPorEmail(email: string) {
        try {
            const cliente = await this.repo().findOne({ where: { email } as any });
            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao buscar cliente por email", error);
            throw error;
        }
    }

    static async buscarPorAgenciaEConta(agencia: string, numeroConta: string) {
        try {
            const cliente = await this.repo().findOne({ 
                where: { 
                    agencia: agencia,
                    numeroConta: numeroConta 
                } 
            });
            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao buscar cliente por agência e conta", error);
            throw error;
        }
    }

    // Métodos de instância delegando para estáticos (compat)
    async buscarPorId(id: string) {
        return UsuarioContaService.buscarPorId(id);
    }

    async atualizarSaldo(id: string, valor: number) {
        return UsuarioContaService.atualizarSaldo(id, valor);
    }
}