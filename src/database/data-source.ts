import "reflect-metadata";
import { DataSource } from "typeorm";
import { UsuarioConta } from "../entities/UsuarioConta";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [UsuarioConta],
    migrations: [],
    subscribers: [],
});