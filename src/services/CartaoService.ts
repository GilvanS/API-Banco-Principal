// src/services/CartaoService.ts
import { AppDataSource } from "../database/data-source";
import { Cartao, StatusCartao, TipoCartao, TitularidadeCartao, BandeiraCartao } from "../entities/Cartao";
import { UsuarioConta } from "../entities/UsuarioConta";
import { DuplicateCardError } from "./errors/DuplicateCardError";

// Funções auxiliares para gerar dados do cartão (simulação)
const gerarNumeroCartao = () => '5' + Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
const gerarCVV = () => Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join('');
const gerarDataValidade = () => {
    const data = new Date();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = String(data.getFullYear() + 5).slice(-2);
    return `${mes}/${ano}`;
};

// DTO para criação de cartão
export interface ICartaoData {
    tipo: TipoCartao;
    titularidade: TitularidadeCartao;
    bandeira: BandeiraCartao;
    limite?: number;
}

// NOVO: DTO para a solicitação de cartão de crédito
export interface ISolicitacaoCreditoData {
    bandeira: BandeiraCartao;
    limite: number;
    gerarAdicional?: boolean;
}

// NOVO: DTO para a resposta da solicitação
export interface ISolicitacaoCreditoResponse {
    titular: Cartao;
    adicional?: Cartao;
}

// DTO para atualização de cartão
export interface IAtualizarCartaoData {
    limite?: number;
    status?: StatusCartao;
}

export class CartaoService {
    private cartaoRepository = AppDataSource.getRepository(Cartao);

    // NOVO: Método orquestrador para a solicitação de crédito
    async solicitarCartaoDeCredito(conta: UsuarioConta, dadosSolicitacao: ISolicitacaoCreditoData): Promise<ISolicitacaoCreditoResponse> {
        // 1. Cria o cartão do titular
        const cartaoTitular = await this.criarCartao(conta, {
            tipo: TipoCartao.CREDITO,
            titularidade: TitularidadeCartao.TITULAR,
            bandeira: dadosSolicitacao.bandeira,
            limite: dadosSolicitacao.limite,
        });

        const response: ISolicitacaoCreditoResponse = { titular: cartaoTitular };

        // 2. Se solicitado, cria o cartão adicional
        if (dadosSolicitacao.gerarAdicional) {
            // Recarrega a conta para ter a lista de cartões atualizada
            const contaAtualizada = await AppDataSource.getRepository(UsuarioConta).findOneOrFail({
                where: { id: conta.id },
                relations: ["cartoes"]
            });

            const cartaoAdicional = await this.criarCartao(contaAtualizada, {
                tipo: TipoCartao.CREDITO,
                titularidade: TitularidadeCartao.ADICIONAL,
                bandeira: dadosSolicitacao.bandeira,
                limite: dadosSolicitacao.limite,
            }, true); // Passa flag para gerar número especial

            response.adicional = cartaoAdicional;
        }

        return response;
    }

    // Método interno para criar um cartão individual
    async criarCartao(conta: UsuarioConta, dadosCartao: ICartaoData, isAdicionalEspecial: boolean = false): Promise<Cartao> {
        // VERIFICAÇÃO: Garante que o cliente não possa ter dois cartões com a mesma bandeira e tipo.
        const cartaoExistente = conta.cartoes.find(
            cartao => cartao.bandeira === dadosCartao.bandeira && cartao.tipo === dadosCartao.tipo && cartao.titularidade === dadosCartao.titularidade
        );

        if (cartaoExistente) {
            throw new DuplicateCardError(`O cliente já possui um cartão de ${dadosCartao.tipo} (${dadosCartao.titularidade}) da bandeira ${dadosCartao.bandeira}.`);
        }

        // Lógica para o número do cartão especial
        const numeroDoCartao = isAdicionalEspecial
            ? gerarNumeroCartao().substring(0, 11) + "0000"
            : gerarNumeroCartao();

        const novoCartao = this.cartaoRepository.create({
            usuarioConta: conta,
            tipo: dadosCartao.tipo,
            titularidade: dadosCartao.titularidade,
            bandeira: dadosCartao.bandeira,
            numero: numeroDoCartao,
            cvv: gerarCVV(),
            dataValidade: gerarDataValidade(),
            status: StatusCartao.ATIVO,
            limite: dadosCartao.tipo === TipoCartao.CREDITO ? dadosCartao.limite : null,
        });

        await this.cartaoRepository.save(novoCartao);
        return novoCartao;
    }

    // ... (métodos atualizarCartao e excluirCartao permanecem os mesmos)
    async atualizarCartao(cartaoId: string, data: IAtualizarCartaoData): Promise<Cartao | null> {
        const cartao = await this.cartaoRepository.findOneBy({ id: cartaoId });
        if (!cartao) {
            return null;
        }

        // Atualiza o limite apenas se for um cartão de crédito
        if (data.limite !== undefined && cartao.tipo === TipoCartao.CREDITO) {
            cartao.limite = data.limite;
        }

        if (data.status !== undefined) {
            cartao.status = data.status;
        }

        await this.cartaoRepository.save(cartao);
        return cartao;
    }

    async excluirCartao(cartaoId: string): Promise<boolean> {
        const result = await this.cartaoRepository.delete(cartaoId);
        // Retorna true se uma linha foi afetada (excluída)
        return result.affected !== 0;
    }
}