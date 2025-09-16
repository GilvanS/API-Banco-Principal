// src/server.ts
import "reflect-metadata";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { AppDataSource } from "./database/data-source";
import { LoggerService } from "./services/LoggerService";

// Importar rotas
import authRoutes from "./routes/authRoutes";
import clienteRoutes from "./routes/clienteRoutes";
import cartaoRoutes from "./routes/cartaoRoutes";

import accountRoutes from "./routes/accountRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import cardRoutes from "./routes/cardRoutes";
import investmentRoutes from "./routes/investmentRoutes";
import contaRoutes from "./routes/contaRoutes";
import cartaoLimiteRoutes from "./routes/cartaoLimiteRoutes";
import transacaoRoutes from "./routes/transacaoRoutes"; // ADICIONADO: Rotas PT-BR de transações

const app = express();

app.use(cors());
app.use(express.json());

// Swagger
const swaggerDocument = YAML.load(path.resolve(__dirname, "../swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Servir o arquivo swagger.yaml diretamente
app.get("/swagger.yaml", (req, res) => {
    res.setHeader('Content-Type', 'application/x-yaml');
    res.sendFile(path.resolve(__dirname, "../swagger.yaml"));
});

// Rota de teste
app.get("/", (req, res) => {
    res.json({
        message: "API Banco Principal v2.0.0",
        status: "online",
        timestamp: new Date().toISOString()
    });
});

// Rota de health check
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString()
    });
});

// Rotas da API v1
const apiV1Router = express.Router();

// Rotas legadas movidas para /api/v1
apiV1Router.use("/auth", authRoutes);
apiV1Router.use("/clientes", clienteRoutes);
apiV1Router.use("/cartoes", cartaoRoutes);


// Rotas da refatoração movidas para /api/v1
apiV1Router.use("/account", accountRoutes);
apiV1Router.use("/transactions", transactionRoutes);
apiV1Router.use("/cards", cardRoutes);
apiV1Router.use("/investments", investmentRoutes);
// Compatibilidade PT-BR para testes legados
apiV1Router.use("/investimentos", investmentRoutes);
apiV1Router.use("/transacoes", transacaoRoutes); // ADICIONADO: montar rotas PT-BR

// Rotas de consulta movidas para /api/v1
apiV1Router.use("/contas", contaRoutes);
apiV1Router.use("/cartoes", cartaoLimiteRoutes);

app.use("/api/v1", apiV1Router);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await AppDataSource.initialize();
        LoggerService.info("Banco de dados inicializado com sucesso");

        if (process.env.NODE_ENV !== 'test') {
            app.listen(PORT, () => {
                LoggerService.info(`Servidor iniciado na porta ${PORT}`);
                LoggerService.info(`Documentação: http://localhost:${PORT}/api-docs`);
                LoggerService.info(`Health Check: http://localhost:${PORT}/health`);
            });
        }
    } catch (error) {
        LoggerService.error("Erro ao inicializar servidor", error);
        process.exit(1);
    }
};

// Iniciar o servidor apenas se não estiver em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export { app, startServer };