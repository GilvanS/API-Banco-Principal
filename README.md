# API Banco Principal

Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force; Get-Process -Name "ts-node" -ErrorAction SilentlyContinue | Stop-Process -Force; Write-Host "✅ Todos os processos Node.js foram encerrados"
✅ Todos os processos Node.js foram encerrados


Esta é a API central de um sistema bancário simplificado, projetada para gerenciar contas de usuário, cartões e transações financeiras. A API distingue claramente entre operações de gerenciamento (realizadas por Admins) e operações de cliente final.

## Visão Geral da Arquitetura

A API é construída em Node.js com TypeScript e Express. Ela segue os princípios REST e usa TypeORM para interagir com um banco de dados SQL. A documentação da API é gerada automaticamente a partir de um arquivo `swagger.yaml`.

### Regras de Negócio Principais

O sistema opera com base nas seguintes regras:

1.  **Dois Papéis Principais**:
    *   **Admin/Operador**: Gerencia o ciclo de vida das contas e cartões. Pode criar usuários, definir limites, bloquear/desbloquear contas e cartões.
    *   **Cliente**: É o dono da conta. Realiza transações financeiras como transferências e compras.

2.  **Tipos de Cartão**:
    *   **Cartão de Débito**: Gerado automaticamente na criação da conta. É vinculado diretamente à conta e usado para transferências e pagamentos, autenticados por um PIN de 4 dígitos.
    *   **Cartão de Crédito**: Criado opcionalmente por um Admin. Pode ser do tipo `titular` ou `adicional` e é usado para compras, que consomem um limite de crédito pré-aprovado.

---

## Funcionalidades Implementadas (Estrutura)

Recentemente, a estrutura para as **operações do cliente final** foi adicionada. Isso inclui:

1.  **Novas Entidades de Dados**:
    *   `Movimentacao`: Uma nova tabela para registrar todas as transações (transferências, compras, etc.), servindo como extrato da conta.
    *   Campos adicionados às entidades existentes:
        *   `pin` na entidade `Cartao` para autenticar operações de débito.
        *   `creditoUtilizado` na entidade `UsuarioConta` para controlar o saldo do cartão de crédito.

2.  **Nova Arquitetura de Transações**:
    *   **Controller**: `TransacaoController.ts` para receber as requisições HTTP.
    *   **Service**: `TransacaoService.ts` para orquestrar a lógica de negócio (atualmente com a lógica pendente de implementação).
    *   **Routes**: `transacaoRoutes.ts` para definir os novos endpoints.

3.  **Novos Endpoints da API**:
    *   `POST /transacoes/transferir`: Para o cliente transferir dinheiro para outra conta.
    *   `POST /transacoes/compra-credito`: Para simular uma compra com cartão de crédito.
    *   `GET /transacoes/extrato`: Para o cliente consultar seu histórico de transações.

4.  **Documentação Atualizada**:
    *   O arquivo `swagger.yaml` foi atualizado para incluir todos os novos endpoints, schemas e tags, garantindo que a documentação da API esteja sincronizada com o código.

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js (versão 16 ou superior)
- npm ou yarn

### Instalação
```bash
npm install
```

### Execução

#### Modo Desenvolvimento (Recomendado)
```bash
npm run dev
```

#### Modo Produção
```bash
npm run build
npm start
```

### Criação do Admin

**✅ IMPORTANTE**: O admin é criado **automaticamente** na primeira execução do servidor!

- **CPF**: `00000000000`
- **Senha**: `AdminSenhaForte123`
- **Role**: `admin`

Se por algum motivo o admin não for criado automaticamente, execute:
```bash
npx ts-node src/database/seeds/create-admin.ts
```

### Acesso à API

- **Servidor**: http://localhost:3000
- **Documentação Swagger**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

---

## Próximas Etapas

1.  **Implementar a Lógica de Transferência**:
    *   Validar o PIN do cartão de débito do remetente.
    *   Verificar se a conta do remetente tem saldo/limite para a transferência.
    *   Criar os registros de `Movimentacao` para o remetente (`transferencia_enviada`) e o destinatário (`transferencia_recebida`).
    *   Atualizar os saldos/limites das contas envolvidas.

2.  **Implementar a Lógica de Compra com Crédito**:
    *   Validar os dados do cartão de crédito (número, validade, CVV).
    *   Verificar se o limite de crédito disponível é suficiente para a compra.
    *   Atualizar o campo `creditoUtilizado` na conta do cliente.
    *   Criar o registro de `Movimentacao` para a compra.