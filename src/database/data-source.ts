// src/database/data-source.ts
import "reflect-metadata";
import { DataSource } from "typeorm";
import { UsuarioConta } from "../entities/UsuarioConta";
import { Cartao } from "../entities/Cartao"; // 1. Importar a nova entidade

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [UsuarioConta, Cartao], // 2. Adicionar a nova entidade aqui
    migrations: [],
    subscribers: [],
});
