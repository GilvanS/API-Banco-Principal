// src/server.ts
import "reflect-metadata";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { AppDataSource } from "./database/data-source";
import { LoggerService } from "./services/LoggerService";
import { UsuarioContaService } from "./services/UsuarioContaService";

// Importar rotas
import authRoutes from "./routes/authRoutes";
import clienteRoutes from "./routes/clienteRoutes";
import cartaoRoutes from "./routes/cartaoRoutes";
import transacaoRoutes from "./routes/transacaoRoutes";
import adminRoutes from "./routes/adminRoutes";

// Novas rotas da refatoração
import accountRoutes from "./routes/accountRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import cardRoutes from "./routes/cardRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import investmentRoutes from "./routes/investmentRoutes";

// Novas rotas de consulta
import contaRoutes from "./routes/contaRoutes";
import cartaoLimiteRoutes from "./routes/cartaoLimiteRoutes";

const app = express();

app.use(cors());
app.use(express.json());

// Swagger
const swaggerDocument = YAML.load(path.resolve(__dirname, "../swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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

// Rotas da API - Legadas
app.use("/auth", authRoutes);
app.use("/clientes", clienteRoutes);
app.use("/cartoes", cartaoRoutes);
app.use("/transacoes", transacaoRoutes);
app.use("/admin", adminRoutes);

// Novas rotas da API - Refatoração
app.use("/api/account", accountRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/investments", investmentRoutes);

// Novas rotas de consulta
app.use("/api/contas", contaRoutes);
app.use("/api/cartoes", cartaoLimiteRoutes);

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
    .then(async () => {
        LoggerService.info("Banco de dados inicializado com sucesso");

        // Criar admin automaticamente se não existir
        try {
            const adminExistente = await UsuarioContaService.buscarPorCPF("00000000000");
            if (!adminExistente) {
                await UsuarioContaService.criarCliente({
                    nomeCompleto: "Administrador do Sistema",
                    cpf: "00000000000",
                    senha: "AdminSenhaForte123",
                    role: "admin"
                });
                LoggerService.info("Admin criado automaticamente");
            } else {
                LoggerService.info("Admin já existe");
            }
        } catch (error) {
            LoggerService.error("Erro ao criar admin automático", error);
        }

        app.listen(PORT, () => {
            LoggerService.info(`Servidor iniciado na porta ${PORT}`);
            LoggerService.info(`Documentação: http://localhost:${PORT}/api-docs`);
            LoggerService.info(`Health Check: http://localhost:${PORT}/health`);
        });
    })
    .catch((error) => {
        LoggerService.error("Erro ao inicializar servidor", error);
        process.exit(1);
    });