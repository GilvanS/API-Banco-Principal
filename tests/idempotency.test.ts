import { idempotencyMiddleware } from '../src/middleware/idempotencyMiddleware';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mock do AppDataSource
jest.mock('../src/database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn()
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

import { AppDataSource } from '../src/database/data-source';

describe('Idempotency Tests', () => {

  describe('Validação de Header', () => {
    it('deve rejeitar requisições sem chave de idempotência', () => {
      const mockReq = {
        headers: {}
      } as unknown as Request;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      
      const mockNext = jest.fn();
      
      idempotencyMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Header Idempotency-Key é obrigatório para esta operação'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve rejeitar chaves de idempotência inválidas', () => {
      const mockReq = {
        headers: {
          'idempotency-key': 'chave-invalida'
        }
      } as unknown as Request;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      
      const mockNext = jest.fn();
      
      idempotencyMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Idempotency-Key deve ser um UUID v4 válido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('deve aceitar chaves de idempotência válidas', async () => {
       const validKey = uuidv4();
       const mockReq = {
         headers: {
           'idempotency-key': validKey
         }
       } as unknown as Request;
       
       const mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn()
       } as unknown as Response;
       
       const mockNext = jest.fn();
       
       // Configurar o mock do repository
       const mockRepository = {
         findOne: jest.fn().mockResolvedValue(null)
       };
       
       (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
       
       await idempotencyMiddleware(mockReq, mockRes, mockNext);
       
       // Verificar se não houve erro e next foi chamado
       expect(mockRes.status).not.toHaveBeenCalledWith(400);
       expect(mockNext).toHaveBeenCalled();
      });
  });

  describe('Funcionalidade Básica', () => {
    it('deve adicionar chave de idempotência à requisição', async () => {
      const validKey = uuidv4();
      const mockReq = {
        headers: {
          'idempotency-key': validKey
        }
      } as unknown as Request;
      
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      
      const mockNext = jest.fn();
      
      // Configurar o mock do repository
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(null)
      };
      
      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
      
      await idempotencyMiddleware(mockReq, mockRes, mockNext);
      
      // Verificar se a chave foi adicionada à requisição
      expect((mockReq as any).idempotencyKey).toBe(validKey);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});