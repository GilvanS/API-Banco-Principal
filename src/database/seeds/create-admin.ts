// src/database/seeds/create-admin.ts
import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { UsuarioConta, UserRole } from "../../entities/UsuarioConta";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config(); // Carrega as variáveis de ambiente

const createAdmin = async () => {
    try {
        console.log("Inicializando conexão com o banco de dados para o seed...");
        await AppDataSource.initialize();
        console.log("Conexão estabelecida.");

        const usuarioContaRepository = AppDataSource.getRepository(UsuarioConta);

        // Pega os dados do admin do .env ou usa valores padrão seguros
        const adminCpf = process.env.ADMIN_CPF || "00000000000";
        const adminPassword = process.env.ADMIN_PASSWORD || "AdminSenhaForte123";

        // 1. Verifica se o admin já existe
        const adminExists = await usuarioContaRepository.findOne({ where: { cpf: adminCpf } });

        if (adminExists) {
            console.log("Usuário admin já existe no banco de dados.");
            return;
        }

        console.log("Criando usuário admin...");

        // 2. Criptografa a senha
        const senhaHash = await bcrypt.hash(adminPassword, 10);

        // 3. Cria a entidade do admin
        const admin = usuarioContaRepository.create({
            nomeCompleto: "Administrador do Sistema",
            cpf: adminCpf,
            senha: senhaHash,
            role: UserRole.ADMIN, // Define o papel como ADMIN
            limiteCredito: 999999, // Limite alto para o admin
            contaBloqueada: false,
        });

        // 4. Salva no banco
        await usuarioContaRepository.save(admin);

        console.log("Usuário admin criado com sucesso!");

    } catch (error) {
        console.error("Erro ao executar o seed do admin:", error);
    } finally {
        // 5. Fecha a conexão com o banco
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log("Conexão com o banco de dados fechada.");
        }
    }
};

// Executa a função
createAdmin();