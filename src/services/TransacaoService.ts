// src/services/TransacaoService.ts
import { AppDataSource } from "../database/data-source";
import { Movimentacao } from "../entities/Movimentacao";
import { UsuarioConta } from "../entities/UsuarioConta";
import { CartaoService } from "./CartaoService";
import { LoggerService } from "./LoggerService";

export class TransacaoService {
    private static repository = AppDataSource.getRepository(Movimentacao);
    private static usuarioRepository = AppDataSource.getRepository(UsuarioConta);

    static async transferir(dados: {
        agenciaOrigem: string;
        contaOrigem: string;
        agenciaDestino: string;
        contaDestino: string;
        valor: number;
        cartaoId: string;
        pin: string;
    }) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Validar valor da transferência
            if (dados.valor < 10.00) {
                throw new Error("Valor mínimo para transferência é R$ 10,00");
            }

            if (dados.valor > 5000.00) {
                throw new Error("Valor máximo para transferência é R$ 5.000,00");
            }

            // 2. Validar PIN do cartão de débito
            const pinValido = await CartaoService.validarPIN(dados.cartaoId, dados.pin);
            if (!pinValido) {
                throw new Error("PIN inválido");
            }

            // 3. Buscar conta de origem
            const contaOrigem = await this.usuarioRepository.findOne({
                where: {
                    agencia: dados.agenciaOrigem,
                    numeroConta: dados.contaOrigem,
                    ativo: true,
                    contaBloqueada: false
                }
            });

            if (!contaOrigem) {
                throw new Error("Conta de origem não encontrada ou inativa");
            }

            // 4. Buscar conta de destino
            const contaDestino = await this.usuarioRepository.findOne({
                where: {
                    agencia: dados.agenciaDestino,
                    numeroConta: dados.contaDestino,
                    ativo: true,
                    contaBloqueada: false
                }
            });

            if (!contaDestino) {
                throw new Error("Conta de destino não encontrada ou inativa");
            }

            // 5. Verificar se não é a mesma conta
            if (contaOrigem.id === contaDestino.id) {
                throw new Error("Não é possível transferir para a mesma conta");
            }

            // 6. Verificar saldo suficiente
            if (contaOrigem.saldo < dados.valor) {
                throw new Error("Saldo insuficiente para realizar a transferência");
            }

            // 7. Realizar transferência
            contaOrigem.saldo -= dados.valor;
            contaDestino.saldo += dados.valor;

            await queryRunner.manager.save(UsuarioConta, contaOrigem);
            await queryRunner.manager.save(UsuarioConta, contaDestino);

            // 8. Registrar movimentações
            const movimentacaoEnviada = this.repository.create({
                tipo: "transferencia_enviada",
                valor: dados.valor,
                descricao: `Transferência enviada para ${contaDestino.nomeCompleto} (${dados.agenciaDestino}/${dados.contaDestino})`,
                agenciaOrigem: dados.agenciaOrigem,
                contaOrigem: dados.contaOrigem,
                agenciaDestino: dados.agenciaDestino,
                contaDestino: dados.contaDestino,
                usuarioConta: contaOrigem
            });

            const movimentacaoRecebida = this.repository.create({
                tipo: "transferencia_recebida",
                valor: dados.valor,
                descricao: `Transferência recebida de ${contaOrigem.nomeCompleto} (${dados.agenciaOrigem}/${dados.contaOrigem})`,
                agenciaOrigem: dados.agenciaOrigem,
                contaOrigem: dados.contaOrigem,
                agenciaDestino: dados.agenciaDestino,
                contaDestino: dados.contaDestino,
                usuarioConta: contaDestino
            });

            await queryRunner.manager.save(Movimentacao, movimentacaoEnviada);
            await queryRunner.manager.save(Movimentacao, movimentacaoRecebida);

            await queryRunner.commitTransaction();

            LoggerService.info("Transferência realizada com sucesso", {
                agenciaOrigem: dados.agenciaOrigem,
                contaOrigem: dados.contaOrigem,
                agenciaDestino: dados.agenciaDestino,
                contaDestino: dados.contaDestino,
                valor: dados.valor
            });

            return {
                mensagem: "Transferência realizada com sucesso",
                dados: {
                    agenciaOrigem: dados.agenciaOrigem,
                    contaOrigem: dados.contaOrigem,
                    agenciaDestino: dados.agenciaDestino,
                    contaDestino: dados.contaDestino,
                    valor: dados.valor,
                    data: new Date()
                }
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            LoggerService.error("Erro ao realizar transferência", error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    static async depositar(dados: {
        agencia: string;
        conta: string;
        valor: number;
    }) {
        try {
            // 1. Validar valor do depósito
            if (dados.valor <= 0) {
                throw new Error("Valor do depósito deve ser maior que zero");
            }

            // 2. Buscar conta
            const conta = await this.usuarioRepository.findOne({
                where: {
                    agencia: dados.agencia,
                    numeroConta: dados.conta,
                    ativo: true,
                    contaBloqueada: false
                }
            });

            if (!conta) {
                throw new Error("Conta não encontrada ou inativa");
            }

            // 3. Realizar depósito
            conta.saldo += dados.valor;
            await this.usuarioRepository.save(conta);

            // 4. Registrar movimentação
            const movimentacao = this.repository.create({
                tipo: "deposito",
                valor: dados.valor,
                descricao: `Depósito realizado na conta ${dados.agencia}/${dados.conta}`,
                agenciaDestino: dados.agencia,
                contaDestino: dados.conta,
                usuarioConta: conta
            });

            await this.repository.save(movimentacao);

            LoggerService.info("Depósito realizado com sucesso", {
                agencia: dados.agencia,
                conta: dados.conta,
                valor: dados.valor
            });

            return {
                mensagem: "Depósito realizado com sucesso",
                dados: {
                    agencia: dados.agencia,
                    conta: dados.conta,
                    valor: dados.valor,
                    saldoAtual: conta.saldo,
                    data: new Date()
                }
            };

        } catch (error) {
            LoggerService.error("Erro ao realizar depósito", error);
            throw error;
        }
    }

    static async compraCredito(dados: {
        cartaoId: string;
        valor: number;
        estabelecimento: string;
    }) {
        try {
            // 1. Validar valor da compra
            if (dados.valor <= 0) {
                throw new Error("Valor da compra deve ser maior que zero");
            }

            // 2. Buscar cartão e usuário
            const cartao = await AppDataSource.getRepository("Cartao").findOne({
                where: { id: dados.cartaoId },
                relations: ["usuarioConta"]
            });

            if (!cartao) {
                throw new Error("Cartão não encontrado");
            }

            if (cartao.status !== "ativo") {
                throw new Error("Cartão não está ativo");
            }

            if (cartao.tipo !== "credito") {
                throw new Error("Apenas cartões de crédito podem ser usados para compras");
            }

            const usuario = cartao.usuarioConta;

            // 3. Verificar limite disponível
            const creditoDisponivel = usuario.limiteCredito - usuario.creditoUtilizado;
            if (creditoDisponivel < dados.valor) {
                throw new Error("Limite de crédito insuficiente");
            }

            // 4. Realizar compra
            usuario.creditoUtilizado += dados.valor;
            await this.usuarioRepository.save(usuario);

            // 5. Registrar movimentação
            const movimentacao = this.repository.create({
                tipo: "compra_credito",
                valor: dados.valor,
                descricao: `Compra no crédito - ${dados.estabelecimento}`,
                estabelecimento: dados.estabelecimento,
                usuarioConta: usuario
            });

            await this.repository.save(movimentacao);

            LoggerService.info("Compra no crédito realizada", {
                cartaoId: dados.cartaoId,
                valor: dados.valor,
                estabelecimento: dados.estabelecimento
            });

            return {
                mensagem: "Compra realizada com sucesso",
                dados: {
                    cartaoId: dados.cartaoId,
                    valor: dados.valor,
                    estabelecimento: dados.estabelecimento,
                    creditoUtilizado: usuario.creditoUtilizado,
                    creditoDisponivel: usuario.limiteCredito - usuario.creditoUtilizado,
                    data: new Date()
                }
            };

        } catch (error) {
            LoggerService.error("Erro ao realizar compra no crédito", error);
            throw error;
        }
    }

    static async pagarFatura(dados: {
        usuarioId: string;
        valor: number;
    }) {
        try {
            // 1. Validar valor do pagamento
            if (dados.valor <= 0) {
                throw new Error("Valor do pagamento deve ser maior que zero");
            }

            // 2. Buscar usuário
            const usuario = await this.usuarioRepository.findOne({
                where: { id: dados.usuarioId }
            });

            if (!usuario) {
                throw new Error("Usuário não encontrado");
            }

            // 3. Verificar saldo suficiente
            if (usuario.saldo < dados.valor) {
                throw new Error("Saldo insuficiente para pagar a fatura");
            }

            // 4. Verificar se há crédito utilizado
            if (usuario.creditoUtilizado <= 0) {
                throw new Error("Não há fatura para pagar");
            }

            // 5. Calcular valor a pagar (não pode pagar mais que o utilizado)
            const valorAPagar = Math.min(dados.valor, usuario.creditoUtilizado);

            // 6. Realizar pagamento
            usuario.saldo -= valorAPagar;
            usuario.creditoUtilizado -= valorAPagar;
            await this.usuarioRepository.save(usuario);

            // 7. Registrar movimentação
            const movimentacao = this.repository.create({
                tipo: "pagamento_fatura",
                valor: valorAPagar,
                descricao: `Pagamento de fatura do cartão de crédito`,
                usuarioConta: usuario
            });

            await this.repository.save(movimentacao);

            LoggerService.info("Fatura paga com sucesso", {
                usuarioId: dados.usuarioId,
                valor: valorAPagar
            });

            return {
                mensagem: "Fatura paga com sucesso",
                dados: {
                    valorPago: valorAPagar,
                    creditoUtilizado: usuario.creditoUtilizado,
                    saldoAtual: usuario.saldo,
                    data: new Date()
                }
            };

        } catch (error) {
            LoggerService.error("Erro ao pagar fatura", error);
            throw error;
        }
    }

    static async consultarExtrato(usuarioId: string, pagina: number = 1, limite: number = 10) {
        try {
            const offset = (pagina - 1) * limite;

            const [movimentacoes, total] = await this.repository.findAndCount({
                where: { usuarioConta: { id: usuarioId } },
                order: { data: "DESC" },
                skip: offset,
                take: limite
            });

            const totalPaginas = Math.ceil(total / limite);

            return {
                movimentacoes,
                paginacao: {
                    pagina,
                    limite,
                    total,
                    totalPaginas
                }
            };

        } catch (error) {
            LoggerService.error("Erro ao consultar extrato", error);
            throw error;
        }
    }
}
