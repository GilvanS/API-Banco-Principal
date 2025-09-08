const mongoose = require('mongoose');

// Schema para Investimentos
const InvestimentoSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  usuarioId: {
    type: String,
    required: true,
    ref: 'UsuarioConta'
  },
  tipo: {
    type: String,
    required: true,
    enum: ['CDB', 'LCI', 'LCA', 'TESOURO_DIRETO', 'FUNDO_MULTIMERCADO', 'POUPANCA_PROGRAMADA'],
    default: 'CDB'
  },
  valorInvestido: {
    type: Number,
    required: true,
    min: 100 // Valor mínimo de R$ 100,00
  },
  periodoMeses: {
    type: Number,
    required: true,
    min: 1,
    max: 120 // Máximo 10 anos
  },
  taxaRendimento: {
    type: Number,
    required: true,
    min: 0
  },
  valorAtual: {
    type: Number,
    required: true,
    default: function() { return this.valorInvestido; }
  },
  rendimentoAcumulado: {
    type: Number,
    default: 0
  },
  dataInvestimento: {
    type: Date,
    required: true,
    default: Date.now
  },
  dataVencimento: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['ATIVO', 'VENCIDO', 'RESGATADO', 'CANCELADO'],
    default: 'ATIVO'
  },
  automatico: {
    type: Boolean,
    default: false
  },
  valorMensal: {
    type: Number,
    default: 0 // Para poupança programada
  },
  diaDebito: {
    type: Number,
    min: 1,
    max: 31,
    default: null // Para poupança programada
  },
  observacoes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true,
  collection: 'investimentos'
});

// Schema para Simulação de Investimentos
const SimulacaoInvestimentoSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  usuarioId: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['CDB', 'LCI', 'LCA', 'TESOURO_DIRETO', 'FUNDO_MULTIMERCADO', 'POUPANCA_PROGRAMADA']
  },
  valorInvestimento: {
    type: Number,
    required: true
  },
  periodoMeses: {
    type: Number,
    required: true
  },
  taxaRendimento: {
    type: Number,
    required: true
  },
  valorFinal: {
    type: Number,
    required: true
  },
  rendimentoBruto: {
    type: Number,
    required: true
  },
  dataSimulacao: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'simulacoes_investimento'
});

// Schema para Histórico de Movimentações de Investimentos
const MovimentacaoInvestimentoSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  investimentoId: {
    type: String,
    required: true,
    ref: 'Investimento'
  },
  usuarioId: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['APLICACAO', 'RESGATE', 'RENDIMENTO', 'APORTE_MENSAL']
  },
  valor: {
    type: Number,
    required: true
  },
  data: {
    type: Date,
    required: true,
    default: Date.now
  },
  descricao: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PROCESSANDO', 'CONCLUIDO', 'FALHADO'],
    default: 'CONCLUIDO'
  }
}, {
  timestamps: true,
  collection: 'movimentacoes_investimento'
});

// Modelos
const Investimento = mongoose.model('Investimento', InvestimentoSchema);
const SimulacaoInvestimento = mongoose.model('SimulacaoInvestimento', SimulacaoInvestimentoSchema);
const MovimentacaoInvestimento = mongoose.model('MovimentacaoInvestimento', MovimentacaoInvestimentoSchema);

// Funções auxiliares
const gerarIdInvestimento = () => {
  return 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

const gerarIdSimulacao = () => {
  return 'sim_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

const gerarIdMovimentacao = () => {
  return 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Função para calcular rendimento
const calcularRendimento = (valorInicial, taxaMensal, meses) => {
  const valorFinal = valorInicial * Math.pow(1 + (taxaMensal / 100), meses);
  const rendimentoBruto = valorFinal - valorInicial;
  return {
    valorFinal: parseFloat(valorFinal.toFixed(2)),
    rendimentoBruto: parseFloat(rendimentoBruto.toFixed(2))
  };
};

// Função para obter taxas de rendimento por tipo
const obterTaxaRendimento = (tipo) => {
  const taxas = {
    'CDB': 12.0, // 12% ao ano (1% ao mês)
    'LCI': 10.0, // 10% ao ano
    'LCA': 10.5, // 10.5% ao ano
    'TESOURO_DIRETO': 11.0, // 11% ao ano
    'FUNDO_MULTIMERCADO': 15.0, // 15% ao ano
    'POUPANCA_PROGRAMADA': 6.0 // 6% ao ano
  };
  return taxas[tipo] || 8.0;
};

// Função para criar novo investimento
const criarInvestimento = async (dadosInvestimento) => {
  try {
    const id = gerarIdInvestimento();
    const taxaAnual = obterTaxaRendimento(dadosInvestimento.tipo);
    const taxaMensal = taxaAnual / 12;
    
    const dataVencimento = new Date();
    dataVencimento.setMonth(dataVencimento.getMonth() + dadosInvestimento.periodoMeses);
    
    const novoInvestimento = new Investimento({
      id,
      usuarioId: dadosInvestimento.usuarioId,
      tipo: dadosInvestimento.tipo,
      valorInvestido: dadosInvestimento.valorInvestido,
      periodoMeses: dadosInvestimento.periodoMeses,
      taxaRendimento: taxaMensal,
      valorAtual: dadosInvestimento.valorInvestido,
      dataVencimento,
      automatico: dadosInvestimento.automatico || false,
      valorMensal: dadosInvestimento.valorMensal || 0,
      diaDebito: dadosInvestimento.diaDebito || null,
      observacoes: dadosInvestimento.observacoes || ''
    });
    
    await novoInvestimento.save();
    return novoInvestimento;
  } catch (error) {
    throw new Error('Erro ao criar investimento: ' + error.message);
  }
};

// Função para simular investimento
const simularInvestimento = async (dadosSimulacao) => {
  try {
    const id = gerarIdSimulacao();
    const taxaAnual = obterTaxaRendimento(dadosSimulacao.tipo);
    const taxaMensal = taxaAnual / 12;
    
    const resultado = calcularRendimento(
      dadosSimulacao.valorInvestimento,
      taxaMensal,
      dadosSimulacao.periodoMeses
    );
    
    const simulacao = new SimulacaoInvestimento({
      id,
      usuarioId: dadosSimulacao.usuarioId,
      tipo: dadosSimulacao.tipo,
      valorInvestimento: dadosSimulacao.valorInvestimento,
      periodoMeses: dadosSimulacao.periodoMeses,
      taxaRendimento: taxaMensal,
      valorFinal: resultado.valorFinal,
      rendimentoBruto: resultado.rendimentoBruto
    });
    
    await simulacao.save();
    return simulacao;
  } catch (error) {
    throw new Error('Erro ao simular investimento: ' + error.message);
  }
};

// Função para obter investimentos por usuário
const obterInvestimentosPorUsuario = async (usuarioId) => {
  try {
    return await Investimento.find({ usuarioId }).sort({ dataInvestimento: -1 });
  } catch (error) {
    throw new Error('Erro ao buscar investimentos: ' + error.message);
  }
};

// Função para obter resumo de investimentos
const obterResumoInvestimentos = async (usuarioId) => {
  try {
    const investimentos = await Investimento.find({ usuarioId, status: 'ATIVO' });
    
    const saldoTotalInvestido = investimentos.reduce((total, inv) => total + inv.valorInvestido, 0);
    const rendimentoTotal = investimentos.reduce((total, inv) => total + inv.rendimentoAcumulado, 0);
    const valorAtualTotal = investimentos.reduce((total, inv) => total + inv.valorAtual, 0);
    
    return {
      saldoTotalInvestido: parseFloat(saldoTotalInvestido.toFixed(2)),
      rendimentoTotal: parseFloat(rendimentoTotal.toFixed(2)),
      valorAtualTotal: parseFloat(valorAtualTotal.toFixed(2)),
      quantidadeInvestimentos: investimentos.length
    };
  } catch (error) {
    throw new Error('Erro ao obter resumo de investimentos: ' + error.message);
  }
};

// Função para criar movimentação de investimento
const criarMovimentacaoInvestimento = async (dadosMovimentacao) => {
  try {
    const id = gerarIdMovimentacao();
    
    const movimentacao = new MovimentacaoInvestimento({
      id,
      investimentoId: dadosMovimentacao.investimentoId,
      usuarioId: dadosMovimentacao.usuarioId,
      tipo: dadosMovimentacao.tipo,
      valor: dadosMovimentacao.valor,
      descricao: dadosMovimentacao.descricao,
      status: dadosMovimentacao.status || 'CONCLUIDO'
    });
    
    await movimentacao.save();
    return movimentacao;
  } catch (error) {
    throw new Error('Erro ao criar movimentação: ' + error.message);
  }
};

// Função para obter histórico de investimentos
const obterHistoricoInvestimentos = async (usuarioId, filtros = {}) => {
  try {
    let query = { usuarioId };
    
    if (filtros.dataInicio && filtros.dataFim) {
      query.data = {
        $gte: new Date(filtros.dataInicio),
        $lte: new Date(filtros.dataFim)
      };
    }
    
    if (filtros.tipo) {
      query.tipo = filtros.tipo;
    }
    
    return await MovimentacaoInvestimento.find(query)
      .sort({ data: -1 })
      .limit(filtros.limite || 50);
  } catch (error) {
    throw new Error('Erro ao obter histórico: ' + error.message);
  }
};

module.exports = {
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
};