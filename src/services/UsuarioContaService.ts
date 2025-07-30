// src/services/UsuarioContaService.ts
import { AppDataSource } from "../database/data-source";
import { UserRole, UsuarioConta } from "../entities/UsuarioConta";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { DuplicateCpfError } from "./errors/DuplicateCpfError";
import { FindOneOptions } from "typeorm";
import { CartaoService } from "./CartaoService";
import { BandeiraCartao, StatusCartao, TipoCartao, TitularidadeCartao } from "../entities/Cartao";
import { AuthenticationError } from "./errors/AuthenticationError";

const usuarioContaRepository = AppDataSource.getRepository(UsuarioConta);

// NOVO: Função auxiliar para gerar um número de conta único
const gerarNumeroConta = (): string => {
    const numero = Math.floor(1000000 + Math.random() * 9000000).toString();
    // Simples dígito verificador (soma dos dígitos módulo 10)
    const digito = numero.split('').reduce((acc, digit) => acc + parseInt(digit), 0) % 10;
    return `${numero.substring(0, 7)}-${digito}`;
};


// DTO para a resposta da consulta de contas
export interface IContaResumo {
    id: string;
    nomeCompleto: string;
    cpf: string;
    agencia: string; // Adicionado
    numeroConta: string; // Adicionado
    limiteCredito: number;
    contaAtiva: boolean;
    cartoesAtivos: number;
}

// Interface para criação de conta
interface IUsuarioContaData {
    nomeCompleto: string;
    cpf: string;
    senha: string;
    limiteCredito?: number;
    contaBloqueada?: boolean;
    limiteDebitoDiario?: number;
}

// Interface para os dados de login
interface ILoginData {
    cpf: string;
    senha: string;
}

// Interface para os dados de manutenção de conta
interface IManutencaoContaData {
    limiteCredito?: number;
    contaBloqueada?: boolean;
    limiteDebitoDiario?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "desenvolvimento_chave_secreta_padrao";

export class UsuarioContaService {
    // ALTERADO: Instanciamos o CartaoService aqui para ser usado
    private cartaoService = new CartaoService();

    /**
     * Cria um novo usuário.
     */
    async criar(data: IUsuarioContaData): Promise<Omit<UsuarioConta, "senha">> {
        const { nomeCompleto, cpf, senha } = data;

        const cpfExistente = await usuarioContaRepository.findOne({ where: { cpf } });
        if (cpfExistente) {
            throw new DuplicateCpfError();
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const novoUsuarioData: Partial<UsuarioConta> = {
            nomeCompleto,
            cpf,
            agencia: "0001",
            numeroConta: gerarNumeroConta(),
            senha: senhaHash,
            role: UserRole.ADMIN,
            limiteCredito: data.limiteCredito ?? 1000.00,
            contaBloqueada: data.contaBloqueada ?? false,
            limiteDebitoDiario: data.limiteDebitoDiario ?? 5000.00,
        };

        const usuarioConta = usuarioContaRepository.create(novoUsuarioData as UsuarioConta);
        await usuarioContaRepository.save(usuarioConta);

        usuarioConta.cartoes = [];

        await this.cartaoService.criarCartao(usuarioConta, {
            tipo: TipoCartao.DEBITO,
            titularidade: TitularidadeCartao.TITULAR,
            bandeira: BandeiraCartao.MASTERCARD,
        });

        // Recarrega a entidade para garantir que o cartão de débito esteja nela
        const usuarioComCartao = await this.buscarPorId(usuarioConta.id);

        // --- SUGESTÃO DE MELHORIA ---
        // Adiciona uma verificação para o caso (improvável) de o usuário não ser encontrado.
        // Isso torna o código mais robusto e elimina a necessidade do operador `!`.
        if (!usuarioComCartao) {
            // Lançar um erro aqui é apropriado, pois isso indicaria um estado inconsistente grave no sistema.
            throw new Error("Falha crítica: usuário recém-criado não foi encontrado no banco de dados.");
        }

        // Agora que a verificação foi feita, podemos remover o '!' com segurança.
        // @ts-ignore
        const { senha: _, ...usuarioSemSenha } = usuarioComCartao;
        return usuarioSemSenha;
    }


    // ... (método login permanece o mesmo)
    async login(data: ILoginData): Promise<string> {
        const { cpf, senha } = data;

        const usuario = await usuarioContaRepository.createQueryBuilder("user")
            .addSelect("user.senha")
            .addSelect("user.role")
            .where("user.cpf = :cpf", { cpf })
            .andWhere("user.ativo = :ativo", { ativo: true })
            .getOne();

        if (!usuario) {
            throw new AuthenticationError();
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            throw new AuthenticationError();
        }

        const payload = { id: usuario.id, role: usuario.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });

        return token;
    }

    // ... (método atualizarConta permanece o mesmo)
    async atualizarConta(id: string, data: IManutencaoContaData): Promise<Omit<UsuarioConta, "senha"> | null> {
        const conta = await this.buscarPorId(id);
        if (!conta) {
            return null;
        }

        if (data.limiteCredito !== undefined) {
            conta.limiteCredito = data.limiteCredito;
        }
        if (data.contaBloqueada !== undefined) {
            conta.contaBloqueada = data.contaBloqueada;
        }
        if (data.limiteDebitoDiario !== undefined) {
            conta.limiteDebitoDiario = data.limiteDebitoDiario;
        }

        await usuarioContaRepository.save(conta);
        return conta;
    }

    // ... (método desativarConta permanece o mesmo)
    async desativarConta(id: string): Promise<Omit<UsuarioConta, "senha"> | null> {
        const conta = await this.buscarPorId(id);
        if (!conta) {
            return null;
        }

        conta.ativo = false;
        conta.contaBloqueada = true;

        await usuarioContaRepository.save(conta);
        return conta;
    }

    /**
     * Busca todas as contas e retorna um resumo formatado.
     */
    async buscarTodosResumo(): Promise<IContaResumo[]> {
        const contas = await usuarioContaRepository.find({
            where: { ativo: true },
            relations: ["cartoes"],
        });

        // ALTERADO: Adiciona agencia e numeroConta ao resumo
        return contas.map(conta => ({
            id: conta.id,
            nomeCompleto: conta.nomeCompleto,
            cpf: conta.cpf,
            agencia: conta.agencia,
            numeroConta: conta.numeroConta,
            limiteCredito: conta.limiteCredito,
            contaAtiva: !conta.contaBloqueada,
            cartoesAtivos: conta.cartoes.filter(c => c.status === StatusCartao.ATIVO).length,
        }));
    }

    /**
     * Busca um usuário por ID (sem a senha).
     */
    async buscarPorId(id: string): Promise<Omit<UsuarioConta, "senha"> | null> {
        const options: FindOneOptions<UsuarioConta> = { where: { id, ativo: true }, relations: ["cartoes"] };
        return usuarioContaRepository.findOne(options);
    }

    /**
     * Busca um usuário por CPF.
     */
    async buscarPorCpf(cpf: string): Promise<UsuarioConta | null> {
        return usuarioContaRepository.findOne({
            where: { cpf, ativo: true },
            relations: ["cartoes"],
        });
    }
}