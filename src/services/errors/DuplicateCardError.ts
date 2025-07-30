// src/services/errors/DuplicateCardError.ts
export class DuplicateCardError extends Error {
    constructor(message: string = "O cliente já possui um cartão com as mesmas características.") {
        super(message);
        this.name = "DuplicateCardError";
    }
}