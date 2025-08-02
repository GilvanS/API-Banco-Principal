# REGRAS API BANCO PRINCIPAL

## STATUS ATUAL - FUNCIONANDO

- ✅ **Servidor**: Rodando na porta 3000
- ✅ **Banco de Dados**: SQLite conectado e sincronizado
- ✅ **Autenticação**: JWT funcionando
- ✅ **Documentação**: Swagger acessível em /api-docs
- ✅ **Health Check**: Funcionando em /health
- ✅ **Admin Padrão**: Criado automaticamente na inicialização

## CORREÇÕES REALIZADAS

- ✅ **Erro de Tipo ENUM no SQLite**: Corrigido - alterado para varchar
- ✅ **Melhoria no Campo Tipo de Movimentação**: Adicionado length específico
- ✅ **Servidor funcionando perfeitamente**

## TESTES REALIZADOS

- ✅ **Login como admin**: Funcionando
- ✅ **Criação de clientes**: Funcionando
- ✅ **Cartão de débito automático**: Criado automaticamente
- ✅ **Solicitação de cartão de crédito**: Funcionando
- ✅ **Transferências**: Funcionando

## PRÓXIMOS PASSOS RECOMENDADOS

- 🔴 **CRÍTICO - Segurança**: Hash do PIN do Cartão (atualmente salvo em texto puro)
- 🔴 **CRÍTICO - Segurança**: JWT Secret (remover valor padrão e exigir variável de ambiente)
- 🟡 **IMPORTANTE - Funcionalidades**: Saldo Real da Conta (implementar campo `saldo` na lógica de transferência)
- 🟡 **IMPORTANTE - Funcionalidades**: Pagamento de Fatura (endpoint para pagar fatura do cartão de crédito)
- 🟡 **IMPORTANTE - Funcionalidades**: Definição de PIN (permitir que usuário defina/altere PIN do cartão)
- 🟢 **MELHORIAS**: Testes Automatizados (implementar Jest + Supertest)
- 🟢 **MELHORIAS**: Logging Estruturado (substituir console.log por Winston/Pino)
- 🟢 **MELHORIAS**: Padronização de Erros (usar estrutura ApiError consistente)

## COMO EXECUTAR

### Execução Rápida
```bash
# Instalar dependências
npm install

# Modo desenvolvimento (recomendado)
npm run dev

# Modo produção
npm run build
npm start
```

### Criação do Admin

**IMPORTANTE**: O admin é criado **automaticamente** na primeira execução do servidor!

- **CPF**: `00000000000`
- **Senha**: `AdminSenhaForte123`
- **Role**: `admin`

**Se por algum motivo o admin não for criado automaticamente, execute:**
```bash
npx ts-node src/database/seeds/create-admin.ts
```

### Acesso à API
- **Servidor**: http://localhost:3000
- **Documentação Swagger**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## ARQUITETURA

### **TECNOLOGIAS**
- **Backend**: Node.js + TypeScript + Express
- **Banco de Dados**: SQLite + TypeORM
- **Autenticação**: JWT (JSON Web Tokens)
- **Validação**: Express-validator
- **Documentação**: Swagger/OpenAPI
- **Logging**: LoggerService customizado

### **ESTRUTURA DE DADOS**
- **UsuárioConta**: Clientes e administradores
- **Cartao**: Cartões de débito e crédito
- **Movimentacao**: Transações financeiras

### **ROLES DE USUÁRIO**
- **admin**: Acesso total ao sistema
- **operador**: Acesso limitado (cliente comum)

## ENDPOINTS DA API

### **1. AUTENTICAÇÃO**

#### **POST /auth/login**
- **Descrição**: Login de usuário
- **Body**:
  ```json
  {
    "cpf": "string",
    "senha": "string"
  }
  ```
- **Resposta**:
  ```json
  {
    "token": "string",
    "user": {
      "id": "uuid",
      "nomeCompleto": "string",
      "cpf": "string",
      "role": "admin"
    }
  }
  ```
- **Status**: 200 (sucesso), 401 (credenciais inválidas)

### **2. GESTÃO DE CLIENTES**

#### **POST /clientes**
- **Descrição**: Cria novo cliente com cartão de débito automático
- **Body**:
  ```json
  {
    "nomeCompleto": "string",
    "cpf": "string",
    "senha": "string",
    "agencia": "string",
    "numeroConta": "string"
  }
  ```
- **Resposta**: Cliente criado com dados completos (sem senha)
- **Status**: 201 (criado), 400 (dados inválidos/CPF duplicado)
- **Regras**:
  - CPF deve ser único
  - Senha mínima 6 caracteres
  - **Cria automaticamente cartão de débito Mastercard**
  - Saldo inicial: R$ 200,00
  - Limite de crédito inicial: R$ 1.000,00

#### **GET /clientes/:id**
- **Descrição**: Consulta cliente específico
- **Resposta**: Dados completos do cliente com cartões
- **Status**: 200 (sucesso), 404 (não encontrado)

#### **GET /clientes/:id/saldo**
- **Descrição**: Consulta saldo e informações de crédito
- **Resposta**:
  ```json
  {
    "saldo": 200,
    "limiteCredito": 1000,
    "creditoUtilizado": 0,
    "creditoDisponivel": 1000
  }
  ```
- **Status**: 200 (sucesso), 400 (erro)

#### **GET /clientes**
- **Descrição**: Lista todos os clientes
- **Resposta**: Array de clientes (sem senhas)
- **Status**: 200 (sucesso)

### **3. GESTÃO DE CARTÕES**

#### **POST /cartoes**
- **Descrição**: Solicita cartão de crédito (titular ou adicional)
- **Body**:
  ```json
  {
    "usuarioId": "uuid",
    "bandeira": "visa|mastercard|elo|amex",
    "titularidade": "titular|adicional",
    "limite": 1500
  }
  ```
- **Resposta**: Cartão criado com dados completos
- **Status**: 201 (criado), 400 (erro)
- **Regras**:
  - **APENAS cartões de crédito**
  - Cartão de débito é criado automaticamente na criação do cliente
  - Bandeiras: visa, mastercard, elo, amex
  - Titularidade: titular ou adicional
  - Limite mínimo: R$ 100,00

#### **GET /cartoes/cliente/:usuarioId**
- **Descrição**: Lista cartões do cliente
- **Resposta**: Array de cartões (débito e crédito)
- **Status**: 200 (sucesso), 400 (erro)

#### **PATCH /cartoes/:id/pin**
- **Descrição**: Define PIN do cartão de débito
- **Body**:
  ```json
  {
    "pinAtual": "1234",
    "novoPIN": "5678"
  }
  ```
- **Status**: 200 (sucesso), 400 (erro)

#### **PATCH /cartoes/:id/bloquear**
- **Descrição**: Bloqueia cartão
- **Status**: 200 (sucesso), 400 (erro)

#### **PATCH /cartoes/:id/desbloquear**
- **Descrição**: Desbloqueia cartão
- **Status**: 200 (sucesso), 400 (erro)

### **4. OPERAÇÕES FINANCEIRAS**

#### **POST /transacoes**
- **Descrição**: Realiza transação financeira
- **Body**:
  ```json
  {
    "contaOrigemId": "uuid",
    "contaDestinoId": "uuid",
    "valor": 100.00,
    "tipo": "transferencia|deposito|saque"
  }
  ```
- **Resposta**: Transação criada
- **Status**: 201 (criado), 400 (erro)
- **Tipos**: transferencia, deposito, saque

#### **GET /transacoes**
- **Descrição**: Lista todas as transações
- **Resposta**: Array de transações
- **Status**: 200 (sucesso)

#### **GET /transacoes/:id**
- **Descrição**: Consulta transação específica
- **Resposta**: Dados da transação
- **Status**: 200 (sucesso), 404 (não encontrado)

### **5. FUNCIONALIDADES DE ADMIN**

#### **GET /admin/usuarios**
- **Descrição**: Lista todos os usuários (apenas admin)
- **Resposta**: Array de usuários
- **Status**: 200 (sucesso), 403 (não autorizado)

#### **GET /admin/estatisticas**
- **Descrição**: Estatísticas do sistema (apenas admin)
- **Resposta**: Dados estatísticos
- **Status**: 200 (sucesso), 403 (não autorizado)

#### **PATCH /admin/clientes/:id/limite**
- **Descrição**: Atualiza limites do cliente (apenas admin)
- **Body**:
  ```json
  {
    "limiteCredito": 5000,
    "limiteDebitoDiario": 15000
  }
  ```
- **Status**: 200 (sucesso), 403 (não autorizado)

## FLUXO CORRETO DE TESTE

### **1. Criação de Cliente**
```bash
# Criar cliente (cartão de débito é criado automaticamente)
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN_ADMIN]" \
  -d '{
    "nomeCompleto": "João Silva",
    "cpf": "12345678901",
    "senha": "Senha123"
  }'
```

### **2. Solicitar Cartão de Crédito**
```bash
# Solicitar cartão de crédito (titular)
curl -X POST http://localhost:3000/cartoes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN_ADMIN]" \
  -d '{
    "usuarioId": "[ID_DO_CLIENTE]",
    "bandeira": "visa",
    "titularidade": "titular",
    "limite": 5000.00
  }'
```

### **3. Solicitar Cartão Adicional**
```bash
# Solicitar cartão adicional
curl -X POST http://localhost:3000/cartoes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN_ADMIN]" \
  -d '{
    "usuarioId": "[ID_DO_CLIENTE]",
    "bandeira": "mastercard",
    "titularidade": "adicional",
    "limite": 2000.00
  }'
```

## REGRAS IMPORTANTES

### **Cartões de Débito**
- ✅ **Criados automaticamente** na criação do cliente
- ✅ **Bandeira padrão**: Mastercard
- ✅ **PIN padrão**: 1234
- ✅ **Não podem ser solicitados** via POST /cartoes

### **Cartões de Crédito**
- ✅ **Solicitados via POST /cartoes**
- ✅ **Tipos**: titular ou adicional
- ✅ **Bandeiras**: visa, mastercard, elo, amex
- ✅ **Limite configurável**

### **Segurança**
- 🔴 **PIN**: Atualmente salvo em texto puro (precisa hash)
- 🔴 **JWT Secret**: Usar variável de ambiente
- ✅ **Senhas**: Hash com bcrypt
- ✅ **Autenticação**: JWT obrigatório

## EXEMPLOS DE USO

### **Cenário Completo**
1. **Criar cliente** → Cartão de débito criado automaticamente
2. **Solicitar cartão de crédito titular** → Via POST /cartoes
3. **Solicitar cartão adicional** → Via POST /cartoes
4. **Realizar transferências** → Via POST /transacoes
5. **Consultar saldo** → Via GET /clientes/:id/saldo

### **Dados de Teste**
- **Admin**: CPF 00000000000, Senha AdminSenhaForte123
- **Cliente Teste**: CPF 12345678901, Senha Senha123
- **Cartão Débito**: Criado automaticamente (Mastercard)
- **Cartão Crédito**: Solicitado via API (Visa/Mastercard) 