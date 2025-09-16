import { AppDataSource } from "../database/data-source";
import { Investment, TipoInvestimento, StatusInvestimento } from "../entities/Investment";
import { UsuarioConta } from "../entities/UsuarioConta";
import { LoggerService } from "./LoggerService";
import { UsuarioContaService } from "./UsuarioContaService";

export class InvestmentService {
    private static get repository() { return AppDataSource.getRepository(Investment); }
    private static get usuarioRepository() { return AppDataSource.getRepository(UsuarioConta); }

    static async obterResumoInvestimentos(usuarioId: string) {
        try {
            const investimentos = await this.repository.find({
                where: { usuarioConta: { id: usuarioId } },
                relations: ["usuarioConta"]
            });

            const totalInvestido = investimentos.reduce((total, inv) => total + inv.valorInvestido, 0);
            const totalAtual = investimentos.reduce((total, inv) => total + inv.valorAtual, 0);
            const rendimentoTotal = totalAtual - totalInvestido;
            const rentabilidadeMedia = totalInvestido > 0 ? (rendimentoTotal / totalInvestido) * 100 : 0;

            const investimentosPorTipo = investimentos.reduce((acc, inv) => {
                if (!acc[inv.tipo]) {
                    acc[inv.tipo] = {
                        quantidade: 0,
                        valorInvestido: 0,
                        valorAtual: 0
                    };
                }
                acc[inv.tipo].quantidade++;
                acc[inv.tipo].valorInvestido += inv.valorInvestido;
                acc[inv.tipo].valorAtual += inv.valorAtual;
                return acc;
            }, {} as any);

            return {
                totalInvestido,
                totalAtual,
                rendimentoTotal,
                rentabilidadeMedia,
                quantidadeInvestimentos: investimentos.length,
                investimentosPorTipo
            };
        } catch (error) {
            LoggerService.error("Erro ao obter resumo de investimentos", error);
            throw error;
        }
    }

    static async listarInvestimentos(usuarioId: string) {
        try {
            const investimentos = await this.repository.find({
                where: { usuarioConta: { id: usuarioId } },
                relations: ["usuarioConta"],
                order: { dataCriacao: "DESC" }
            });

            return investimentos.map(inv => ({
                id: inv.id,
                tipo: inv.tipo,
                nome: inv.nome,
                valorInvestido: inv.valorInvestido,
                valorAtual: inv.valorAtual,
                rentabilidade: inv.rentabilidade,
                status: inv.status,
                dataVencimento: inv.dataVencimento,
                dataCriacao: inv.dataCriacao
            }));
        } catch (error) {
            LoggerService.error("Erro ao listar investimentos", error);
            throw error;
        }
    }

    static async simularInvestimento(tipo: TipoInvestimento, valor: number, prazo?: number) {
        try {
            let rentabilidadeAnual = 0;
            let risco = "";
            let liquidez = "";

            switch (tipo) {
                case TipoInvestimento.POUPANCA:
                    rentabilidadeAnual = 6.17; // Taxa SELIC aproximada
                    risco = "Baixo";
                    liquidez = "Imediata";
                    break;
                case TipoInvestimento.CDB:
                    rentabilidadeAnual = 12.5;
                    risco = "Baixo";
                    liquidez = "No vencimento";
                    break;
                case TipoInvestimento.LCI:
                    rentabilidadeAnual = 10.8;
                    risco = "Baixo";
                    liquidez = "No vencimento";
                    break;
                case TipoInvestimento.LCA:
                    rentabilidadeAnual = 10.5;
                    risco = "Baixo";
                    liquidez = "No vencimento";
                    break;
                case TipoInvestimento.TESOURO_DIRETO:
                    rentabilidadeAnual = 11.2;
                    risco = "Baixo";
                    liquidez = "D+1";
                    break;
                case TipoInvestimento.FUNDO_RENDA_FIXA:
                    rentabilidadeAnual = 9.8;
                    risco = "Baixo a Médio";
                    liquidez = "D+1";
                    break;
                case TipoInvestimento.FUNDO_MULTIMERCADO:
                    rentabilidadeAnual = 14.2;
                    risco = "Médio";
                    liquidez = "D+30";
                    break;

                default:
                    rentabilidadeAnual = 8.0;
                    risco = "Médio";
                    liquidez = "Variável";
            }

            const prazoMeses = prazo || 12;
            const rentabilidadeMensal = rentabilidadeAnual / 12 / 100;
            const valorFinal = valor * Math.pow(1 + rentabilidadeMensal, prazoMeses);
            const rendimento = valorFinal - valor;

            return {
                tipo,
                valorInicial: valor,
                prazoMeses,
                rentabilidadeAnual,
                valorFinal,
                rendimento,
                risco,
                liquidez
            };
        } catch (error) {
            LoggerService.error("Erro ao simular investimento", error);
            throw error;
        }
    }

    static async aplicarInvestimento(usuarioId: string, dados: {
        tipo: TipoInvestimento;
        nome: string;
        valor: number;
        prazo?: number;
    }) {
        try {
            const usuario = await this.usuarioRepository.findOne({
                where: { id: usuarioId }
            });

            if (!usuario) {
                throw new Error("Usuário não encontrado");
            }

            if (usuario.saldo < dados.valor) {
                throw new Error("Saldo insuficiente");
            }

            // Debitar valor da conta
            await UsuarioContaService.atualizarSaldo(usuarioId, -dados.valor);

            // Criar investimento
            const dataVencimento = dados.prazo ? 
                new Date(Date.now() + dados.prazo * 30 * 24 * 60 * 60 * 1000) : 
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default 1 ano

            const investimento = this.repository.create({
                tipo: dados.tipo,
                nome: dados.nome,
                valorInvestido: dados.valor,
                valorAtual: dados.valor,
                rentabilidade: 0,
                taxaRendimento: 0,
                status: StatusInvestimento.ATIVO,
                permiteResgate: true,
                dataVencimento,
                usuarioConta: usuario
            });

            await this.repository.save(investimento);

            LoggerService.info("Investimento aplicado", {
                usuarioId,
                tipo: dados.tipo,
                valor: dados.valor
            });

            return investimento;
        } catch (error) {
            LoggerService.error("Erro ao aplicar investimento", error);
            throw error;
        }
    }

    static async resgatarInvestimento(usuarioId: string, investimentoId: string) {
        try {
            const investimento = await this.repository.findOne({
                where: { 
                    id: investimentoId,
                    usuarioConta: { id: usuarioId }
                },
                relations: ["usuarioConta"]
            });

            if (!investimento) {
                throw new Error("Investimento não encontrado");
            }

            if (investimento.status !== StatusInvestimento.ATIVO) {
                throw new Error("Investimento não está ativo");
            }

            // Verificar se pode resgatar (liquidez)
            const hoje = new Date();
            if (investimento.dataVencimento && hoje < investimento.dataVencimento) {
                if (investimento.tipo === TipoInvestimento.CDB || 
                    investimento.tipo === TipoInvestimento.LCI || 
                    investimento.tipo === TipoInvestimento.LCA) {
                    throw new Error("Investimento não pode ser resgatado antes do vencimento");
                }
            }

            // Creditar valor na conta
            await UsuarioContaService.atualizarSaldo(usuarioId, investimento.valorAtual);

            // Marcar como resgatado
            investimento.status = StatusInvestimento.RESGATADO;
            await this.repository.save(investimento);

            LoggerService.info("Investimento resgatado", {
                usuarioId,
                investimentoId,
                valor: investimento.valorAtual
            });

            return {
                valorResgatado: investimento.valorAtual,
                rendimento: investimento.valorAtual - investimento.valorInvestido
            };
        } catch (error) {
            LoggerService.error("Erro ao resgatar investimento", error);
            throw error;
        }
    }

    static async consultarPoupanca(usuarioId: string) {
        try {
            const poupanca = await this.repository.findOne({
                where: { 
                    usuarioConta: { id: usuarioId },
                    tipo: TipoInvestimento.POUPANCA,
                    status: StatusInvestimento.ATIVO
                },
                relations: ["usuarioConta"]
            });

            if (!poupanca) {
                return {
                    saldo: 0,
                    rendimentoMes: 0,
                    rentabilidade: 0,
                    dataUltimoRendimento: null
                };
            }

            return {
                saldo: poupanca.valorAtual,
                rendimentoMes: poupanca.valorAtual - poupanca.valorInvestido,
                rentabilidade: poupanca.rentabilidade,
                dataUltimoRendimento: poupanca.dataAtualizacao
            };
        } catch (error) {
            LoggerService.error("Erro ao consultar poupança", error);
            throw error;
        }
    }
}