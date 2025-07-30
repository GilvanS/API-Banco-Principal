import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Category } from "../entities/Category";
import { Article } from "../entities/Article";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database1.sqlite",
    synchronize: true,
    logging: false,
    entities: [User, Category, Article],
    migrations: [],
    subscribers: [],
}); 