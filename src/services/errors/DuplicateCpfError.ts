// src/services/errors/DuplicateCpfError.ts
export class DuplicateCpfError extends Error {
    constructor(message: string = "CPF já cadastrado.") {
        super(message);
        this.name = "DuplicateCpfError";
    }
}