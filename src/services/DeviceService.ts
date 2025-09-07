import { AppDataSource } from "../database/data-source";
import { Device, TipoDispositivo, StatusDispositivo } from "../entities/Device";
import { UsuarioConta } from "../entities/UsuarioConta";
import { LoggerService } from "./LoggerService";

export class DeviceService {
    private static repository = AppDataSource.getRepository(Device);
    private static usuarioRepository = AppDataSource.getRepository(UsuarioConta);

    static async listarDispositivos(usuarioId: string) {
        try {
            const dispositivos = await this.repository.find({
                where: { usuario: { id: usuarioId } },
                relations: ["usuario"]
            });

            return dispositivos.map(device => ({
                id: device.id,
                nome: device.nome,
                tipo: device.tipo,
                deviceId: device.deviceId,
                status: device.status,
                ultimoAcesso: device.ultimoAcesso,
                criadoEm: device.criadoEm
            }));
        } catch (error) {
            LoggerService.error("Erro ao listar dispositivos", error);
            throw error;
        }
    }

    static async registrarDispositivo(usuarioId: string, dados: {
        nome: string;
        tipo: TipoDispositivo;
        deviceId: string;
    }) {
        try {
            const usuario = await this.usuarioRepository.findOne({
                where: { id: usuarioId }
            });

            if (!usuario) {
                throw new Error("Usuário não encontrado");
            }

            // Verificar se o dispositivo já existe
            const dispositivoExistente = await this.repository.findOne({
                where: { deviceId: dados.deviceId }
            });

            if (dispositivoExistente) {
                // Atualizar último acesso
                dispositivoExistente.ultimoAcesso = new Date();
                await this.repository.save(dispositivoExistente);
                return dispositivoExistente;
            }

            const novoDispositivo = this.repository.create({
                nome: dados.nome,
                tipo: dados.tipo,
                deviceId: dados.deviceId,
                status: StatusDispositivo.ATIVO,
                usuario: usuario,
                ultimoAcesso: new Date()
            });

            await this.repository.save(novoDispositivo);

            LoggerService.info("Dispositivo registrado", {
                usuarioId,
                deviceId: dados.deviceId,
                tipo: dados.tipo
            });

            return novoDispositivo;
        } catch (error) {
            LoggerService.error("Erro ao registrar dispositivo", error);
            throw error;
        }
    }

    static async removerDispositivo(usuarioId: string, deviceId: string) {
        try {
            const dispositivo = await this.repository.findOne({
                where: { 
                    id: deviceId,
                    usuario: { id: usuarioId }
                },
                relations: ["usuario"]
            });

            if (!dispositivo) {
                throw new Error("Dispositivo não encontrado");
            }

            await this.repository.remove(dispositivo);

            LoggerService.info("Dispositivo removido", {
                usuarioId,
                deviceId
            });

            return { success: true };
        } catch (error) {
            LoggerService.error("Erro ao remover dispositivo", error);
            throw error;
        }
    }

    static async bloquearDispositivo(usuarioId: string, deviceId: string) {
        try {
            const dispositivo = await this.repository.findOne({
                where: { 
                    id: deviceId,
                    usuario: { id: usuarioId }
                },
                relations: ["usuario"]
            });

            if (!dispositivo) {
                throw new Error("Dispositivo não encontrado");
            }

            dispositivo.status = StatusDispositivo.BLOQUEADO;
            await this.repository.save(dispositivo);

            LoggerService.info("Dispositivo bloqueado", {
                usuarioId,
                deviceId
            });

            return dispositivo;
        } catch (error) {
            LoggerService.error("Erro ao bloquear dispositivo", error);
            throw error;
        }
    }

    static async desbloquearDispositivo(usuarioId: string, deviceId: string) {
        try {
            const dispositivo = await this.repository.findOne({
                where: { 
                    id: deviceId,
                    usuario: { id: usuarioId }
                },
                relations: ["usuario"]
            });

            if (!dispositivo) {
                throw new Error("Dispositivo não encontrado");
            }

            dispositivo.status = StatusDispositivo.ATIVO;
            await this.repository.save(dispositivo);

            LoggerService.info("Dispositivo desbloqueado", {
                usuarioId,
                deviceId
            });

            return dispositivo;
        } catch (error) {
            LoggerService.error("Erro ao desbloquear dispositivo", error);
            throw error;
        }
    }
}