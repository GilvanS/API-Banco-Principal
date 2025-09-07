// src/database/data-source.ts
import "reflect-metadata";
import { DataSource } from "typeorm";
import { UsuarioConta } from "../entities/UsuarioConta";
import { Cartao } from "../entities/Cartao";
import { Movimentacao } from "../entities/Movimentacao";
import { Investment } from "../entities/Investment";
import { Device } from "../entities/Device";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "banco.sqlite",
    synchronize: true,
    logging: false,
    entities: [UsuarioConta, Cartao, Movimentacao, Investment, Device],
    migrations: [],
    subscribers: [],
});
