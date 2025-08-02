# 🚀 Instruções Rápidas - Postman Collection

## 📥 Importar no Postman (2 minutos)

### 1. Importar Arquivos
```
Postman → Import → File → Selecionar:
├── API-Banco-Principal.postman_collection.json
└── API-Banco-Principal.postman_environment.json
```

### 2. Selecionar Ambiente
```
Canto superior direito → "API Banco Principal - Local"
```

### 3. Verificar Servidor
```bash
# Terminal
npm run dev
# ou
npm start
```

**✅ IMPORTANTE**: O admin é criado automaticamente na primeira execução!
- **CPF**: `00000000000`
- **Senha**: `AdminSenhaForte123`

## 🎯 Teste Rápido (5 minutos)

### 1. Health Check
```
🔧 Setup → Health Check → Send
✅ Deve retornar: {"status":"healthy","database":"connected"}
```

### 2. Login Automático
```
🔐 Autenticação → Login Admin → Send
✅ Token salvo automaticamente (ver console)
```

### 3. Criar Cliente
```
👥 Gestão de Clientes → Criar Cliente → Send
✅ Cliente criado com cartão de débito automático
```

### 4. Testar Funcionalidades
```
💳 Gestão de Cartões → Solicitar Cartão de Crédito → Send
💰 Operações Financeiras → Compra no Crédito → Send
👨‍💼 Funcionalidades de Admin → Gerar Relatório Geral → Send
```

## 🔧 Funcionalidades Automáticas

### ✅ Autenticação Automática
- Token verificado antes de cada requisição
- Login automático se token expirou
- Renovação automática de tokens

### ✅ Salvamento Automático de IDs
- `clienteId`: Salvo após criar cliente
- `cartaoDebitoId`: Salvo após criar cliente
- `cartaoCreditoId`: Salvo após solicitar cartão
- `authToken`: Salvo após login

### ✅ Logs Automáticos
- Console do Postman mostra todas as operações
- IDs salvos automaticamente
- Status de autenticação

## 📋 Variáveis Importantes

| Variável | Descrição | Preenchimento |
|----------|-----------|---------------|
| `baseUrl` | URL da API | Manual (http://localhost:3000) |
| `authToken` | Token JWT | Automático |
| `clienteId` | ID do cliente | Automático |
| `cartaoDebitoId` | ID cartão débito | Automático |
| `cartaoCreditoId` | ID cartão crédito | Automático |

## 🚨 Troubleshooting Rápido

### Erro 401 - Não Autorizado
```
🔐 Autenticação → Login Admin → Send
```

### Erro 400 - Dados Inválidos
```
Verificar se CPF não está duplicado
Alterar CPF no body da requisição
```

### Servidor não responde
```bash
# Terminal
npm start
# Verificar porta 3000
```

## 🎉 Pronto!

Agora você pode testar toda a API de forma automatizada!

**Links Úteis:**
- 📖 Documentação: http://localhost:3000/api-docs
- 🔍 Health Check: http://localhost:3000/health
- 📚 Guia Completo: README-POSTMAN.md 