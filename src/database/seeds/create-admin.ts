import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { UsuarioConta, UserRole } from "../../entities/UsuarioConta";
import bcrypt from "bcrypt";
import { LoggerService } from "../../services/LoggerService";

async function criarAdmin() {
    try {
        await AppDataSource.initialize();
        LoggerService.info("Conectando ao banco de dados...");

        const usuarioRepository = AppDataSource.getRepository(UsuarioConta);

        // Verificar se já existe um admin
        const adminExistente = await usuarioRepository.findOne({
            where: { cpf: "00000000000" }
        });

        if (adminExistente) {
            LoggerService.info("Admin já existe no sistema");
            return;
        }

        // Criar senha hash
        const senhaHash = await bcrypt.hash("AdminSenhaForte123", 10);

        // Criar admin
        const admin = usuarioRepository.create({
            nomeCompleto: "Administrador do Sistema",
            cpf: "00000000000",
            senha: senhaHash,
            numeroConta: "00000001",
            agencia: "0001",
            role: UserRole.ADMIN,
            saldo: 10000.00,
            limiteCredito: 50000.00,
            ativo: true,
            contaBloqueada: false
        });

        await usuarioRepository.save(admin);

        LoggerService.info("Admin criado com sucesso!");
        LoggerService.info("CPF: 00000000000");
        LoggerService.info("Senha: AdminSenhaForte123");

        await AppDataSource.destroy();
    } catch (error) {
        LoggerService.error("Erro ao criar admin", error);
        process.exit(1);
    }
}

criarAdmin(); 