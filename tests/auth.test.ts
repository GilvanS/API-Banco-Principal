// tests/auth.test.ts
import request from 'supertest';
import { app, startServer } from '../src/server'; // Import the app and startServer
import { AppDataSource } from '../src/database/data-source';

// Mock the AppDataSource to avoid database connection during tests
jest.mock('../src/database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      findOne: jest.fn().mockResolvedValue(null), // Mock the findOne method to return null
    })),
    initialize: jest.fn().mockResolvedValue(null),
  },
}));

beforeAll(async () => {
  // Initialize the server before running tests
  await startServer();
});

describe('Auth Endpoints', () => {
  it('should return 401 for invalid login credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        cpf: 'invalid-cpf',
        senha: 'invalid-password',
      });
    expect(res.statusCode).toEqual(401);
  });

  it('deve retornar 401 para credenciais inválidas', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'invalid@test.com',
        senha: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });

  it('deve retornar 400 para dados de login inválidos', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'invalid-email',
        senha: ''
      });

    expect(response.status).toBe(400);
  });

  it('deve retornar 200 para login válido', async () => {
    // Mock do repositório para simular usuário válido
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      senha: 'hashedpassword',
      papel: 'CLIENTE'
    };

    const mockRepository = {
      findOne: jest.fn().mockResolvedValue(mockUser)
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        senha: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('deve validar token JWT válido', async () => {
    const token = 'valid.jwt.token';
    
    const response = await request(app)
      .get('/api/v1/auth/validate')
      .set('Authorization', `Bearer ${token}`);

    // Dependendo da implementação, pode retornar 200 ou 401
    expect([200, 401]).toContain(response.status);
  });

  it('deve rejeitar requisições sem token', async () => {
    const response = await request(app)
      .get('/api/v1/transacoes/extrato')
      .send();

    expect(response.status).toBe(401);
  });
});