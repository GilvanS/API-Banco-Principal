// src/services/UsuarioContaService.ts
import { AppDataSource } from "../database/data-source";
import { UserRole, UsuarioConta } from "../entities/UsuarioConta";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { DuplicateCpfError } from "./errors/DuplicateCpfError";
import { FindOneOptions } from "typeorm";

const usuarioContaRepository = AppDataSource.getRepository(UsuarioConta);

// Interface para criação de conta, agora com campos opcionais para o ADMIN
interface IUsuarioContaData {
    nomeCompleto: string;
    cpf: string;
    senha: string;
    role?: UserRole;
    limiteCredito?: number;
    contaBloqueada?: boolean;
}

// Interface para os dados de login
interface ILoginData {
    cpf: string;
    senha: string;
}

// Interface para os dados de manutenção de conta (usada pelo ADMIN)
interface IManutencaoContaData {
    limiteCredito?: number;
    contaBloqueada?: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || "desenvolvimento_chave_secreta_padrao";

export class UsuarioContaService {

    /**
     * Cria um novo usuário com base nos dados e no papel do criador.
     */
    async criar(data: IUsuarioContaData, criadorRole: UserRole): Promise<Omit<UsuarioConta, "senha">> {
        const { nomeCompleto, cpf, senha, role, limiteCredito, contaBloqueada } = data;

        const cpfExistente = await usuarioContaRepository.findOne({ where: { cpf } });
        if (cpfExistente) {
            throw new DuplicateCpfError();
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        let novoUsuarioData: Partial<UsuarioConta>;

        if (criadorRole === UserRole.ADMIN) {
            // ADMIN pode definir todos os campos
            novoUsuarioData = {
                nomeCompleto,
                cpf,
                senha: senhaHash,
                role: role || UserRole.OPERADOR, // Se não especificar, cria um OPERADOR
                limiteCredito: limiteCredito, // Usa o limite informado ou o default da entidade
                contaBloqueada: contaBloqueada === undefined ? false : contaBloqueada,
            };
        } else {
            // OPERADOR tem campos restritos e valores padrão
            novoUsuarioData = {
                nomeCompleto,
                cpf,
                senha: senhaHash,
                role: UserRole.OPERADOR, // Operador só pode criar outros operadores
                limiteCredito: 500.00, // Limite fixo inicial
                contaBloqueada: false, // Sempre desbloqueada no início
            };
        }

        const usuarioConta = usuarioContaRepository.create(novoUsuarioData as UsuarioConta);
        await usuarioContaRepository.save(usuarioConta);

        const { senha: _, ...usuarioSemSenha } = usuarioConta;
        return usuarioSemSenha;
    }

    /**
     * Realiza o login e retorna um token JWT com id e role.
     */
    async login(data: ILoginData): Promise<string | null> {
        const { cpf, senha } = data;

        const usuario = await usuarioContaRepository.createQueryBuilder("user")
            .addSelect("user.senha")
            .addSelect("user.role") // Importante: selecionar o role
            .where("user.cpf = :cpf", { cpf })
            .getOne();

        if (!usuario) {
            return null;
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return null;
        }

        // ATUALIZADO: Incluir o 'role' no payload do token
        const payload = { id: usuario.id, role: usuario.role };
        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: "1d"
        });

        return token;
    }

    /**
     * Atualiza dados de uma conta. Apenas para ADMINs.
     */
    async atualizarConta(id: string, data: IManutencaoContaData): Promise<UsuarioConta | null> {
        const conta = await this.buscarPorId(id);
        if (!conta) {
            return null;
        }

        // Atualiza apenas os campos fornecidos
        if (data.limiteCredito !== undefined) {
            conta.limiteCredito = data.limiteCredito;
        }
        if (data.contaBloqueada !== undefined) {
            conta.contaBloqueada = data.contaBloqueada;
        }

        await usuarioContaRepository.save(conta);
        return conta;
    }

    /**
     * Busca todos os usuários (sem a senha).
     */
    async buscarTodos(): Promise<Omit<UsuarioConta, "senha">[]> {
        return usuarioContaRepository.find();
    }

    /**
     * Busca um usuário por ID (sem a senha).
     */
    async buscarPorId(id: string): Promise<Omit<UsuarioConta, "senha"> | null> {
        const options: FindOneOptions<UsuarioConta> = { where: { id } };
        return usuarioContaRepository.findOne(options);
    }
}