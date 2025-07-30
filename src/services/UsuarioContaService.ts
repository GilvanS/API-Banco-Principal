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

// DTO para a resposta da consulta de contas
export interface IContaResumo {
    id: string;
    nomeCompleto: string;
    cpf: string;
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
            senha: senhaHash,
            role: UserRole.ADMIN, // Papel é sempre ADMIN
            limiteCredito: data.limiteCredito || 1000.00,
            contaBloqueada: data.contaBloqueada === undefined ? false : data.contaBloqueada,
            limiteDebitoDiario: data.limiteDebitoDiario || 5000.00,
        };

        const usuarioConta = usuarioContaRepository.create(novoUsuarioData as UsuarioConta);
        await usuarioContaRepository.save(usuarioConta);

        // Inicializa a propriedade 'cartoes' para evitar erros
        usuarioConta.cartoes = [];

        // Gera o cartão de débito padrão automaticamente
        await this.cartaoService.criarCartao(usuarioConta, {
            tipo: TipoCartao.DEBITO,
            titularidade: TitularidadeCartao.TITULAR,
            bandeira: BandeiraCartao.MASTERCARD, // Bandeira padrão para o débito
        });

        const { senha: _, ...usuarioSemSenha } = usuarioConta;
        return usuarioSemSenha;
    }

    /**
     * Realiza o login e retorna um token JWT.
     */
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

    /**
     * Atualiza dados de uma conta.
     */
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

    /**
     * Desativa uma conta de usuário (soft delete).
     */
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

        return contas.map(conta => ({
            id: conta.id,
            nomeCompleto: conta.nomeCompleto,
            cpf: conta.cpf,
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