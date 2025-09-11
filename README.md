# API Banco Principal

Esta é uma API REST completa para um sistema bancário digital moderno, desenvolvida em Node.js com TypeScript. A API oferece funcionalidades essenciais para operações bancárias, incluindo gerenciamento de contas, cartões, transações financeiras e investimentos.

## 🏗️ Arquitetura e Tecnologias

- **Backend**: Node.js com TypeScript e Express.js
- **Banco de Dados**: TypeORM com suporte a múltiplos SGBDs
- **Autenticação**: JWT (JSON Web Tokens)
- **Documentação**: Swagger/OpenAPI 3.0
- **Testes**: Jest com cobertura de testes unitários e de integração
- **Validação**: Middleware personalizado para validação de dados
- **Logs**: Sistema de logging estruturado

## 🎯 Funcionalidades Principais

### Autenticação e Autorização
- ✅ Registro de novos usuários
- ✅ Login com CPF e senha
- ✅ Autenticação JWT
- ✅ Middleware de autorização

### Gerenciamento de Contas
- ✅ Criação automática de conta corrente
- ✅ Consulta de dados da conta
- ✅ Extrato detalhado com filtros
- ✅ Controle de limites diários

### Cartões
- ✅ Solicitação de cartão de crédito
- ✅ Consulta de cartões do usuário
- ✅ Gerenciamento de limites de crédito
- ✅ Controle de crédito utilizado

### Transações Financeiras
- ✅ Depósitos em conta
- ✅ Transferências entre contas
- ✅ Compras no cartão de crédito
- ✅ Pagamento de faturas
- ✅ Histórico completo de transações

### Investimentos
- ✅ Resumo de investimentos
- ✅ Cálculo de rentabilidade
- ✅ Portfólio diversificado

## 📋 Endpoints da API

### Autenticação (`/api/v1/auth`)
- `POST /register` - Registro de novo usuário
- `POST /login` - Login do usuário

### Conta (`/api/v1/account`)
- `GET /profile` - Dados do perfil do usuário
- `GET /statement` - Extrato da conta com filtros

### Cartões (`/api/v1/cards`)
- `GET /` - Lista cartões do usuário
- `POST /request` - Solicitação de cartão de crédito

### Transações (`/api/v1/transactions`)
- `POST /deposit` - Depósito em conta
- `POST /transfer` - Transferência entre contas
- `POST /credit-purchase` - Compra no cartão de crédito
- `POST /pay-bill` - Pagamento de faturas

### Investimentos (`/api/v1/investments`)
- `GET /summary` - Resumo de investimentos e rentabilidade

## 🔒 Segurança

- **Autenticação JWT**: Tokens seguros com expiração configurável
- **Validação de Dados**: Middleware robusto para validação de entrada
- **Controle de Limites**: Limites diários para débito e crédito
- **Logs de Auditoria**: Registro detalhado de todas as operações
- **Middleware de Segurança**: Headers de segurança e proteção CORS

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js (versão 16 ou superior)
- npm ou yarn
- Banco de dados compatível com TypeORM

### Instalação
```bash
# Clone o repositório
git clone <repository-url>
cd API-Banco-Principal

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### Configuração do Banco de Dados
```bash
# Execute as migrações
npm run migration:run

# (Opcional) Execute os seeds para dados de teste
npm run seed
```

### Execução

#### Modo Desenvolvimento
```bash
npm run dev
```

#### Modo Produção
```bash
npm run build
npm start
```

### Testes
```bash
# Executar todos os testes
npm test

# Executar testes com cobertura
npm run test:coverage

# Executar testes de integração
npm run test:integration
```

### Acesso à API

- **Servidor Local**: http://localhost:3000
- **Documentação Swagger**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## 📊 Estrutura do Projeto

```
src/
├── controllers/     # Controladores da API
├── services/        # Lógica de negócio
├── entities/        # Entidades do banco de dados
├── routes/          # Definição das rotas
├── middleware/      # Middlewares personalizados
├── database/        # Configuração do banco de dados
├── utils/           # Utilitários e helpers
└── types/           # Definições de tipos TypeScript

tests/
├── unit/            # Testes unitários
├── integration/     # Testes de integração
└── fixtures/        # Dados de teste
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas, entre em contato através dos issues do GitHub ou consulte a documentação completa no Swagger.