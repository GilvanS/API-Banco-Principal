// src/database/data-source.ts
import "reflect-metadata";
import { DataSource } from "typeorm";
import { UsuarioConta } from "../entities/UsuarioConta";
import { Cartao } from "../entities/Cartao";
import { Movimentacao } from "../entities/Movimentacao";
import { Investment } from "../entities/Investment";
import { CryptoInvestment } from "../entities/CryptoInvestment";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "banco.sqlite",
    synchronize: true,
    logging: false,
    entities: [UsuarioConta, Cartao, Movimentacao, Investment, CryptoInvestment],
    migrations: [],
    subscribers: [],
});
