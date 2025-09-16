// tests/integration-flow.test.ts
import request from 'supertest';
import { app, startServer } from '../src/server';
import { AppDataSource } from '../src/database/data-source';
import { UsuarioConta } from '../src/entities/UsuarioConta';
import { Cartao } from '../src/entities/Cartao';
import { Investment } from '../src/entities/Investment';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock do banco de dados para testes
jest.mock('../src/database/data-source');
jest.mock('../src/services/LoggerService');

const mockUsuarioContaRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  find: jest.fn()
};

const mockCartaoRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  find: jest.fn()
};

const mockInvestmentRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  find: jest.fn()
};

(AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
  if (entity === UsuarioConta) return mockUsuarioContaRepository;
  if (entity === Cartao) return mockCartaoRepository;
  if (entity === Investment) return mockInvestmentRepository;
  return {};
});

(AppDataSource.initialize as jest.Mock).mockResolvedValue(null);

beforeAll(async () => {
  await startServer();
});

describe('Integration Flow Tests - Complete User Journey', () => {
  let createdUserId: string;
  let authToken: string;
  let userAccount: any;
  let userCard: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset test data
    createdUserId = 'integration-user-id';
    authToken = '';
  });

  describe('Complete Flow: Create User -> Login -> Transact -> Check Statement', () => {
    it('Step 1: Should create a new user account', async () => {
      const newUserData = {
        nomeCompleto: 'Maria Silva Santos',
        cpf: '98765432100',
        email: 'maria.santos@test.com',
        senha: 'MinhaSenh@123',
        telefone: '11987654321',
        endereco: {
          rua: 'Rua das Flores, 123',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234-567'
        }
      };

      // Mock para usuário não existente
      mockUsuarioContaRepository.findOne.mockResolvedValue(null);
      
      // Mock para criação do usuário
      const createdUser = {
        id: createdUserId,
        ...newUserData,
        agencia: '0001',
        numeroConta: '987654',
        saldo: 0.00,
        limiteDebitoDiario: 2000.00,
        limiteCreditoDiario: 5000.00,
        dataCriacao: new Date()
      };
      
      mockUsuarioContaRepository.create.mockReturnValue(createdUser);
      mockUsuarioContaRepository.save.mockResolvedValue(createdUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUserData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Usuário criado com sucesso');
      expect(res.body).toHaveProperty('usuario');
      expect(res.body.usuario).toHaveProperty('agencia');
      expect(res.body.usuario).toHaveProperty('numeroConta');
      
      // Salvar dados do usuário para próximos testes
      userAccount = createdUser;
    });

    it('Step 2: Should login with created user credentials', async () => {
      const loginData = {
        cpf: '98765432100',
        senha: 'MinhaSenh@123'
      };

      // Mock para encontrar o usuário
      const hashedPassword = await bcrypt.hash('MinhaSenh@123', 10);
      const userForLogin = {
        // valores padrão para execução isolada do Step 2
        id: createdUserId,
        nomeCompleto: 'Maria Silva Santos',
        cpf: loginData.cpf,
        agencia: '0001',
        numeroConta: '987654',
        ...(userAccount || {}),
        senha: hashedPassword
      };
      
      mockUsuarioContaRepository.findOne.mockResolvedValue(userForLogin);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('usuario');
      expect(res.body.usuario).toHaveProperty('nomeCompleto', 'Maria Silva Santos');
      
      // Salvar token para próximos testes
      authToken = res.body.token;
    });

    it('Step 3: Should request a credit card for the user', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      
      const cardRequest = {
        tipoCartao: 'CREDITO',
        limiteCredito: 3000.00
      };

      const createdCard = {
        id: 'card-integration-id',
        numeroCartao: '4532123456789012',
        tipoCartao: 'CREDITO',
        limiteCredito: 3000.00,
        creditoUtilizado: 0.00,
        status: 'ATIVO',
        dataCriacao: new Date()
      };
      
      mockCartaoRepository.create.mockReturnValue(createdCard);
      mockCartaoRepository.save.mockResolvedValue(createdCard);

      const res = await request(app)
        .post('/api/v1/cards/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cardRequest);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Cartão solicitado com sucesso');
      expect(res.body).toHaveProperty('cartao');
      expect(res.body.cartao).toHaveProperty('numeroCartao');
      
      // Salvar dados do cartão para próximos testes
      userCard = createdCard;
    });

    it('Step 4: Should perform multiple transactions', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue({
        ...userAccount,
        saldo: 1000.00 // Saldo inicial para transações
      });
      mockCartaoRepository.findOne.mockResolvedValue(userCard);

      // 4.1 - Depósito
      const depositRes = await request(app)
        .post('/api/v1/transactions/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500.00,
          description: 'Depósito inicial de integração'
        });

      expect(depositRes.status).toBe(201);
      expect(depositRes.body).toHaveProperty('type', 'DEPOSIT');
      expect(depositRes.body).toHaveProperty('amount', 500.00);

      // 4.2 - Transferência
      const transferRes = await request(app)
        .post('/api/v1/transactions/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200.00,
          destinationAccount: '123456',
          destinationAgency: '0002',
          destinationName: 'João Silva',
          description: 'Transferência de integração'
        });

      expect(transferRes.status).toBe(201);
      expect(transferRes.body).toHaveProperty('type', 'TRANSFER');
      expect(transferRes.body).toHaveProperty('amount', 200.00);

      // 4.3 - Compra no crédito
      const purchaseRes = await request(app)
        .post('/api/v1/transactions/credit-purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 150.00,
          merchant: 'Supermercado ABC',
          description: 'Compra de integração'
        });

      expect(purchaseRes.status).toBe(201);
      expect(purchaseRes.body).toHaveProperty('type', 'CREDIT_PURCHASE');
      expect(purchaseRes.body).toHaveProperty('amount', 150.00);

      // 4.4 - Pagamento de fatura
      const paymentRes = await request(app)
        .post('/api/v1/transactions/pay-bill')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 150.00,
          billType: 'CREDIT_CARD',
          description: 'Pagamento de fatura de integração'
        });

      expect(paymentRes.status).toBe(201);
      expect(paymentRes.body).toHaveProperty('type', 'BILL_PAYMENT');
      expect(paymentRes.body).toHaveProperty('amount', 150.00);
    });

    it('Step 5: Should check account statement after transactions', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue({
        // valores padrão para execução isolada
        id: createdUserId,
        nomeCompleto: 'Maria Silva Santos',
        cpf: '98765432100',
        agencia: '0001',
        numeroConta: '987654',
        ...(userAccount || {}),
        saldo: 1150.00 // Saldo após transações
      });

      const res = await request(app)
        .get('/api/v1/account/statement')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('account');
      expect(res.body).toHaveProperty('statement');
      expect(res.body).toHaveProperty('summary');
      expect(res.body.account).toHaveProperty('nomeCompleto', 'Maria Silva Santos');
      expect(res.body.account).toHaveProperty('saldo');
    });

    it('Step 6: Should check investment summary', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      
      const mockInvestments = [
        {
          id: 'inv-integration-1',
          tipoInvestimento: 'CDB',
          valorInvestido: 1000.00,
          valorAtual: 1050.00,
          rentabilidade: 5.0,
          dataCriacao: new Date()
        }
      ];
      
      mockInvestmentRepository.find.mockResolvedValue(mockInvestments);

      const res = await request(app)
        .get('/api/v1/investments/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalInvestido');
      expect(res.body).toHaveProperty('totalAtual');
      expect(res.body).toHaveProperty('rentabilidadeTotal');
      expect(res.body).toHaveProperty('investments');
    });

    it('Step 7: Should get user cards information', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      mockCartaoRepository.find.mockResolvedValue([userCard]);

      const res = await request(app)
        .get('/api/v1/cards')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('cards');
      expect(res.body.cards).toHaveLength(1);
      expect(res.body.cards[0]).toHaveProperty('tipoCartao', 'CREDITO');
      expect(res.body.cards[0]).toHaveProperty('limiteCredito', 3000.00);
    });
  });

  describe('Error Handling in Integration Flow', () => {
    it('should handle authentication errors gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/account/statement')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should handle insufficient funds in transactions', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue({
        ...userAccount,
        saldo: 50.00 // Saldo insuficiente
      });

      const res = await request(app)
        .post('/api/v1/transactions/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.00, // Valor maior que o saldo
          destinationAccount: '123456',
          destinationAgency: '0002',
          destinationName: 'João Silva'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});