// src/services/UsuarioContaService.ts
import { AppDataSource } from "../database/data-source";
import { UsuarioConta, TipoConta } from "../entities/UsuarioConta";
import { Cartao, TipoCartao, BandeiraCartao, TitularidadeCartao } from "../entities/Cartao";
import { LoggerService } from "./LoggerService";
import bcrypt from "bcrypt";

export class UsuarioContaService {
    private static repository = AppDataSource.getRepository(UsuarioConta);
    private static cartaoRepository = AppDataSource.getRepository(Cartao);

    static async criarCliente(dados: {
        nomeCompleto: string;
        cpf: string;
        senha: string;
        email?: string;
        tipoConta?: TipoConta;
        agencia?: string;
        numeroConta?: string;
    }) {
        try {
            // 1. Verificar se CPF já existe
            const clienteExistente = await this.repository.findOne({
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
            const cliente = this.repository.create({
                nomeCompleto: dados.nomeCompleto,
                cpf: dados.cpf,
                senha: senhaHash,
                email: dados.email,
                tipoConta: dados.tipoConta || TipoConta.CORRENTE,
                agencia,
                numeroConta,
                saldo: 200.00 // Saldo inicial
            });

            await this.repository.save(cliente);

            // 5. Criar cartões iniciais (débito Master e crédito Visa)
            await this.criarCartoesIniciais(cliente);

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
            const cliente = await this.repository.findOne({
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
            const cliente = await this.repository.findOne({
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
            const clientes = await this.repository.find({
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
            const cliente = await this.repository.findOne({
                where: { id }
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            cliente.saldo += valor;
            await this.repository.save(cliente);

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
            const cliente = await this.repository.findOne({
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

    private static async criarCartoesIniciais(usuario: UsuarioConta) {
        try {
            // Criar cartão de débito Master
            const cartaoDebito = this.cartaoRepository.create({
                usuarioConta: usuario,
                tipo: TipoCartao.DEBITO,
                bandeira: BandeiraCartao.MASTERCARD,
                titularidade: TitularidadeCartao.TITULAR,
                numero: this.gerarNumeroCartao(BandeiraCartao.MASTERCARD),
                cvv: this.gerarCVV(),
                dataValidade: this.gerarDataValidade(),
                pin: await bcrypt.hash("1234", 10) // PIN padrão
            });

            await this.cartaoRepository.save(cartaoDebito);

            // Criar cartão de crédito Visa
            const cartaoCredito = this.cartaoRepository.create({
                usuarioConta: usuario,
                tipo: TipoCartao.CREDITO,
                bandeira: BandeiraCartao.VISA,
                titularidade: TitularidadeCartao.TITULAR,
                numero: this.gerarNumeroCartao(BandeiraCartao.VISA),
                cvv: this.gerarCVV(),
                dataValidade: this.gerarDataValidade(),
                limite: 1000.00 // Limite inicial
            });

            await this.cartaoRepository.save(cartaoCredito);

            LoggerService.info("Cartões iniciais criados", { 
                usuarioId: usuario.id,
                cartaoDebitoId: cartaoDebito.id,
                cartaoCreditoId: cartaoCredito.id
            });
        } catch (error) {
            LoggerService.error("Erro ao criar cartões iniciais", error);
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
    static async atualizarSenha(id: string, novaSenha: string) {
        try {
            const cliente = await this.repository.findOne({
                where: { id }
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            cliente.senha = novaSenha;
            await this.repository.save(cliente);

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
        email?: string;
        endereco?: string;
    }) {
        try {
            const cliente = await this.repository.findOne({
                where: { id }
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            if (configuracoes.notificacoesPush !== undefined) {
                cliente.notificacoesPush = configuracoes.notificacoesPush;
            }
            if (configuracoes.notificacoesEmail !== undefined) {
                cliente.notificacoesEmail = configuracoes.notificacoesEmail;
            }
            if (configuracoes.notificacoesSms !== undefined) {
                cliente.notificacoesSms = configuracoes.notificacoesSms;
            }
            if (configuracoes.telefone !== undefined) {
                cliente.telefone = configuracoes.telefone;
            }
            if (configuracoes.email !== undefined) {
                cliente.email = configuracoes.email;
            }
            if (configuracoes.endereco !== undefined) {
                cliente.endereco = configuracoes.endereco;
            }

            await this.repository.save(cliente);

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

    // Método não estático para compatibilidade com as novas rotas
    async buscarPorId(id: string) {
        return UsuarioContaService.buscarPorId(id);
    }

    async atualizarSaldo(id: string, valor: number) {
        return UsuarioContaService.atualizarSaldo(id, valor);
    }
}