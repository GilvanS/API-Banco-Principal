import request from 'supertest';
import { app } from '../src/server';
import jwt from 'jsonwebtoken';
import { UsuarioContaService } from '../src/services/UsuarioContaService';
import { TransacaoService } from '../src/services/TransacaoService';

// Mock do AppDataSource para evitar conexão com banco durante testes
jest.mock('../src/database/data-source', () => ({
  AppDataSource: {
    initialize: jest.fn(),
    getRepository: jest.fn(),
    isInitialized: true,
  },
}));

// Mock do LoggerService
jest.mock('../src/services/LoggerService', () => ({
  LoggerService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock de JWT para sempre validar o token nos testes
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token: string, secret: string, cb: any) => cb(null, { id: 'user-1', cpf: '12345678901' })),
})) as unknown as typeof jwt;

// Mocks dos serviços usados nos endpoints de PIX
jest.mock('../src/services/UsuarioContaService', () => ({
  UsuarioContaService: {
    buscarPorId: jest.fn(),
    buscarPorEmail: jest.fn(),
    atualizarEmail: jest.fn(),
  },
}));

jest.mock('../src/services/TransacaoService', () => ({
  TransacaoService: {
    transferirPIX: jest.fn(),
  },
}));

describe('PIX Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Chaves PIX (email)', () => {
    it('deve listar chaves PIX (cpf e email) do usuário autenticado', async () => {
      (UsuarioContaService.buscarPorId as jest.Mock).mockResolvedValue({
        id: 'user-1',
        cpf: '12345678901',
        email: 'user@example.com',
      });

      const response = await request(app)
        .get('/api/v1/account/pix/keys')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('keys');
      expect(Array.isArray(response.body.keys)).toBe(true);
      const types = response.body.keys.map((k: any) => k.type);
      expect(types).toContain('cpf');
      expect(types).toContain('email');
    });

    it('deve registrar chave PIX por e-mail com sucesso', async () => {
      (UsuarioContaService.buscarPorEmail as jest.Mock).mockResolvedValue(null);
      (UsuarioContaService.atualizarEmail as jest.Mock).mockResolvedValue(undefined);

      const payload = { email: 'novo@example.com' };
      const response = await request(app)
        .post('/api/v1/account/pix/keys/email')
        .set('Authorization', 'Bearer token')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ key: payload.email.toLowerCase(), type: 'email', status: 'ACTIVE' });
      expect(UsuarioContaService.atualizarEmail).toHaveBeenCalledWith('user-1', payload.email.toLowerCase());
    });

    it('deve retornar 400 para email inválido', async () => {
      const response = await request(app)
        .post('/api/v1/account/pix/keys/email')
        .set('Authorization', 'Bearer token')
        .send({ email: 'invalido' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve retornar 409 se email já estiver em uso por outra conta', async () => {
      (UsuarioContaService.buscarPorEmail as jest.Mock).mockResolvedValue({ id: 'outro-usuario' });

      const response = await request(app)
        .post('/api/v1/account/pix/keys/email')
        .set('Authorization', 'Bearer token')
        .send({ email: 'existente@example.com' });

      expect(response.status).toBe(409);
    });

    it('deve remover chave PIX por e-mail quando existir', async () => {
      (UsuarioContaService.buscarPorId as jest.Mock).mockResolvedValue({
        id: 'user-1',
        cpf: '12345678901',
        email: 'user@example.com',
      });
      (UsuarioContaService.atualizarEmail as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/v1/account/pix/keys/email')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ type: 'email', status: 'REMOVED' });
      expect(UsuarioContaService.atualizarEmail).toHaveBeenCalledWith('user-1', null);
    });

    it('deve retornar 404 ao remover chave PIX por e-mail inexistente', async () => {
      (UsuarioContaService.buscarPorId as jest.Mock).mockResolvedValue({ id: 'user-1', cpf: '12345678901', email: null });

      const response = await request(app)
        .delete('/api/v1/account/pix/keys/email')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(404);
    });
  });

  describe('Transferência PIX', () => {
    it('deve realizar PIX por e-mail com sucesso', async () => {
      (UsuarioContaService.buscarPorId as jest.Mock).mockResolvedValue({
        id: 'user-1',
        cpf: '12345678901',
        email: 'user@example.com',
        saldo: 1000,
        limiteCredito: 0,
      });
      (TransacaoService.transferirPIX as jest.Mock).mockResolvedValue({
        sucesso: true,
        dados: {
          movimentacaoId: 'mov-1',
          valor: 150,
          data: new Date().toISOString(),
        },
      });

      const response = await request(app)
        .post('/api/v1/transactions/pix')
        .set('Authorization', 'Bearer token')
        .send({ amount: 150, pixKey: 'dest@example.com', pixKeyType: 'email', description: 'Teste PIX' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('type', 'PIX');
      expect(response.body).toHaveProperty('amount', 150);
      expect(response.body).toHaveProperty('pixKeyType', 'email');
    });

    it('deve falhar quando valor do PIX for menor ou igual a zero', async () => {
      const response = await request(app)
        .post('/api/v1/transactions/pix')
        .set('Authorization', 'Bearer token')
        .send({ amount: 0, pixKey: 'dest@example.com', pixKeyType: 'email' });

      expect(response.status).toBe(400);
    });

    it('deve falhar por saldo insuficiente', async () => {
      (UsuarioContaService.buscarPorId as jest.Mock).mockResolvedValue({ id: 'user-1', cpf: '12345678901', saldo: 50, limiteCredito: 0 });

      const response = await request(app)
        .post('/api/v1/transactions/pix')
        .set('Authorization', 'Bearer token')
        .send({ amount: 200, pixKey: 'dest@example.com', pixKeyType: 'email' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Saldo insuficiente');
    });

    it('deve falhar quando pixKey ou pixKeyType estiverem ausentes', async () => {
      const response1 = await request(app)
        .post('/api/v1/transactions/pix')
        .set('Authorization', 'Bearer token')
        .send({ amount: 100, pixKeyType: 'email' });
      expect(response1.status).toBe(400);

      const response2 = await request(app)
        .post('/api/v1/transactions/pix')
        .set('Authorization', 'Bearer token')
        .send({ amount: 100, pixKey: 'dest@example.com' });
      expect(response2.status).toBe(400);
    });
  });
});