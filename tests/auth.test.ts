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
});