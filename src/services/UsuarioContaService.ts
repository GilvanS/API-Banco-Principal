// src/services/UsuarioContaService.ts
import { AppDataSource } from "../database/data-source";
import { UsuarioConta, UserRole } from "../entities/UsuarioConta";
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
        agencia?: string;
        numeroConta?: string;
        role?: string;
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
                agencia,
                numeroConta,
                role: dados.role === "admin" ? UserRole.ADMIN : UserRole.OPERADOR,
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

    // Métodos de Admin
    static async atualizarLimites(id: string, limites: {
        limiteCredito: number;
        limiteDebitoDiario?: number;
    }) {
        try {
            const cliente = await this.repository.findOne({
                where: { id }
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            cliente.limiteCredito = limites.limiteCredito;
            if (limites.limiteDebitoDiario !== undefined) {
                cliente.limiteDebitoDiario = limites.limiteDebitoDiario;
            }

            await this.repository.save(cliente);

            LoggerService.info("Limites atualizados por admin", {
                clienteId: id,
                limites
            });

            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao atualizar limites", error);
            throw error;
        }
    }

    static async bloquearConta(id: string, contaBloqueada: boolean) {
        try {
            const cliente = await this.repository.findOne({
                where: { id }
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            cliente.contaBloqueada = contaBloqueada;
            await this.repository.save(cliente);

            LoggerService.info("Status de conta alterado por admin", {
                clienteId: id,
                contaBloqueada
            });

            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao alterar status da conta", error);
            throw error;
        }
    }

    static async desativarConta(id: string) {
        try {
            const cliente = await this.repository.findOne({
                where: { id }
            });

            if (!cliente) {
                throw new Error("Cliente não encontrado");
            }

            cliente.ativo = false;
            cliente.contaBloqueada = true;
            await this.repository.save(cliente);

            LoggerService.info("Conta desativada por admin", {
                clienteId: id
            });

            return cliente;
        } catch (error) {
            LoggerService.error("Erro ao desativar conta", error);
            throw error;
        }
    }

    static async gerarRelatorio() {
        try {
            const clientes = await this.repository.find({
                relations: ["cartoes"]
            });

            const totalClientes = clientes.length;
            const clientesAtivos = clientes.filter(c => c.ativo).length;
            const clientesBloqueados = clientes.filter(c => c.contaBloqueada).length;
            const totalSaldo = clientes.reduce((sum, c) => sum + c.saldo, 0);
            const totalCartoes = clientes.reduce((sum, c) => sum + c.cartoes.length, 0);

            const relatorio = {
                resumo: {
                    totalClientes,
                    clientesAtivos,
                    clientesBloqueados,
                    totalSaldo,
                    totalCartoes
                },
                clientes: clientes.map(c => ({
                    id: c.id,
                    nomeCompleto: c.nomeCompleto,
                    cpf: c.cpf,
                    saldo: c.saldo,
                    ativo: c.ativo,
                    contaBloqueada: c.contaBloqueada,
                    totalCartoes: c.cartoes.length
                }))
            };

            return relatorio;
        } catch (error) {
            LoggerService.error("Erro ao gerar relatório", error);
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
                numero: this.gerarNumeroCartao(),
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
                numero: this.gerarNumeroCartao(),
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

    private static gerarNumeroCartao(): string {
        return "5" + Math.random().toString().slice(2, 16);
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