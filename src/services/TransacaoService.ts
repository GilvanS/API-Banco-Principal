// src/services/TransacaoService.ts
import { AppDataSource } from "../database/data-source";
import { Movimentacao } from "../entities/Movimentacao";
import { UsuarioConta } from "../entities/UsuarioConta";
import { Cartao } from "../entities/Cartao";
import { CartaoService } from "./CartaoService";
import { LoggerService } from "./LoggerService";

export class TransacaoService {
    private static repository = AppDataSource.getRepository(Movimentacao);
    private static usuarioRepository = AppDataSource.getRepository(UsuarioConta);
    private static cartaoRepository = AppDataSource.getRepository(Cartao);

    static async transferir(dados: {
        agenciaOrigem: string;
        contaOrigem: string;
        nomeOrigem: string;
        cpfOrigem: string;
        agenciaDestino: string;
        contaDestino: string;
        nomeDestino: string;
        cpfDestino: string;
        valor: number;
    }) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Validar valor da transferência
            if (dados.valor < 10.00) {
                throw new Error("Valor mínimo para transferência é R$ 10,00");
            }

            // 2. Buscar conta de origem
            const contaOrigem = await this.usuarioRepository.findOne({
                where: {
                    agencia: dados.agenciaOrigem,
                    numeroConta: dados.contaOrigem,
                    nomeCompleto: dados.nomeOrigem,
                    cpf: dados.cpfOrigem,
                    ativo: true,
                    contaBloqueada: false
                }
            });

            if (!contaOrigem) {
                throw new Error("Conta de origem não encontrada ou inativa");
            }

            // 3. Buscar conta de destino
            const contaDestino = await this.usuarioRepository.findOne({
                where: {
                    agencia: dados.agenciaDestino,
                    numeroConta: dados.contaDestino,
                    nomeCompleto: dados.nomeDestino,
                    cpf: dados.cpfDestino,
                    ativo: true,
                    contaBloqueada: false
                }
            });

            if (!contaDestino) {
                throw new Error("Conta de destino não encontrada ou inativa");
            }

            // 4. Verificar se não é a mesma conta
            if (contaOrigem.id === contaDestino.id) {
                throw new Error("Não é possível transferir para a mesma conta");
            }

            // 5. Verificar saldo suficiente
            if (contaOrigem.saldo < dados.valor) {
                throw new Error("Saldo insuficiente para realizar a transferência");
            }

            // 6. Realizar transferência
            contaOrigem.saldo -= dados.valor;
            contaDestino.saldo += dados.valor;

            await queryRunner.manager.save(UsuarioConta, contaOrigem);
            await queryRunner.manager.save(UsuarioConta, contaDestino);

            // 7. Registrar movimentações
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
                contaOrigem: `${dados.agenciaOrigem}/${dados.contaOrigem}`,
                contaDestino: `${dados.agenciaDestino}/${dados.contaDestino}`,
                valor: dados.valor
            });

            return {
                mensagem: "Transferência realizada com sucesso",
                dados: {
                    agenciaOrigem: dados.agenciaOrigem,
                    contaOrigem: dados.contaOrigem,
                    nomeOrigem: dados.nomeOrigem,
                    cpfOrigem: dados.cpfOrigem,
                    agenciaDestino: dados.agenciaDestino,
                    contaDestino: dados.contaDestino,
                    nomeDestino: dados.nomeDestino,
                    cpfDestino: dados.cpfDestino,
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

    // Método para transferência PIX
    static async transferirPIX(dados: {
        cpfOrigem: string;
        pixDestino: string;
        tipoPix: "cpf" | "email";
        valor: number;
    }) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Validar valor da transferência
            if (dados.valor < 10.00) {
                throw new Error("Valor mínimo para transferência PIX é R$ 10,00");
            }

            // 2. Buscar conta de origem por CPF
            const contaOrigem = await this.usuarioRepository.findOne({
                where: {
                    cpf: dados.cpfOrigem,
                    ativo: true,
                    contaBloqueada: false
                }
            });

            if (!contaOrigem) {
                throw new Error("Conta de origem não encontrada ou inativa");
            }

            // 3. Buscar conta de destino por PIX
            let contaDestino: UsuarioConta | null = null;
            
            if (dados.tipoPix === "cpf") {
                contaDestino = await this.usuarioRepository.findOne({
                    where: {
                        cpf: dados.pixDestino,
                        ativo: true,
                        contaBloqueada: false
                    }
                });
            } else if (dados.tipoPix === "email") {
                // Assumindo que o email está no campo nomeCompleto ou criando um campo email
                contaDestino = await this.usuarioRepository.findOne({
                    where: {
                        nomeCompleto: dados.pixDestino, // Temporário - ideal seria ter campo email
                        ativo: true,
                        contaBloqueada: false
                    }
                });
            }

            if (!contaDestino) {
                throw new Error(`Conta de destino não encontrada para PIX ${dados.tipoPix}: ${dados.pixDestino}`);
            }

            // 4. Verificar se não é a mesma conta
            if (contaOrigem.id === contaDestino.id) {
                throw new Error("Não é possível transferir PIX para a mesma conta");
            }

            // 5. Verificar saldo suficiente
            if (contaOrigem.saldo < dados.valor) {
                throw new Error("Saldo insuficiente para realizar a transferência PIX");
            }

            // 6. Realizar transferência PIX
            contaOrigem.saldo -= dados.valor;
            contaDestino.saldo += dados.valor;

            await queryRunner.manager.save(UsuarioConta, contaOrigem);
            await queryRunner.manager.save(UsuarioConta, contaDestino);

            // 7. Registrar movimentações
            const movimentacaoEnviada = this.repository.create({
                tipo: "pix_enviado",
                valor: dados.valor,
                descricao: `PIX enviado para ${contaDestino.nomeCompleto} (${dados.tipoPix.toUpperCase()}: ${dados.pixDestino})`,
                agenciaOrigem: contaOrigem.agencia,
                contaOrigem: contaOrigem.numeroConta,
                agenciaDestino: contaDestino.agencia,
                contaDestino: contaDestino.numeroConta,
                usuarioConta: contaOrigem
            });

            const movimentacaoRecebida = this.repository.create({
                tipo: "pix_recebido",
                valor: dados.valor,
                descricao: `PIX recebido de ${contaOrigem.nomeCompleto} (${dados.tipoPix.toUpperCase()}: ${dados.pixDestino})`,
                agenciaOrigem: contaOrigem.agencia,
                contaOrigem: contaOrigem.numeroConta,
                agenciaDestino: contaDestino.agencia,
                contaDestino: contaDestino.numeroConta,
                usuarioConta: contaDestino
            });

            await queryRunner.manager.save(Movimentacao, movimentacaoEnviada);
            await queryRunner.manager.save(Movimentacao, movimentacaoRecebida);

            await queryRunner.commitTransaction();

            LoggerService.info("Transferência PIX realizada com sucesso", {
                contaOrigem: `${contaOrigem.agencia}/${contaOrigem.numeroConta}`,
                pixDestino: `${dados.tipoPix}: ${dados.pixDestino}`,
                valor: dados.valor
            });

            return {
                mensagem: "Transferência PIX realizada com sucesso",
                dados: {
                    cpfOrigem: dados.cpfOrigem,
                    pixDestino: dados.pixDestino,
                    tipoPix: dados.tipoPix,
                    valor: dados.valor,
                    data: new Date()
                }
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            LoggerService.error("Erro ao realizar transferência PIX", error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // Método para pagamento com cartão de débito (usando número do cartão)
    static async pagamentoDebito(dados: {
        numeroCartao: string;
        pin: string;
        valor: number;
        estabelecimento: string;
    }) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Buscar cartão por número
            const cartao = await this.cartaoRepository.findOne({
                where: { 
                    numero: dados.numeroCartao,
                    tipo: "debito"
                },
                relations: ["usuarioConta"]
            });

            if (!cartao) {
                throw new Error("Cartão de débito não encontrado");
            }

            // 2. Validar PIN do cartão de débito
            const pinValido = await CartaoService.validarPIN(cartao.id, dados.pin);
            if (!pinValido) {
                throw new Error("PIN inválido");
            }

            const usuario = cartao.usuarioConta;

            // 3. Verificar saldo suficiente
            if (usuario.saldo < dados.valor) {
                throw new Error("Saldo insuficiente para realizar o pagamento");
            }

            // 4. Realizar pagamento
            usuario.saldo -= dados.valor;
            await queryRunner.manager.save(UsuarioConta, usuario);

            // 5. Registrar movimentação
            const movimentacao = this.repository.create({
                tipo: "pagamento_debito",
                valor: dados.valor,
                descricao: `Pagamento com cartão de débito ${dados.numeroCartao} no estabelecimento: ${dados.estabelecimento}`,
                usuarioConta: usuario
            });

            await queryRunner.manager.save(Movimentacao, movimentacao);
            await queryRunner.commitTransaction();

            LoggerService.info("Pagamento com débito realizado com sucesso", {
                numeroCartao: dados.numeroCartao,
                estabelecimento: dados.estabelecimento,
                valor: dados.valor
            });

            return {
                mensagem: "Pagamento realizado com sucesso",
                dados: {
                    numeroCartao: dados.numeroCartao,
                    estabelecimento: dados.estabelecimento,
                    valor: dados.valor,
                    saldoAtual: usuario.saldo,
                    data: new Date()
                }
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            LoggerService.error("Erro ao realizar pagamento com débito", error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // Método para compra com cartão de crédito (usando número do cartão)
    static async compraCredito(dados: {
        numeroCartao: string;
        valor: number;
        estabelecimento: string;
    }) {
        try {
            // 1. Buscar cartão por número
            const cartao = await this.cartaoRepository.findOne({
                where: { 
                    numero: dados.numeroCartao,
                    tipo: "credito"
                },
                relations: ["usuarioConta"]
            });

            if (!cartao) {
                throw new Error("Cartão de crédito não encontrado");
            }

            const usuario = cartao.usuarioConta;

            // 2. Verificar limite disponível
            if (cartao.limite < dados.valor) {
                throw new Error("Limite insuficiente para realizar a compra");
            }

            // 3. Registrar compra (não debita saldo, apenas registra para fatura)
            const movimentacao = this.repository.create({
                tipo: "compra_credito",
                valor: dados.valor,
                descricao: `Compra com cartão de crédito ${dados.numeroCartao} no estabelecimento: ${dados.estabelecimento}`,
                usuarioConta: usuario
            });

            await this.repository.save(movimentacao);

            LoggerService.info("Compra com crédito registrada com sucesso", {
                numeroCartao: dados.numeroCartao,
                estabelecimento: dados.estabelecimento,
                valor: dados.valor
            });

            return {
                mensagem: "Compra registrada com sucesso",
                dados: {
                    numeroCartao: dados.numeroCartao,
                    estabelecimento: dados.estabelecimento,
                    valor: dados.valor,
                    limiteDisponivel: cartao.limite - dados.valor,
                    data: new Date()
                }
            };

        } catch (error) {
            LoggerService.error("Erro ao registrar compra com crédito", error);
            throw error;
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
