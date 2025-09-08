import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UsuarioContaService } from '../services/UsuarioContaService';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../database/data-source';
import { Device, StatusDispositivo } from '../entities/Device';

const router = Router();
const deviceRepository = AppDataSource.getRepository(Device);

// PUT /api/settings/password - Alterar senha
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Nova senha e confirmação não coincidem' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' });
    }

    // Validar senha forte
    const senhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(newPassword);
    if (!senhaForte) {
      return res.status(400).json({ 
        error: 'Nova senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial' 
      });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha atual
    const senhaValida = await bcrypt.compare(currentPassword, usuario.senha);
    if (!senhaValida) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Criptografar nova senha
    const novaSenhaCriptografada = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await UsuarioContaService.atualizarSenha(userId, novaSenhaCriptografada);

    const response = {
      message: 'Senha alterada com sucesso',
      changedAt: new Date()
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/settings/notifications - Consultar configurações de notificação
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const response = {
      pushNotifications: usuario.notificacoesPush,
      emailNotifications: usuario.notificacoesEmail,
      smsNotifications: usuario.notificacoesSms,
      preferences: {
        transactions: true,
        security: true,
        marketing: false,
        statements: true
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar configurações de notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/settings/notifications - Atualizar configurações de notificação
router.put('/notifications', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { pushNotifications, emailNotifications, smsNotifications } = req.body;

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Atualizar configurações
    await UsuarioContaService.atualizarConfiguracoes(userId, {
      notificacoesPush: pushNotifications ?? usuario.notificacoesPush,
      notificacoesEmail: emailNotifications ?? usuario.notificacoesEmail,
      notificacoesSms: smsNotifications ?? usuario.notificacoesSms
    });

    const response = {
      pushNotifications: pushNotifications ?? usuario.notificacoesPush,
      emailNotifications: emailNotifications ?? usuario.notificacoesEmail,
      smsNotifications: smsNotifications ?? usuario.notificacoesSms,
      updatedAt: new Date(),
      message: 'Configurações de notificação atualizadas com sucesso'
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao atualizar configurações de notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/settings/devices - Listar dispositivos do usuário
router.get('/devices', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const devices = await deviceRepository.find({
      where: { usuarioConta: { id: userId } },
      order: { ultimoAcesso: 'DESC' }
    });

    const response = {
      devices: devices.map(device => ({
        id: device.id,
        name: device.nome,
        type: device.tipo,
        model: device.modelo,
        operatingSystem: device.sistemaOperacional,
        status: device.status,
        isTrusted: device.isConfiavel,
        lastAccess: device.ultimoAcesso,
        lastIp: device.ultimoIp,
        registeredAt: device.dataCriacao
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao listar dispositivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/settings/devices/register - Registrar novo dispositivo
router.post('/devices/register', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { name, type, deviceId, model, operatingSystem } = req.body;
    const userAgent = req.headers['user-agent'];
    const clientIp = req.ip || req.connection.remoteAddress;

    // Validações
    if (!name || !type || !deviceId) {
      return res.status(400).json({ error: 'Nome, tipo e ID do dispositivo são obrigatórios' });
    }

    const usuario = await UsuarioContaService.buscarPorId(userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se dispositivo já existe
    const deviceExistente = await deviceRepository.findOne({
      where: { deviceId, usuarioConta: { id: userId } }
    });

    if (deviceExistente) {
      return res.status(400).json({ error: 'Dispositivo já registrado' });
    }

    // Criar novo dispositivo
    const novoDevice = deviceRepository.create({
      nome: name,
      tipo: type,
      deviceId,
      modelo: model,
      sistemaOperacional: operatingSystem,
      status: StatusDispositivo.ATIVO,
      isConfiavel: false,
      ultimoAcesso: new Date(),
      ultimoIp: clientIp,
      userAgent,
      usuarioConta: usuario
    });

    await deviceRepository.save(novoDevice);

    const response = {
      deviceId: novoDevice.id,
      name: novoDevice.nome,
      type: novoDevice.tipo,
      status: novoDevice.status,
      isTrusted: novoDevice.isConfiavel,
      registeredAt: novoDevice.dataCriacao,
      message: 'Dispositivo registrado com sucesso'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Erro ao registrar dispositivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/settings/devices/:deviceId/trust - Marcar dispositivo como confiável
router.put('/devices/:deviceId/trust', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { deviceId } = req.params;
    const { trusted } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const device = await deviceRepository.findOne({
      where: { id: deviceId, usuarioConta: { id: userId } }
    });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    // Atualizar status de confiança
    device.isConfiavel = trusted ?? !device.isConfiavel;
    await deviceRepository.save(device);

    const response = {
      deviceId,
      isTrusted: device.isConfiavel,
      updatedAt: new Date(),
      message: `Dispositivo ${device.isConfiavel ? 'marcado como confiável' : 'removido dos confiáveis'}`
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao atualizar confiança do dispositivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/settings/devices/:deviceId - Remover dispositivo
router.delete('/devices/:deviceId', authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { deviceId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const device = await deviceRepository.findOne({
      where: { id: deviceId, usuarioConta: { id: userId } }
    });

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    // Remover dispositivo
    await deviceRepository.remove(device);

    const response = {
      deviceId,
      message: 'Dispositivo removido com sucesso',
      removedAt: new Date()
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao remover dispositivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;