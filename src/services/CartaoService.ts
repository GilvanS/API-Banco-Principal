// src/services/CartaoService.ts
import { AppDataSource } from "../database/data-source";
import { Cartao, StatusCartao, TipoCartao, TitularidadeCartao, BandeiraCartao } from "../entities/Cartao";
import { UsuarioConta } from "../entities/UsuarioConta";

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

// DTO para atualização de cartão
export interface IAtualizarCartaoData {
    limite?: number;
    status?: StatusCartao;
}

export class CartaoService {
    private cartaoRepository = AppDataSource.getRepository(Cartao);

    async criarCartao(conta: UsuarioConta, dadosCartao: ICartaoData): Promise<Cartao> {
        const novoCartao = this.cartaoRepository.create({
            usuarioConta: conta,
            tipo: dadosCartao.tipo,
            titularidade: dadosCartao.titularidade,
            bandeira: dadosCartao.bandeira,
            numero: gerarNumeroCartao(),
            cvv: gerarCVV(),
            dataValidade: gerarDataValidade(),
            status: StatusCartao.ATIVO,
            limite: dadosCartao.tipo === TipoCartao.CREDITO ? dadosCartao.limite : null,
        });

        await this.cartaoRepository.save(novoCartao);
        return novoCartao;
    }

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