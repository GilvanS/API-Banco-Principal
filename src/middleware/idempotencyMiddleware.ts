import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../database/data-source';
import { Movimentacao } from '../entities/Movimentacao';
import { Investment } from '../entities/Investment';
import { LoggerService } from '../services/LoggerService';

export interface IdempotentRequest extends Request {
  idempotencyKey?: string;
}

/**
 * Middleware para validação de idempotência em transações financeiras
 * Verifica se uma transação com a mesma chave já foi processada
 */
export const idempotencyMiddleware = async (
  req: IdempotentRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    if (!idempotencyKey) {
      res.status(400).json({ 
        error: 'Header Idempotency-Key é obrigatório para esta operação' 
      });
      return;
    }
    
    // Validar formato da chave (UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      res.status(400).json({ 
        error: 'Idempotency-Key deve ser um UUID v4 válido' 
      });
      return;
    }
    
    // Verificar se já existe uma transação com esta chave
    const movimentacaoRepository = AppDataSource.getRepository(Movimentacao);
    const investmentRepository = AppDataSource.getRepository(Investment);
    
    const [existingMovimentacao, existingInvestment] = await Promise.all([
      movimentacaoRepository.findOne({
        where: { idempotencyKey },
        relations: ['usuarioConta']
      }),
      investmentRepository.findOne({
        where: { idempotencyKey },
        relations: ['usuarioConta']
      })
    ]);
    
    if (existingMovimentacao) {
      LoggerService.info(`Transação duplicada detectada com chave: ${idempotencyKey}`);
      // Retornar resposta da transação já processada
      res.status(200).json({
        message: 'Transação já processada anteriormente',
        transacao: {
          id: existingMovimentacao.id,
          tipo: existingMovimentacao.tipo,
          valor: existingMovimentacao.valor,
          status: existingMovimentacao.status,
          dataCriacao: existingMovimentacao.dataCriacao,
          idempotencyKey: existingMovimentacao.idempotencyKey
        },
        duplicated: true
      });
      return;
    }
    
    if (existingInvestment) {
      LoggerService.info(`Investimento duplicado detectado com chave: ${idempotencyKey}`);
      // Retornar resposta do investimento já processado
      res.status(200).json({
        message: 'Investimento já processado anteriormente',
        investimento: {
          id: existingInvestment.id,
          tipo: existingInvestment.tipo,
          valorInvestido: existingInvestment.valorInvestido,
          status: existingInvestment.status,
          dataCriacao: existingInvestment.dataCriacao,
          idempotencyKey: existingInvestment.idempotencyKey
        },
        duplicated: true
      });
      return;
    }
    
    // Adicionar a chave à requisição para uso posterior
    req.idempotencyKey = idempotencyKey;
    LoggerService.info(`Nova transação com chave de idempotência: ${idempotencyKey}`);
    next();
    
  } catch (error) {
    LoggerService.error('Erro ao verificar idempotência:', error);
    res.status(500).json({ 
      error: 'Erro interno ao verificar idempotência' 
    });
    return;
  }
};

/**
 * Utilitário para gerar chave de idempotência única
 */
export const generateIdempotencyKey = (): string => {
  return uuidv4();
};

/**
 * Middleware que exige chave de idempotência (para endpoints específicos)
 */
export const requireIdempotencyKey = (req: Request, res: Response, next: NextFunction) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return res.status(400).json({
      error: 'Header Idempotency-Key é obrigatório para esta operação'
    });
  }
  
  next();
};