// src/services/errors/AuthenticationError.ts
export class AuthenticationError extends Error {
    constructor(message: string = "CPF ou senha inválidos.") {
        super(message);
        this.name = "AuthenticationError";
    }
}