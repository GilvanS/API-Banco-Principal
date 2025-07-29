// src/server.ts
import dotenv from "dotenv";
dotenv.config(); // 1. DEVE SER A PRIMEIRA COISA A SER EXECUTADA

import "reflect-metadata"; // 2. O resto dos imports vem depois

import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { AppDataSource } from "./database/data-source";
import usuarioContaRoutes from "./routes/usuarioContaRoutes";

const app = express();

app.use(cors());
app.use(express.json());

// CORREÇÃO: O caminho para o swagger.yaml deve subir apenas um nível (../)
const swaggerDocument = YAML.load(path.resolve(__dirname, "../swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/usuarios-contas", usuarioContaRoutes);

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
    .then(() => {
        console.log("Banco de dados inicializado com sucesso!");
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log(`Documentação disponível em http://localhost:${PORT}/api-docs`);
        });
    })
    .catch((error) => {
        console.error("Erro ao inicializar o servidor:", error);
        process.exit(1);
    });