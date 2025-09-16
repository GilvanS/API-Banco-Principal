import { AppDataSource } from "../database/data-source";
import { Movimentacao, TipoMovimentacao } from "../entities/Movimentacao";
import { UsuarioConta } from "../entities/UsuarioConta";
import { LoggerService } from "./LoggerService";
import { UsuarioContaService } from "./UsuarioContaService";

export class MovimentacaoService {
    private static get repository() { return AppDataSource.getRepository(Movimentacao); }
    private static get usuarioRepository() { return AppDataSource.getRepository(UsuarioConta); }

    static async criarMovimentacao(dados: {
        usuarioId: string;
        tipo: TipoMovimentacao;
        valor: number;
        descricao?: string;
        nomeDestinatario?: string;
        chavePix?: string;
        taxa?: number;
        observacoes?: string;
    }) {
        try {
            const usuario = await this.usuarioRepository.findOne({
                where: { id: dados.usuarioId }
            });

            if (!usuario) {
                throw new Error("Usuário não encontrado");
            }

            const movimentacao = this.repository.create({
                usuarioConta: usuario,
                tipo: dados.tipo,
                valor: dados.valor,
                descricao: dados.descricao || this.gerarDescricaoPadrao(dados.tipo),
                nomeDestinatario: dados.nomeDestinatario,
                chavePix: dados.chavePix,
                status: 'CONCLUIDA',
                taxa: dados.taxa || 0,
                observacoes: dados.observacoes
            });

            await this.repository.save(movimentacao);

            LoggerService.info("Movimentação criada", {
                usuarioId: dados.usuarioId,
                tipo: dados.tipo,
                valor: dados.valor
            });

            return movimentacao;
        } catch (error) {
            LoggerService.error("Erro ao criar movimentação", error);
            throw error;
        }
    }

    static async depositar(usuarioId: string, valor: number, descricao?: string) {
        try {
            if (valor <= 0) {
                throw new Error("Valor deve ser maior que zero");
            }

            // Atualizar saldo
            await UsuarioContaService.atualizarSaldo(usuarioId, valor);

            // Criar movimentação
            const movimentacao = await this.criarMovimentacao({
                usuarioId,
                tipo: TipoMovimentacao.DEPOSITO,
                valor,
                descricao: descricao || "Depósito em conta"
            });

            return movimentacao;
        } catch (error) {
            LoggerService.error("Erro ao realizar depósito", error);
            throw error;
        }
    }

    static async sacar(usuarioId: string, valor: number, descricao?: string) {
        try {
            if (valor <= 0) {
                throw new Error("Valor deve ser maior que zero");
            }

            const usuario = await this.usuarioRepository.findOne({
                where: { id: usuarioId }
            });

            if (!usuario) {
                throw new Error("Usuário não encontrado");
            }

            const saldoDisponivel = usuario.saldo + usuario.limiteCredito - usuario.creditoUtilizado;
            if (valor > saldoDisponivel) {
                throw new Error("Saldo insuficiente");
            }

            // Verificar limite diário
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const amanha = new Date(hoje);
            amanha.setDate(amanha.getDate() + 1);

            const saquesHoje = await this.repository.sum("valor", {
                usuarioConta: { id: usuarioId },
                tipo: TipoMovimentacao.SAQUE,
                dataCriacao: {
                    gte: hoje,
                    lt: amanha
                } as any
            });

            if ((saquesHoje || 0) + valor > usuario.limiteDebitoDiario) {
                throw new Error("Limite diário de saque excedido");
            }

            // Atualizar saldo
            await UsuarioContaService.atualizarSaldo(usuarioId, -valor);

            // Criar movimentação
            const movimentacao = await this.criarMovimentacao({
                usuarioId,
                tipo: TipoMovimentacao.SAQUE,
                valor,
                descricao: descricao || "Saque em conta"
            });

            return movimentacao;
        } catch (error) {
            LoggerService.error("Erro ao realizar saque", error);
            throw error;
        }
    }

    static async transferir(dados: {
        usuarioOrigemId: string;
        usuarioDestinoId: string;
        valor: number;
        descricao?: string;
    }) {
        try {
            if (dados.valor <= 0) {
                throw new Error("Valor deve ser maior que zero");
            }

            const usuarioOrigem = await this.usuarioRepository.findOne({
                where: { id: dados.usuarioOrigemId }
            });

            const usuarioDestino = await this.usuarioRepository.findOne({
                where: { id: dados.usuarioDestinoId }
            });

            if (!usuarioOrigem) {
                throw new Error("Usuário de origem não encontrado");
            }

            if (!usuarioDestino) {
                throw new Error("Usuário de destino não encontrado");
            }

            const saldoDisponivel = usuarioOrigem.saldo + usuarioOrigem.limiteCredito - usuarioOrigem.creditoUtilizado;
            if (dados.valor > saldoDisponivel) {
                throw new Error("Saldo insuficiente");
            }

            // Debitar da origem
            await UsuarioContaService.atualizarSaldo(dados.usuarioOrigemId, -dados.valor);

            // Creditar no destino
            await UsuarioContaService.atualizarSaldo(dados.usuarioDestinoId, dados.valor);

            // Criar movimentação de débito
            const movimentacaoDebito = await this.criarMovimentacao({
                usuarioId: dados.usuarioOrigemId,
                tipo: TipoMovimentacao.TRANSFERENCIA_ENVIADA,
                valor: dados.valor,
                descricao: dados.descricao || `Transferência para ${usuarioDestino.nomeCompleto}`,
                nomeDestinatario: usuarioDestino.nomeCompleto
            });

            // Criar movimentação de crédito
            const movimentacaoCredito = await this.criarMovimentacao({
                usuarioId: dados.usuarioDestinoId,
                tipo: TipoMovimentacao.TRANSFERENCIA_RECEBIDA,
                valor: dados.valor,
                descricao: dados.descricao || `Transferência de ${usuarioOrigem.nomeCompleto}`,
                nomeDestinatario: usuarioOrigem.nomeCompleto
            });

            return {
                movimentacaoDebito,
                movimentacaoCredito
            };
        } catch (error) {
            LoggerService.error("Erro ao realizar transferência", error);
            throw error;
        }
    }

    static async pix(dados: {
        usuarioId: string;
        chavePix: string;
        valor: number;
        descricao?: string;
        nomeDestinatario?: string;
    }) {
        try {
            if (dados.valor <= 0) {
                throw new Error("Valor deve ser maior que zero");
            }

            const usuario = await this.usuarioRepository.findOne({
                where: { id: dados.usuarioId }
            });

            if (!usuario) {
                throw new Error("Usuário não encontrado");
            }

            const saldoDisponivel = usuario.saldo + usuario.limiteCredito - usuario.creditoUtilizado;
            if (dados.valor > saldoDisponivel) {
                throw new Error("Saldo insuficiente");
            }

            // Atualizar saldo
            await UsuarioContaService.atualizarSaldo(dados.usuarioId, -dados.valor);

            // Criar movimentação
            const movimentacao = await this.criarMovimentacao({
                usuarioId: dados.usuarioId,
                tipo: TipoMovimentacao.PIX_ENVIADO,
                valor: dados.valor,
                descricao: dados.descricao || "PIX enviado",
                chavePix: dados.chavePix,
                nomeDestinatario: dados.nomeDestinatario
            });

            return movimentacao;
        } catch (error) {
            LoggerService.error("Erro ao realizar PIX", error);
            throw error;
        }
    }

    static async obterExtrato(usuarioId: string, filtros?: {
        dataInicio?: Date;
        dataFim?: Date;
        tipo?: TipoMovimentacao;
        limite?: number;
        pagina?: number;
    }) {
        try {
            const queryBuilder = this.repository.createQueryBuilder("movimentacao")
                .leftJoinAndSelect("movimentacao.usuarioConta", "usuarioConta")
                .where("usuarioConta.id = :usuarioId", { usuarioId })
                .orderBy("movimentacao.dataCriacao", "DESC");

            if (filtros?.dataInicio) {
                queryBuilder.andWhere("movimentacao.dataCriacao >= :dataInicio", {
                    dataInicio: filtros.dataInicio
                });
            }

            if (filtros?.dataFim) {
                queryBuilder.andWhere("movimentacao.dataCriacao <= :dataFim", {
                    dataFim: filtros.dataFim
                });
            }

            if (filtros?.tipo) {
                queryBuilder.andWhere("movimentacao.tipo = :tipo", {
                    tipo: filtros.tipo
                });
            }

            const limite = filtros?.limite || 50;
            const pagina = filtros?.pagina || 1;
            const offset = (pagina - 1) * limite;

            queryBuilder.limit(limite).offset(offset);

            const [movimentacoes, total] = await queryBuilder.getManyAndCount();

            return {
                movimentacoes: movimentacoes.map(mov => ({
                    id: mov.id,
                    tipo: mov.tipo,
                    valor: mov.valor,
                    descricao: mov.descricao,
                    nomeDestinatario: mov.nomeDestinatario,
                    chavePix: mov.chavePix,
                    status: mov.status,
                    taxa: mov.taxa,
                    observacoes: mov.observacoes,
                    dataCriacao: mov.dataCriacao
                })),
                total,
                pagina,
                totalPaginas: Math.ceil(total / limite)
            };
        } catch (error) {
            LoggerService.error("Erro ao obter extrato", error);
            throw error;
        }
    }

    private static gerarDescricaoPadrao(tipo: TipoMovimentacao): string {
        const descricoes = {
            [TipoMovimentacao.DEPOSITO]: "Depósito em conta",
            [TipoMovimentacao.SAQUE]: "Saque em conta",
            [TipoMovimentacao.TRANSFERENCIA]: "Transferência",
            [TipoMovimentacao.TRANSFERENCIA_ENVIADA]: "Transferência enviada",
            [TipoMovimentacao.TRANSFERENCIA_RECEBIDA]: "Transferência recebida",
            [TipoMovimentacao.PIX]: "PIX",
            [TipoMovimentacao.PIX_ENVIADO]: "PIX enviado",
            [TipoMovimentacao.PIX_RECEBIDO]: "PIX recebido",
            [TipoMovimentacao.PAGAMENTO_DEBITO]: "Pagamento com débito",
            [TipoMovimentacao.PAGAMENTO_CREDITO]: "Pagamento com crédito",
            [TipoMovimentacao.PAGAMENTO_CARTAO]: "Pagamento com cartão",
            [TipoMovimentacao.PAGAMENTO_FATURA]: "Pagamento de fatura",
            [TipoMovimentacao.INVESTIMENTO]: "Aplicação em investimento",
            [TipoMovimentacao.RESGATE_INVESTIMENTO]: "Resgate de investimento",
            [TipoMovimentacao.RENDIMENTO]: "Rendimento de investimento",
            [TipoMovimentacao.TAXA]: "Taxa bancária",
            [TipoMovimentacao.ESTORNO]: "Estorno"
        };

        return descricoes[tipo] || "Movimentação";
    }
}