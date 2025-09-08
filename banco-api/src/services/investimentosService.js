const {
  Investimento,
  SimulacaoInvestimento,
  MovimentacaoInvestimento,
  criarInvestimento,
  simularInvestimento,
  obterInvestimentosPorUsuario,
  obterResumoInvestimentos,
  criarMovimentacaoInvestimento,
  obterHistoricoInvestimentos,
  calcularRendimento,
  obterTaxaRendimento
} = require('../models/investimentosModel');
const { obterContaPorUsuario, atualizarSaldoConta } = require('./contasService');
const { validarCPF } = require('../utils/validators');

class InvestimentosService {
  // Simular investimento
  async simularInvestimento(dadosSimulacao) {
    try {
      // Validações
      if (!dadosSimulacao.valorInvestimento || dadosSimulacao.valorInvestimento < 100) {
        throw new Error('Valor mínimo de investimento é R$ 100,00');
      }

      if (!dadosSimulacao.periodoMeses || dadosSimulacao.periodoMeses < 1 || dadosSimulacao.periodoMeses > 120) {
        throw new Error('Período deve ser entre 1 e 120 meses');
      }

      if (!dadosSimulacao.tipo) {
        throw new Error('Tipo de investimento é obrigatório');
      }

      const tiposValidos = ['CDB', 'LCI', 'LCA', 'TESOURO_DIRETO', 'FUNDO_MULTIMERCADO', 'POUPANCA_PROGRAMADA'];
      if (!tiposValidos.includes(dadosSimulacao.tipo)) {
        throw new Error('Tipo de investimento inválido');
      }

      // Obter taxa de rendimento
      const taxaAnual = obterTaxaRendimento(dadosSimulacao.tipo);
      const taxaMensal = taxaAnual / 12;

      // Calcular rendimento
      const resultado = calcularRendimento(
        dadosSimulacao.valorInvestimento,
        taxaMensal,
        dadosSimulacao.periodoMeses
      );

      // Salvar simulação
      const simulacao = await simularInvestimento({
        usuarioId: dadosSimulacao.usuarioId,
        tipo: dadosSimulacao.tipo,
        valorInvestimento: dadosSimulacao.valorInvestimento,
        periodoMeses: dadosSimulacao.periodoMeses
      });

      return {
        sucesso: true,
        dados: {
          id: simulacao.id,
          tipo: simulacao.tipo,
          valorInvestimento: simulacao.valorInvestimento,
          periodoMeses: simulacao.periodoMeses,
          taxaRendimento: taxaAnual,
          valorFinal: resultado.valorFinal,
          rendimentoBruto: resultado.rendimentoBruto,
          dataSimulacao: simulacao.dataSimulacao
        }
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  // Criar novo investimento
  async criarNovoInvestimento(dadosInvestimento) {
    try {
      // Validações
      if (!dadosInvestimento.valorInvestido || dadosInvestimento.valorInvestido < 100) {
        throw new Error('Valor mínimo de investimento é R$ 100,00');
      }

      if (!dadosInvestimento.periodoMeses || dadosInvestimento.periodoMeses < 1 || dadosInvestimento.periodoMeses > 120) {
        throw new Error('Período deve ser entre 1 e 120 meses');
      }

      if (!dadosInvestimento.tipo) {
        throw new Error('Tipo de investimento é obrigatório');
      }

      // Verificar se usuário tem saldo suficiente
      const conta = await obterContaPorUsuario(dadosInvestimento.usuarioId);
      if (!conta) {
        throw new Error('Conta não encontrada');
      }

      if (conta.saldo < dadosInvestimento.valorInvestido) {
        throw new Error('Saldo insuficiente para realizar o investimento');
      }

      // Validações específicas para poupança programada
      if (dadosInvestimento.tipo === 'POUPANCA_PROGRAMADA') {
        if (!dadosInvestimento.valorMensal || dadosInvestimento.valorMensal < 50) {
          throw new Error('Valor mensal mínimo para poupança programada é R$ 50,00');
        }
        if (!dadosInvestimento.diaDebito || dadosInvestimento.diaDebito < 1 || dadosInvestimento.diaDebito > 31) {
          throw new Error('Dia de débito deve ser entre 1 e 31');
        }
      }

      // Debitar valor da conta
      const resultadoDebito = await atualizarSaldoConta(
        dadosInvestimento.usuarioId,
        -dadosInvestimento.valorInvestido,
        'INVESTIMENTO',
        `Investimento ${dadosInvestimento.tipo} - ${dadosInvestimento.valorInvestido}`
      );

      if (!resultadoDebito.sucesso) {
        throw new Error('Erro ao debitar valor da conta: ' + resultadoDebito.erro);
      }

      // Criar investimento
      const investimento = await criarInvestimento(dadosInvestimento);

      // Criar movimentação de aplicação
      await criarMovimentacaoInvestimento({
        investimentoId: investimento.id,
        usuarioId: dadosInvestimento.usuarioId,
        tipo: 'APLICACAO',
        valor: dadosInvestimento.valorInvestido,
        descricao: `Aplicação em ${dadosInvestimento.tipo}`
      });

      return {
        sucesso: true,
        dados: {
          id: investimento.id,
          tipo: investimento.tipo,
          valorInvestido: investimento.valorInvestido,
          periodoMeses: investimento.periodoMeses,
          taxaRendimento: investimento.taxaRendimento,
          dataInvestimento: investimento.dataInvestimento,
          dataVencimento: investimento.dataVencimento,
          status: investimento.status,
          automatico: investimento.automatico,
          valorMensal: investimento.valorMensal,
          diaDebito: investimento.diaDebito
        }
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  // Listar investimentos do usuário
  async listarInvestimentos(usuarioId, filtros = {}) {
    try {
      const investimentos = await obterInvestimentosPorUsuario(usuarioId);
      
      let investimentosFiltrados = investimentos;
      
      // Aplicar filtros
      if (filtros.status) {
        investimentosFiltrados = investimentosFiltrados.filter(inv => inv.status === filtros.status);
      }
      
      if (filtros.tipo) {
        investimentosFiltrados = investimentosFiltrados.filter(inv => inv.tipo === filtros.tipo);
      }
      
      // Atualizar rendimentos dos investimentos ativos
      const investimentosAtualizados = investimentosFiltrados.map(investimento => {
        if (investimento.status === 'ATIVO') {
          const mesesDecorridos = this.calcularMesesDecorridos(investimento.dataInvestimento);
          const rendimentoAtual = this.calcularRendimentoAtual(
            investimento.valorInvestido,
            investimento.taxaRendimento,
            mesesDecorridos
          );
          
          return {
            ...investimento.toObject(),
            rendimentoAcumulado: rendimentoAtual.rendimentoBruto,
            valorAtual: rendimentoAtual.valorFinal,
            mesesDecorridos
          };
        }
        return investimento.toObject();
      });
      
      return {
        sucesso: true,
        dados: investimentosAtualizados
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  // Obter resumo de investimentos
  async obterResumo(usuarioId) {
    try {
      const resumo = await obterResumoInvestimentos(usuarioId);
      
      // Recalcular valores atuais
      const investimentos = await obterInvestimentosPorUsuario(usuarioId);
      const investimentosAtivos = investimentos.filter(inv => inv.status === 'ATIVO');
      
      let saldoTotalInvestido = 0;
      let rendimentoTotal = 0;
      let valorAtualTotal = 0;
      
      investimentosAtivos.forEach(investimento => {
        const mesesDecorridos = this.calcularMesesDecorridos(investimento.dataInvestimento);
        const rendimentoAtual = this.calcularRendimentoAtual(
          investimento.valorInvestido,
          investimento.taxaRendimento,
          mesesDecorridos
        );
        
        saldoTotalInvestido += investimento.valorInvestido;
        rendimentoTotal += rendimentoAtual.rendimentoBruto;
        valorAtualTotal += rendimentoAtual.valorFinal;
      });
      
      return {
        sucesso: true,
        dados: {
          saldoTotalInvestido: parseFloat(saldoTotalInvestido.toFixed(2)),
          rendimentoTotal: parseFloat(rendimentoTotal.toFixed(2)),
          valorAtualTotal: parseFloat(valorAtualTotal.toFixed(2)),
          quantidadeInvestimentos: investimentosAtivos.length
        }
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  // Resgatar investimento
  async resgatarInvestimento(investimentoId, usuarioId) {
    try {
      const investimento = await Investimento.findOne({ id: investimentoId, usuarioId });
      
      if (!investimento) {
        throw new Error('Investimento não encontrado');
      }
      
      if (investimento.status !== 'ATIVO') {
        throw new Error('Investimento não está ativo');
      }
      
      // Calcular valor atual do investimento
      const mesesDecorridos = this.calcularMesesDecorridos(investimento.dataInvestimento);
      const rendimentoAtual = this.calcularRendimentoAtual(
        investimento.valorInvestido,
        investimento.taxaRendimento,
        mesesDecorridos
      );
      
      // Verificar se há penalidade por resgate antecipado
      let valorResgate = rendimentoAtual.valorFinal;
      let penalidade = 0;
      
      if (new Date() < investimento.dataVencimento) {
        // Aplicar penalidade de 10% sobre o rendimento para resgate antecipado
        penalidade = rendimentoAtual.rendimentoBruto * 0.1;
        valorResgate = investimento.valorInvestido + (rendimentoAtual.rendimentoBruto - penalidade);
      }
      
      // Creditar valor na conta
      const resultadoCredito = await atualizarSaldoConta(
        usuarioId,
        valorResgate,
        'RESGATE_INVESTIMENTO',
        `Resgate investimento ${investimento.tipo} - ${investimento.id}`
      );
      
      if (!resultadoCredito.sucesso) {
        throw new Error('Erro ao creditar valor na conta: ' + resultadoCredito.erro);
      }
      
      // Atualizar status do investimento
      investimento.status = 'RESGATADO';
      investimento.valorAtual = valorResgate;
      investimento.rendimentoAcumulado = rendimentoAtual.rendimentoBruto - penalidade;
      await investimento.save();
      
      // Criar movimentação de resgate
      await criarMovimentacaoInvestimento({
        investimentoId: investimento.id,
        usuarioId,
        tipo: 'RESGATE',
        valor: valorResgate,
        descricao: `Resgate ${investimento.tipo}${penalidade > 0 ? ' (resgate antecipado)' : ''}`
      });
      
      return {
        sucesso: true,
        dados: {
          valorResgatado: valorResgate,
          rendimentoBruto: rendimentoAtual.rendimentoBruto,
          penalidade,
          valorLiquido: valorResgate,
          dataResgate: new Date()
        }
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  // Obter histórico de investimentos
  async obterHistorico(usuarioId, filtros = {}) {
    try {
      const historico = await obterHistoricoInvestimentos(usuarioId, filtros);
      
      return {
        sucesso: true,
        dados: historico
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  // Obter detalhes de um investimento específico
  async obterDetalhesInvestimento(investimentoId, usuarioId) {
    try {
      const investimento = await Investimento.findOne({ id: investimentoId, usuarioId });
      
      if (!investimento) {
        throw new Error('Investimento não encontrado');
      }
      
      // Calcular valores atuais se o investimento estiver ativo
      let dadosAtualizados = investimento.toObject();
      
      if (investimento.status === 'ATIVO') {
        const mesesDecorridos = this.calcularMesesDecorridos(investimento.dataInvestimento);
        const rendimentoAtual = this.calcularRendimentoAtual(
          investimento.valorInvestido,
          investimento.taxaRendimento,
          mesesDecorridos
        );
        
        dadosAtualizados.rendimentoAcumulado = rendimentoAtual.rendimentoBruto;
        dadosAtualizados.valorAtual = rendimentoAtual.valorFinal;
        dadosAtualizados.mesesDecorridos = mesesDecorridos;
        dadosAtualizados.diasParaVencimento = this.calcularDiasParaVencimento(investimento.dataVencimento);
      }
      
      // Obter histórico de movimentações do investimento
      const movimentacoes = await MovimentacaoInvestimento.find({ investimentoId })
        .sort({ data: -1 })
        .limit(10);
      
      return {
        sucesso: true,
        dados: {
          ...dadosAtualizados,
          movimentacoes
        }
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  // Processar aportes mensais (poupança programada)
  async processarAportesMensais() {
    try {
      const hoje = new Date();
      const diaAtual = hoje.getDate();
      
      // Buscar investimentos de poupança programada ativos
      const investimentosProgramados = await Investimento.find({
        tipo: 'POUPANCA_PROGRAMADA',
        status: 'ATIVO',
        automatico: true,
        diaDebito: diaAtual
      });
      
      const resultados = [];
      
      for (const investimento of investimentosProgramados) {
        try {
          // Verificar se usuário tem saldo suficiente
          const conta = await obterContaPorUsuario(investimento.usuarioId);
          
          if (conta && conta.saldo >= investimento.valorMensal) {
            // Debitar valor da conta
            const resultadoDebito = await atualizarSaldoConta(
              investimento.usuarioId,
              -investimento.valorMensal,
              'APORTE_INVESTIMENTO',
              `Aporte mensal poupança programada - ${investimento.id}`
            );
            
            if (resultadoDebito.sucesso) {
              // Atualizar valor investido
              investimento.valorInvestido += investimento.valorMensal;
              await investimento.save();
              
              // Criar movimentação
              await criarMovimentacaoInvestimento({
                investimentoId: investimento.id,
                usuarioId: investimento.usuarioId,
                tipo: 'APORTE_MENSAL',
                valor: investimento.valorMensal,
                descricao: 'Aporte mensal automático'
              });
              
              resultados.push({
                investimentoId: investimento.id,
                sucesso: true,
                valor: investimento.valorMensal
              });
            } else {
              resultados.push({
                investimentoId: investimento.id,
                sucesso: false,
                erro: 'Erro ao debitar conta'
              });
            }
          } else {
            resultados.push({
              investimentoId: investimento.id,
              sucesso: false,
              erro: 'Saldo insuficiente'
            });
          }
        } catch (error) {
          resultados.push({
            investimentoId: investimento.id,
            sucesso: false,
            erro: error.message
          });
        }
      }
      
      return {
        sucesso: true,
        dados: {
          processados: resultados.length,
          sucessos: resultados.filter(r => r.sucesso).length,
          falhas: resultados.filter(r => !r.sucesso).length,
          detalhes: resultados
        }
      };
    } catch (error) {
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  // Métodos auxiliares
  calcularMesesDecorridos(dataInvestimento) {
    const agora = new Date();
    const inicio = new Date(dataInvestimento);
    
    const anos = agora.getFullYear() - inicio.getFullYear();
    const meses = agora.getMonth() - inicio.getMonth();
    const dias = agora.getDate() - inicio.getDate();
    
    let totalMeses = anos * 12 + meses;
    
    // Se ainda não completou o mês, considerar proporcionalmente
    if (dias < 0) {
      totalMeses -= 1;
      const diasNoMes = new Date(agora.getFullYear(), agora.getMonth(), 0).getDate();
      const proporcao = (diasNoMes + dias) / diasNoMes;
      totalMeses += proporcao;
    } else if (dias > 0) {
      const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
      const proporcao = dias / diasNoMes;
      totalMeses += proporcao;
    }
    
    return Math.max(0, totalMeses);
  }

  calcularRendimentoAtual(valorInicial, taxaMensal, mesesDecorridos) {
    return calcularRendimento(valorInicial, taxaMensal, mesesDecorridos);
  }

  calcularDiasParaVencimento(dataVencimento) {
    const agora = new Date();
    const vencimento = new Date(dataVencimento);
    const diferenca = vencimento.getTime() - agora.getTime();
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  }
}

module.exports = new InvestimentosService();