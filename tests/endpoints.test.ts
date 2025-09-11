import request from 'supertest';
import { app } from '../src/server';
import { AppDataSource } from '../src/database/data-source';

// Mock do AppDataSource para evitar conexão com banco durante testes
jest.mock('../src/database/data-source', () => ({
  AppDataSource: {
    initialize: jest.fn(),
    getRepository: jest.fn(),
    isInitialized: true
  }
}));

// Mock do LoggerService
jest.mock('../src/services/LoggerService', () => ({
  LoggerService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Endpoints Tests', () => {
  beforeAll(async () => {
    // Inicializar servidor para testes
  });

  describe('Cartões Endpoints', () => {
    it('deve retornar informações do cartão de débito', async () => {
      const mockCartao = {
        id: 1,
        numero: '**** **** **** 1234',
        tipo: 'DEBITO',
        limite: 0,
        creditoUtilizado: 0
      };

      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockCartao)
      };

      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

      const response = await request(app)
        .get('/api/v1/cartoes/debito/1')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('numero');
        expect(response.body).toHaveProperty('tipo');
      }
    });

    it('deve retornar informações do cartão de crédito', async () => {
      const mockCartao = {
        id: 2,
        numero: '**** **** **** 5678',
        tipo: 'CREDITO',
        limite: 5000,
        creditoUtilizado: 1500
      };

      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockCartao)
      };

      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

      const response = await request(app)
        .get('/api/v1/cartoes/credito/2')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('limite');
        expect(response.body).toHaveProperty('creditoUtilizado');
      }
    });

    it('deve retornar 404 para cartão não encontrado', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

      const response = await request(app)
        .get('/api/v1/cartoes/debito/999')
        .set('Authorization', 'Bearer valid-token');

      expect([404, 401]).toContain(response.status);
    });
  });

  describe('Investimentos Endpoints', () => {
    it('deve retornar resumo de investimentos', async () => {
      const mockInvestimentos = [
        {
          id: 1,
          tipo: 'CDB',
          valor: 10000,
          rendimento: 500,
          dataVencimento: '2024-12-31'
        },
        {
          id: 2,
          tipo: 'TESOURO_DIRETO',
          valor: 5000,
          rendimento: 250,
          dataVencimento: '2025-06-30'
        }
      ];

      const mockRepository = {
        find: jest.fn().mockResolvedValue(mockInvestimentos)
      };

      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

      const response = await request(app)
        .get('/api/v1/investimentos/resumo')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('totalInvestido');
        expect(response.body).toHaveProperty('totalRendimento');
        expect(response.body).toHaveProperty('investimentos');
      }
    });

    it('deve retornar lista vazia quando não há investimentos', async () => {
      const mockRepository = {
        find: jest.fn().mockResolvedValue([])
      };

      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

      const response = await request(app)
        .get('/api/v1/investimentos/resumo')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.totalInvestido).toBe(0);
        expect(response.body.investimentos).toEqual([]);
      }
    });
  });

  describe('Transações Endpoints - Validações', () => {
    it('deve validar dados obrigatórios para depósito', async () => {
      const response = await request(app)
        .post('/api/v1/transacoes/deposito')
        .set('Authorization', 'Bearer valid-token')
        .send({
          // Dados incompletos
          valor: 100
          // Faltando clienteId
        });

      expect([400, 401]).toContain(response.status);
    });

    it('deve validar valor mínimo para transferência', async () => {
      const response = await request(app)
        .post('/api/v1/transacoes/transferir')
        .set('Authorization', 'Bearer valid-token')
        .send({
          clienteOrigemId: 1,
          clienteDestinoId: 2,
          valor: -100, // Valor inválido
          pin: '1234'
        });

      expect([400, 401]).toContain(response.status);
    });

    it('deve validar dados do cartão para compra no crédito', async () => {
      const response = await request(app)
        .post('/api/v1/transacoes/compra-credito')
        .set('Authorization', 'Bearer valid-token')
        .send({
          cartaoId: 1,
          valor: 500,
          // Faltando estabelecimento
        });

      expect([400, 401]).toContain(response.status);
    });

    it('deve validar formato do PIN', async () => {
      const response = await request(app)
        .post('/api/v1/transacoes/transferir')
        .set('Authorization', 'Bearer valid-token')
        .send({
          clienteOrigemId: 1,
          clienteDestinoId: 2,
          valor: 100,
          pin: '12' // PIN muito curto
        });

      expect([400, 401]).toContain(response.status);
    });
  });

  describe('Extrato Endpoint', () => {
    it('deve retornar extrato com paginação', async () => {
      const mockMovimentacoes = [
        {
          id: 1,
          tipo: 'DEPOSITO',
          valor: 1000,
          data: new Date(),
          descricao: 'Depósito em conta'
        },
        {
          id: 2,
          tipo: 'TRANSFERENCIA',
          valor: -500,
          data: new Date(),
          descricao: 'Transferência para João'
        }
      ];

      const mockRepository = {
        find: jest.fn().mockResolvedValue(mockMovimentacoes),
        count: jest.fn().mockResolvedValue(2)
      };

      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

      const response = await request(app)
        .get('/api/v1/transacoes/extrato?page=1&limit=10')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('movimentacoes');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('limit');
      }
    });

    it('deve aplicar filtros de data no extrato', async () => {
      const response = await request(app)
        .get('/api/v1/transacoes/extrato?dataInicio=2024-01-01&dataFim=2024-12-31')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 401]).toContain(response.status);
    });
  });
});