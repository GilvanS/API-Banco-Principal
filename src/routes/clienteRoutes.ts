import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { UsuarioContaService } from "../services/UsuarioContaService";
import { validateRequest } from "../middleware/validateRequest";
import { LoggerService } from "../services/LoggerService";

const router = Router();

interface CreateClienteRequest {
    nomeCompleto: string;
    cpf: string;
    senha: string;
    agencia?: string;
    numeroConta?: string;
}

// POST /clientes - Criar cliente
router.post("/",
    [
        body("nomeCompleto").notEmpty().withMessage("Nome completo é obrigatório"),
        body("cpf").isLength({ min: 11, max: 14 }).withMessage("CPF inválido"),
        body("senha").isLength({ min: 6 }).withMessage("Senha deve ter no mínimo 6 caracteres"),
        validateRequest
    ],
    async (req: Request<{}, {}, CreateClienteRequest>, res: Response) => {
        try {
            const cliente = await UsuarioContaService.criarCliente(req.body);
            const { senha: _, ...clienteSemSenha } = cliente;
            return res.status(201).json(clienteSemSenha);
        } catch (error) {
            LoggerService.error("Erro ao criar cliente", error);
            return res.status(400).json({ erro: (error as Error).message });
        }
    }
);

// GET /clientes/:id - Consultar cliente
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const cliente = await UsuarioContaService.buscarPorId(req.params.id);
        if (!cliente) {
            return res.status(404).json({ erro: "Cliente não encontrado" });
        }
        const { senha: _, ...clienteSemSenha } = cliente;
        return res.json(clienteSemSenha);
    } catch (error) {
        LoggerService.error("Erro ao buscar cliente", error);
        return res.status(500).json({ erro: "Erro interno do servidor" });
    }
});

// GET /clientes/:id/saldo - Consultar saldo
router.get("/:id/saldo", async (req: Request, res: Response) => {
    try {
        const saldo = await UsuarioContaService.consultarSaldo(req.params.id);
        return res.json(saldo);
    } catch (error) {
        LoggerService.error("Erro ao consultar saldo", error);
        return res.status(400).json({ erro: (error as Error).message });
    }
});

// GET /clientes - Listar todos os clientes
router.get("/", async (req: Request, res: Response) => {
    try {
        const clientes = await UsuarioContaService.buscarTodos();
        const clientesSemSenha = clientes.map(cliente => {
            const { senha: _, ...clienteSemSenha } = cliente;
            return clienteSemSenha;
        });
        return res.json(clientesSemSenha);
    } catch (error) {
        LoggerService.error("Erro ao listar clientes", error);
        return res.status(500).json({ erro: "Erro interno do servidor" });
    }
});

export default router; 