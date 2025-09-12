# MILESTONE - Aplicativo Mobile Banco Digital

## 📱 Visão Geral
Desenvolvimento de aplicativo mobile para banco digital com funcionalidades completas de conta corrente, cartão de crédito, investimentos e PIX.

## 🎯 Objetivos do Projeto
- Criar interface mobile intuitiva e moderna
- Implementar todas as funcionalidades bancárias essenciais
- Garantir segurança e conformidade com regulamentações
- Proporcionar experiência de usuário excepcional

---

## 📋 ETAPAS DE DESENVOLVIMENTO

### 1️⃣ AQUISIÇÃO (Onboarding)
**Objetivo:** Permitir que novos usuários criem conta no banco digital

#### 📝 Funcionalidades Mapeadas:
- **Cadastro de Cliente**
  - Nome completo ✅
  - CPF ✅
  - Email ✅
  - Senha ✅
  - Seleção de bandeira do cartão (Visa/Mastercard) ✅

#### 🔗 Endpoints Disponíveis:
- `POST /clientes` - Criar novo cliente
- `GET /clientes/:id` - Consultar dados do cliente

#### 📱 Telas Mobile:
1. **Tela de Boas-vindas**
2. **Formulário de Cadastro**
   - Campo: Nome Completo
   - Campo: CPF (com máscara)
   - Campo: Email
   - Campo: Senha (mínimo 6 caracteres)
   - Seleção: Bandeira do Cartão (Visa/Mastercard)
3. **Confirmação de Cadastro**
4. **Ativação da Conta**

#### ⚙️ Regras de Negócio:
- CPF único no sistema
- Senha mínima de 6 caracteres
- Email válido (opcional)
- Criação automática de cartão múltiplo (débito + crédito)
- Saldo inicial de R$ 200,00
- Agência padrão: 0001

---

### 2️⃣ LOGIN (Autenticação)
**Objetivo:** Permitir acesso seguro à conta

#### 📝 Funcionalidades Mapeadas:
- **Autenticação**
  - CPF ✅
  - Senha ✅
  - Token JWT ✅

#### 🔗 Endpoints Disponíveis:
- `POST /auth/login` - Realizar login

#### 📱 Telas Mobile:
1. **Tela de Login**
   - Campo: CPF (com máscara)
   - Campo: Senha
   - Botão: Entrar
   - Link: Esqueci minha senha
2. **Recuperação de Senha**
3. **Biometria** (futuro)

#### ⚙️ Regras de Negócio:
- Validação de CPF e senha
- Geração de token JWT
- Verificação de conta ativa
- Bloqueio após tentativas inválidas

---

### 3️⃣ CONTA (Operações Bancárias)
**Objetivo:** Gerenciar conta corrente e operações financeiras

#### 📝 Funcionalidades Mapeadas:

##### 💰 Consulta de Saldo
- Saldo conta corrente ✅
- Limite de crédito ✅
- Limite diário ✅

##### 💸 Transferências
- **PIX** ✅
  - Chave PIX (CPF/Email) ✅
  - Valor e descrição ✅
  - Data e hora ✅
- **Transferência entre contas** ✅
  - Agência e conta destino ✅
  - Nome e CPF destinatário ✅
  - Valor e descrição ✅
  - Data e hora ✅

##### 📈 Investimentos
- Consultar investimentos ✅
- Aplicar em investimentos ✅
- Simular rendimentos ✅
- Resgatar investimentos ✅
- Poupança programada ✅

##### 💳 Pagamentos
- Pagamento de contas ✅
- Depósitos ✅
- Saques ✅

##### 📊 Extratos
- Extrato da conta ✅
- Filtros por data ✅
- Filtros por tipo de transação ✅
- Últimas compras ✅

#### 🔗 Endpoints Disponíveis:
- `GET /api/contas/saldo` - Consultar saldo
- `GET /api/contas/extrato` - Extrato da conta
- `POST /api/transactions/transfer` - Transferência entre contas
- `POST /api/transactions/pix` - Transferência PIX
- `POST /api/transactions/deposit` - Realizar depósito
- `POST /api/transactions/withdraw` - Realizar saque
- `POST /api/transactions/pay-bill` - Pagamento de contas
- `GET /api/investments/summary` - Resumo investimentos
- `GET /api/investments/applications` - Listar investimentos
- `POST /api/investments/apply` - Aplicar investimento
- `POST /api/investments/simulate` - Simular investimento
- `POST /api/investments/:id/redeem` - Resgatar investimento

#### 📱 Telas Mobile:
1. **Dashboard Principal**
   - Saldo atual
   - Limite disponível
   - Ações rápidas
2. **Transferir**
   - PIX (CPF/Email)
   - Entre contas (Agência/Conta)
   - Histórico de transferências
3. **Investimentos**
   - Resumo da carteira
   - Aplicar
   - Resgatar
   - Simulador
4. **Pagamentos**
   - Contas
   - Depósitos
   - Saques
5. **Extrato**
   - Lista de transações
   - Filtros
   - Detalhes da transação

#### ⚙️ Regras de Negócio:
- Valor mínimo PIX: R$ 1,00
- Valor mínimo transferência: R$ 10,00
- Valor máximo depósito: R$ 50.000,00
- Valor máximo saque: R$ 5.000,00
- Verificação de saldo antes das operações
- Registro de todas as movimentações com data/hora
- Descrição obrigatória em transferências

---

### 4️⃣ CRÉDITO (Cartão de Crédito)
**Objetivo:** Gerenciar cartão de crédito e faturas

#### 📝 Funcionalidades Mapeadas:

##### 💳 Consulta de Cartão
- Saldo do cartão de crédito ✅
- Limite disponível ✅
- Dados do cartão ✅

##### 🧾 Fatura
- Consultar fatura atual ✅
- Histórico de faturas ✅
- Vencimento e fechamento ✅

##### 🛒 Compras
- Realizar compras ✅
- Valor, comerciante e descrição ✅
- Data e hora automática ✅

##### 📋 Extrato de Compras
- Extrato da fatura ✅
- Detalhes das compras ✅
- Filtros por período ✅

##### 🔧 Gerenciamento
- Bloquear cartão ✅
- Desbloquear cartão ✅
- Alterar PIN ✅
- Configurações de segurança ✅
- Segunda via ✅

#### 🔗 Endpoints Disponíveis:
- `GET /api/cards` - Listar cartões
- `GET /api/cards/:id/invoice` - Consultar fatura
- `POST /api/transactions/credit-purchase` - Compra no crédito
- `PUT /api/cards/:id/block` - Bloquear cartão
- `PUT /api/cards/:id/unblock` - Desbloquear cartão
- `PUT /api/cards/:id/pin` - Alterar PIN
- `PUT /api/cards/:id/settings` - Configurações do cartão
- `POST /api/cards` - Solicitar segunda via

#### 📱 Telas Mobile:
1. **Meus Cartões**
   - Lista de cartões
   - Status (ativo/bloqueado)
   - Últimos 4 dígitos
2. **Detalhes do Cartão**
   - Limite total e disponível
   - Fatura atual
   - Próximo vencimento
3. **Fatura**
   - Valor total
   - Data de vencimento
   - Data de fechamento
   - Lista de compras
4. **Comprar**
   - Valor da compra
   - Nome do estabelecimento
   - Descrição
   - Confirmação
5. **Extrato do Cartão**
   - Compras da fatura
   - Filtros por período
   - Detalhes da compra
6. **Configurações**
   - Bloquear/Desbloquear
   - Alterar PIN
   - Permissões (online, exterior, saque)
   - Solicitar segunda via

#### ⚙️ Regras de Negócio:
- Compras devem ter descrição, data e hora
- Verificação de limite disponível
- Registro automático de data/hora nas compras
- Cartão múltiplo (débito + crédito)
- PIN padrão: 1234 (deve ser alterado)
- Bloqueio por motivo (perda, roubo, danificação)
- Segunda via invalida cartão anterior

---

## 🛠️ ESPECIFICAÇÕES TÉCNICAS

### 📡 API Base
- **URL Base:** `http://localhost:3000/api`
- **Autenticação:** JWT Bearer Token
- **Formato:** JSON
- **Versionamento:** v1

### 🔐 Segurança
- Autenticação JWT
- Middleware de autenticação
- Validação de entrada
- Logs de auditoria
- Idempotência em transações

### 📊 Banco de Dados
- TypeORM
- Entidades mapeadas:
  - UsuarioConta
  - Cartao
  - Movimentacao
  - Investment

---

## 📅 CRONOGRAMA SUGERIDO

### Semana 1-2: Setup e Aquisição
- [ ] Configuração do projeto mobile
- [ ] Implementação das telas de onboarding
- [ ] Integração com API de cadastro
- [ ] Testes de cadastro

### Semana 3: Login e Autenticação
- [ ] Tela de login
- [ ] Integração com JWT
- [ ] Gerenciamento de estado de autenticação
- [ ] Testes de login

### Semana 4-6: Funcionalidades de Conta
- [ ] Dashboard principal
- [ ] Consulta de saldo
- [ ] Transferências (PIX e entre contas)
- [ ] Extrato
- [ ] Testes de transações

### Semana 7-8: Investimentos e Pagamentos
- [ ] Telas de investimentos
- [ ] Simulador de investimentos
- [ ] Pagamento de contas
- [ ] Depósitos e saques
- [ ] Testes de investimentos

### Semana 9-10: Cartão de Crédito
- [ ] Gerenciamento de cartões
- [ ] Consulta de fatura
- [ ] Compras no crédito
- [ ] Extrato do cartão
- [ ] Configurações de cartão
- [ ] Testes de crédito

### Semana 11-12: Finalização
- [ ] Testes integrados
- [ ] Ajustes de UX/UI
- [ ] Otimizações de performance
- [ ] Documentação
- [ ] Deploy

---

## ✅ CRITÉRIOS DE ACEITE

### Funcionalidades Obrigatórias:
- ✅ Cadastro completo (nome, CPF, email, senha)
- ✅ Login com CPF e senha
- ✅ Consulta de saldo em tempo real
- ✅ Transferências PIX e entre contas
- ✅ Investimentos (aplicar, resgatar, consultar)
- ✅ Pagamento de contas
- ✅ Extrato detalhado com filtros
- ✅ Consulta de cartão de crédito
- ✅ Consulta de fatura
- ✅ Compras no crédito com descrição, data e hora
- ✅ Extrato de compras da fatura
- ✅ Gerenciamento de cartão (bloquear/desbloquear)

### Requisitos Técnicos:
- ✅ Todas as compras devem ter descrição, data e hora
- ✅ Interface responsiva e intuitiva
- ✅ Integração completa com API existente
- ✅ Tratamento de erros adequado
- ✅ Validações de entrada
- ✅ Segurança nas transações

---

## 🚀 PRÓXIMOS PASSOS

1. **Definir Stack Tecnológico**
   - React Native / Flutter / Native
   - Gerenciamento de estado
   - Bibliotecas de UI

2. **Setup do Ambiente**
   - Configuração do projeto
   - Estrutura de pastas
   - Configuração de build

3. **Prototipação**
   - Wireframes das telas
   - Design system
   - Fluxos de navegação

4. **Desenvolvimento Iterativo**
   - Implementação por etapas
   - Testes contínuos
   - Feedback e ajustes

---

## 📞 CONTATOS E RECURSOS

- **API Documentation:** Swagger disponível em `/swagger.yaml`
- **Postman Collection:** `API-Banco-Principal-Final.postman_collection.json`
- **Guia de Testes:** `GUIA-TESTES-ENDPOINTS.md`
- **Resumo de Funcionalidades:** `RESUMO-NOVAS-FUNCIONALIDADES.md`

---

**Data de Criação:** $(date)
**Versão:** 1.0
**Status:** Pronto para Desenvolvimento 🚀