import { AppDataSource } from '../database/data-source';
import { CryptoInvestment, TipoCriptomoeda, StatusCriptoInvestimento } from '../entities/CryptoInvestment';
import { UsuarioConta } from '../entities/UsuarioConta';
import { Repository } from 'typeorm';

export class CryptoInvestmentService {
  private static cryptoRepository: Repository<CryptoInvestment> = AppDataSource.getRepository(CryptoInvestment);
  private static usuarioRepository: Repository<UsuarioConta> = AppDataSource.getRepository(UsuarioConta);

  // Preços simulados das criptomoedas (em produção seria uma API externa)
  private static precosCriptomoedas = {
    [TipoCriptomoeda.BITCOIN]: 250000.00, // R$ 250.000,00
    [TipoCriptomoeda.ETHEREUM]: 15000.00   // R$ 15.000,00
  };

  static async comprarCriptomoeda(
    usuarioId: string,
    tipoCriptomoeda: TipoCriptomoeda,
    valorInvestimento: number
  ): Promise<CryptoInvestment> {
    const usuario = await this.usuarioRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    if (usuario.saldo < valorInvestimento) {
      throw new Error('Saldo insuficiente para realizar a compra');
    }

    const precoUnitario = this.precosCriptomoedas[tipoCriptomoeda];
    const quantidade = valorInvestimento / precoUnitario;

    // Criar o investimento em cripto
    const cryptoInvestment = this.cryptoRepository.create({
      tipoCriptomoeda,
      quantidade,
      valorCompra: valorInvestimento,
      precoUnitarioCompra: precoUnitario,
      status: StatusCriptoInvestimento.ATIVO,
      usuarioConta: usuario
    });

    // Debitar do saldo do usuário
    usuario.saldo -= valorInvestimento;
    await this.usuarioRepository.save(usuario);

    return await this.cryptoRepository.save(cryptoInvestment);
  }

  static async venderCriptomoeda(
    usuarioId: string,
    investmentId: string,
    quantidade?: number
  ): Promise<CryptoInvestment> {
    const investment = await this.cryptoRepository.findOne({
      where: { id: investmentId },
      relations: ['usuarioConta']
    });

    if (!investment) {
      throw new Error('Investimento não encontrado');
    }

    if (investment.usuarioConta.id !== usuarioId) {
      throw new Error('Investimento não pertence ao usuário');
    }

    if (investment.status !== StatusCriptoInvestimento.ATIVO) {
      throw new Error('Investimento não está ativo');
    }

    const quantidadeVenda = quantidade || investment.quantidade;
    if (quantidadeVenda > investment.quantidade) {
      throw new Error('Quantidade de venda maior que a quantidade disponível');
    }

    const precoAtual = this.precosCriptomoedas[investment.tipoCriptomoeda];
    const valorVenda = quantidadeVenda * precoAtual;

    // Se vender tudo, marcar como vendido
    if (quantidadeVenda === investment.quantidade) {
      investment.status = StatusCriptoInvestimento.VENDIDO;
      investment.dataVenda = new Date();
      investment.precoUnitarioVenda = precoAtual;
      investment.valorVenda = valorVenda;
    } else {
      // Venda parcial - reduzir quantidade
      investment.quantidade -= quantidadeVenda;
    }

    // Creditar no saldo do usuário
    const usuario = investment.usuarioConta;
    usuario.saldo += valorVenda;
    await this.usuarioRepository.save(usuario);

    return await this.cryptoRepository.save(investment);
  }

  static async obterSaldoInvestimentos(usuarioId: string) {
    const investments = await this.cryptoRepository.find({
      where: {
        usuarioConta: { id: usuarioId },
        status: StatusCriptoInvestimento.ATIVO
      }
    });

    let valorTotalInvestido = 0;
    let valorTotalAtual = 0;
    const detalhes: any[] = [];

    for (const investment of investments) {
      const precoAtual = this.precosCriptomoedas[investment.tipoCriptomoeda];
      const valorAtual = investment.quantidade * precoAtual;
      const rentabilidade = ((valorAtual - investment.valorCompra) / investment.valorCompra) * 100;

      valorTotalInvestido += investment.valorCompra;
      valorTotalAtual += valorAtual;

      detalhes.push({
        id: investment.id,
        tipoCriptomoeda: investment.tipoCriptomoeda,
        quantidade: investment.quantidade,
        valorInvestido: investment.valorCompra,
        valorAtual,
        rentabilidade: rentabilidade.toFixed(2),
        precoUnitarioCompra: investment.precoUnitarioCompra,
        precoUnitarioAtual: precoAtual,
        dataCriacao: investment.dataCriacao
      });
    }

    const rentabilidadeTotal = valorTotalInvestido > 0 
      ? ((valorTotalAtual - valorTotalInvestido) / valorTotalInvestido) * 100 
      : 0;

    return {
      valorTotalInvestido,
      valorTotalAtual,
      rentabilidadeTotal: rentabilidadeTotal.toFixed(2),
      lucroOuPrejuizo: valorTotalAtual - valorTotalInvestido,
      investimentos: detalhes
    };
  }

  static async obterRendimentos(usuarioId: string) {
    const investmentsAtivos = await this.cryptoRepository.find({
      where: {
        usuarioConta: { id: usuarioId },
        status: StatusCriptoInvestimento.ATIVO
      }
    });

    const investmentsVendidos = await this.cryptoRepository.find({
      where: {
        usuarioConta: { id: usuarioId },
        status: StatusCriptoInvestimento.VENDIDO
      }
    });

    let rendimentoTotal = 0;
    let valorTotalInvestido = 0;
    const historico: any[] = [];

    // Calcular rendimentos dos investimentos ativos
    for (const investment of investmentsAtivos) {
      const precoAtual = this.precosCriptomoedas[investment.tipoCriptomoeda];
      const valorAtual = investment.quantidade * precoAtual;
      const rendimento = valorAtual - investment.valorCompra;
      
      rendimentoTotal += rendimento;
      valorTotalInvestido += investment.valorCompra;

      historico.push({
        id: investment.id,
        tipoCriptomoeda: investment.tipoCriptomoeda,
        status: 'ATIVO',
        valorInvestido: investment.valorCompra,
        valorAtual,
        rendimento,
        rentabilidade: ((rendimento / investment.valorCompra) * 100).toFixed(2),
        dataCriacao: investment.dataCriacao
      });
    }

    // Calcular rendimentos dos investimentos vendidos
    for (const investment of investmentsVendidos) {
      const rendimento = (investment.valorVenda || 0) - investment.valorCompra;
      
      rendimentoTotal += rendimento;
      valorTotalInvestido += investment.valorCompra;

      historico.push({
        id: investment.id,
        tipoCriptomoeda: investment.tipoCriptomoeda,
        status: 'VENDIDO',
        valorInvestido: investment.valorCompra,
        valorVenda: investment.valorVenda,
        rendimento,
        rentabilidade: ((rendimento / investment.valorCompra) * 100).toFixed(2),
        dataCriacao: investment.dataCriacao,
        dataVenda: investment.dataVenda
      });
    }

    const rentabilidadeMedia = valorTotalInvestido > 0 
      ? (rendimentoTotal / valorTotalInvestido) * 100 
      : 0;

    return {
      rendimentoTotal,
      valorTotalInvestido,
      rentabilidadeMedia: rentabilidadeMedia.toFixed(2),
      totalInvestimentos: investmentsAtivos.length + investmentsVendidos.length,
      investimentosAtivos: investmentsAtivos.length,
      investimentosVendidos: investmentsVendidos.length,
      historico
    };
  }

  static obterPrecosCriptomoedas() {
    return this.precosCriptomoedas;
  }
}