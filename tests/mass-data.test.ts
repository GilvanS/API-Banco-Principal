// tests/mass-data.test.ts
import request from 'supertest';
import { app, startServer } from '../src/server';
import { AppDataSource } from '../src/database/data-source';
import { UsuarioConta } from '../src/entities/UsuarioConta';
import { Cartao } from '../src/entities/Cartao';
import { Investment } from '../src/entities/Investment';

// Mock do banco de dados para testes
jest.mock('../src/database/data-source');

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

describe('Mass Data Generation Tests', () => {
  let authToken: string;
  let userId: string;
  let userAccount: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock user data
    userId = 'test-user-id';
    userAccount = {
      id: userId,
      nomeCompleto: 'João Silva',
      cpf: '12345678901',
      email: 'joao@test.com',
      agencia: '0001',
      numeroConta: '123456',
      saldo: 1000.00,
      limiteDebitoDiario: 2000.00,
      limiteCreditoDiario: 5000.00
    };
    
    authToken = 'mock-jwt-token';
  });

  describe('Transaction Endpoints for Mass Data', () => {
    it('should process deposit transaction', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      
      const depositData = {
        amount: 500.00,
        description: 'Depósito para massa de dados'
      };

      const res = await request(app)
        .post('/api/v1/transactions/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(depositData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('transactionId');
      expect(res.body).toHaveProperty('type', 'DEPOSIT');
      expect(res.body).toHaveProperty('amount', 500.00);
      expect(res.body).toHaveProperty('status', 'COMPLETED');
    });

    it('should process transfer transaction', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      
      const transferData = {
        amount: 200.00,
        destinationAccount: '654321',
        destinationAgency: '0002',
        destinationName: 'Maria Santos',
        description: 'Transferência para massa de dados'
      };

      const res = await request(app)
        .post('/api/v1/transactions/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('transactionId');
      expect(res.body).toHaveProperty('type', 'TRANSFER');
      expect(res.body).toHaveProperty('amount', 200.00);
    });

    it('should process credit purchase transaction', async () => {
      const mockCard = {
        id: 'card-id',
        numeroCartao: '1234567890123456',
        tipoCartao: 'CREDITO',
        limiteCredito: 2000.00,
        creditoUtilizado: 500.00
      };
      
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      mockCartaoRepository.findOne.mockResolvedValue(mockCard);
      
      const purchaseData = {
        amount: 150.00,
        merchant: 'Loja Teste',
        description: 'Compra para massa de dados'
      };

      const res = await request(app)
        .post('/api/v1/transactions/credit-purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(purchaseData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('transactionId');
      expect(res.body).toHaveProperty('type', 'CREDIT_PURCHASE');
      expect(res.body).toHaveProperty('amount', 150.00);
    });

    it('should process bill payment transaction', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      
      const paymentData = {
        amount: 300.00,
        billType: 'CREDIT_CARD',
        description: 'Pagamento de fatura para massa de dados'
      };

      const res = await request(app)
        .post('/api/v1/transactions/pay-bill')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('transactionId');
      expect(res.body).toHaveProperty('type', 'BILL_PAYMENT');
      expect(res.body).toHaveProperty('amount', 300.00);
    });
  });

  describe('Investment Endpoints for Mass Data', () => {
    it('should return investment summary', async () => {
      const mockInvestments = [
        {
          id: 'inv-1',
          tipoInvestimento: 'CDB',
          valorInvestido: 1000.00,
          valorAtual: 1050.00,
          rentabilidade: 5.0,
          dataCriacao: new Date()
        },
        {
          id: 'inv-2',
          tipoInvestimento: 'POUPANCA',
          valorInvestido: 500.00,
          valorAtual: 510.00,
          rentabilidade: 2.0,
          dataCriacao: new Date()
        }
      ];
      
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      mockInvestmentRepository.find.mockResolvedValue(mockInvestments);

      const res = await request(app)
        .get('/api/v1/investments/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalInvestido');
      expect(res.body).toHaveProperty('totalAtual');
      expect(res.body).toHaveProperty('rentabilidadeTotal');
      expect(res.body).toHaveProperty('investments');
      expect(res.body.investments).toHaveLength(2);
    });
  });

  describe('Account Statement for Mass Data Validation', () => {
    it('should return account statement with filters', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      
      const res = await request(app)
        .get('/api/v1/account/statement')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          transactionType: 'ALL'
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('account');
      expect(res.body).toHaveProperty('statement');
      expect(res.body).toHaveProperty('summary');
    });
  });

  describe('Mass Data Generation Scenarios', () => {
    it('should handle multiple rapid transactions', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      
      const transactions = [
        { endpoint: '/api/v1/transactions/deposit', data: { amount: 100 } },
        { endpoint: '/api/v1/transactions/deposit', data: { amount: 200 } },
        { endpoint: '/api/v1/transactions/deposit', data: { amount: 300 } }
      ];

      const promises = transactions.map(tx => 
        request(app)
          .post(tx.endpoint)
          .set('Authorization', `Bearer ${authToken}`)
          .send(tx.data)
      );

      const results = await Promise.all(promises);
      
      results.forEach(res => {
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('transactionId');
      });
    });

    it('should validate transaction limits for mass data', async () => {
      mockUsuarioContaRepository.findOne.mockResolvedValue(userAccount);
      
      // Teste com valor acima do limite
      const res = await request(app)
        .post('/api/v1/transactions/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 60000 }); // Acima do limite de R$ 50.000

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});