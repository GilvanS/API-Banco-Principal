// src/middleware/errorMiddleware.ts
import { NextFunction, Request, Response } from "express";
import { DuplicateCpfError } from "../services/errors/DuplicateCpfError";
import { AuthenticationError } from "../services/errors/AuthenticationError";
import { NotFoundError } from "../services/errors/NotFoundError";

interface IApiError {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware = (err: Error, req: Request, res: Response, _next: NextFunction) => {
    // Log do erro no console para fins de depuração no servidor
    console.error(err.stack);

    let apiError: IApiError;

    if (err instanceof DuplicateCpfError) {
        apiError = {
            status: 400,
            type: "/errors/dados-duplicados",
            title: "Dados já cadastrados",
            detail: err.message,
            instance: req.path,
        };
    } else if (err instanceof AuthenticationError) {
        apiError = {
            status: 401,
            type: "/errors/autenticacao-falhou",
            title: "Autenticação Falhou",
            detail: err.message,
            instance: req.path,
        };
    } else if (err instanceof NotFoundError) {
        apiError = {
            status: 404,
            type: "/errors/recurso-nao-encontrado",
            title: "Recurso Não Encontrado",
            detail: err.message,
            instance: req.path,
        };
    } else {
        // Erro genérico para qualquer outra situação não tratada
        apiError = {
            status: 500,
            type: "/errors/erro-interno",
            title: "Erro Interno do Servidor",
            detail: "Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.",
            instance: req.path,
        };
    }

    return res.status(apiError.status).json(apiError);
};