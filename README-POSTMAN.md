# 📚 Guia de Uso - Postman Collection API Banco Principal

## 🚀 Configuração Inicial

### 1. Importar Arquivos no Postman

1. **Abra o Postman**
2. **Importe a Coleção:**
   - Clique em "Import" → "File" → Selecione `API-Banco-Principal.postman_collection.json`
3. **Importe o Ambiente:**
   - Clique em "Import" → "File" → Selecione `API-Banco-Principal.postman_environment.json`
4. **Selecione o Ambiente:**
   - No canto superior direito, selecione "API Banco Principal - Local"

### 2. Verificar Configuração

- **baseUrl**: `http://localhost:3000` (já configurado)
- **Servidor**: Certifique-se de que está rodando (`npm run dev` ou `npm start`)

**✅ IMPORTANTE**: O admin é criado automaticamente na primeira execução!
- **CPF**: `00000000000`
- **Senha**: `AdminSenhaForte123`

## 🔧 Como Usar

### **Autenticação Automática**

A coleção possui um script de **Pre-request** que:
- ✅ Verifica se existe token válido
- ✅ Faz login automático como admin se necessário
- ✅ Salva o token nas variáveis de ambiente
- ✅ Renova o token automaticamente antes de expirar

### **Fluxo de Teste Recomendado**

#### **1. Setup e Configuração**
```
🔧 Setup e Configuração
├── Health Check ✅
└── Info da API ✅
```

#### **2. Autenticação**
```
🔐 Autenticação
├── Login Admin ✅ (automático)
└── Login Cliente (opcional)
```

#### **3. Gestão de Clientes**
```
👥 Gestão de Clientes
├── Criar Cliente ✅ (salva IDs automaticamente)
├── Listar Clientes
├── Consultar Cliente
└── Consultar Saldo
```

#### **4. Gestão de Cartões**
```
💳 Gestão de Cartões
├── Solicitar Cartão de Crédito ✅ (salva ID automaticamente)
├── Listar Cartões do Cliente
├── Alterar PIN do Cartão
├── Bloquear Cartão
└── Desbloquear Cartão
```

#### **5. Operações Financeiras**
```
💰 Operações Financeiras
├── Transferência entre Contas
├── Compra no Crédito
├── Pagar Fatura
└── Consultar Extrato
```

#### **6. Funcionalidades de Admin**
```
👨‍💼 Funcionalidades de Admin
├── Atualizar Limites do Cliente
├── Bloquear/Desbloquear Conta
├── Atualizar Limite do Cartão
├── Desativar Cliente
└── Gerar Relatório Geral
```

## 📋 Variáveis de Ambiente

### **Variáveis Automáticas (Preenchidas pelos Scripts)**
- `authToken`: Token JWT (preenchido automaticamente)
- `userId`: ID do usuário logado
- `userRole`: Role do usuário (admin/operador)
- `clienteId`: ID do cliente criado
- `clienteCPF`: CPF do cliente criado
- `clienteSenha`: Senha do cliente criado
- `cartaoDebitoId`: ID do cartão de débito
- `cartaoCreditoId`: ID do cartão de crédito
- `tokenExpiry`: Timestamp de expiração do token

### **Variáveis Manuais (Opcionais)**
- `clienteId2`: ID de um segundo cliente (para transferências)
- `baseUrl`: URL base da API (padrão: http://localhost:3000)

## 🔄 Scripts Automáticos

### **Pre-request Script (Global)**
```javascript
// Verifica token e faz login automático se necessário
const authToken = pm.environment.get('authToken');
const tokenExpiry = pm.environment.get('tokenExpiry');
const currentTime = new Date().getTime();

if (!authToken || !tokenExpiry || currentTime > parseInt(tokenExpiry)) {
    // Faz login automático como admin
    // Salva token e dados do usuário
}
```

### **Test Scripts (Por Endpoint)**

#### **Login Admin/Cliente**
```javascript
// Salva token e dados do usuário automaticamente
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set('authToken', response.token);
    pm.environment.set('userId', response.usuario.id);
    pm.environment.set('userRole', response.usuario.role);
}
```

#### **Criar Cliente**
```javascript
// Salva dados do cliente criado
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set('clienteId', response.id);
    pm.environment.set('clienteCPF', response.cpf);
    pm.environment.set('cartaoDebitoId', response.cartoes[0].id);
}
```

#### **Solicitar Cartão de Crédito**
```javascript
// Salva ID do cartão de crédito
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set('cartaoCreditoId', response.id);
}
```

## 🧪 Exemplos de Teste

### **Teste Completo de Fluxo**

1. **Execute "Health Check"** - Verifica se a API está funcionando
2. **Execute "Criar Cliente"** - Cria cliente e salva IDs automaticamente
3. **Execute "Solicitar Cartão de Crédito"** - Cria cartão de crédito
4. **Execute "Compra no Crédito"** - Testa compra no cartão
5. **Execute "Consultar Extrato"** - Verifica movimentações
6. **Execute "Gerar Relatório Geral"** - Testa funcionalidade admin

### **Teste de Transferência**

1. **Crie dois clientes** (execute "Criar Cliente" duas vezes)
2. **Copie o ID do segundo cliente** para a variável `clienteId2`
3. **Execute "Transferência entre Contas"**
4. **Verifique os extratos** de ambos os clientes

## 🔍 Troubleshooting

### **Problemas Comuns**

#### **Erro 401 - Não Autorizado**
- ✅ Verifique se o servidor está rodando
- ✅ Execute "Login Admin" para obter novo token
- ✅ Verifique se o token não expirou

#### **Erro 400 - Dados Inválidos**
- ✅ Verifique se os IDs estão corretos
- ✅ Verifique se o CPF não está duplicado
- ✅ Verifique se os valores estão no formato correto

#### **Erro 403 - Acesso Negado**
- ✅ Verifique se está usando token de admin para rotas admin
- ✅ Execute "Login Admin" para obter token com role admin

#### **Token Expirado**
- ✅ O script automático deve renovar o token
- ✅ Se não funcionar, execute "Login Admin" manualmente

### **Logs do Console**

Abra o console do Postman (View → Show Postman Console) para ver:
- ✅ Logs de autenticação automática
- ✅ IDs salvos automaticamente
- ✅ Erros e avisos

## 📊 Monitoramento

### **Variáveis para Acompanhar**
- `authToken`: Token atual (primeiros 20 caracteres)
- `userRole`: Role do usuário logado
- `clienteId`: ID do cliente ativo
- `cartaoDebitoId`: ID do cartão de débito
- `cartaoCreditoId`: ID do cartão de crédito

### **Verificar Status**
- **Health Check**: `GET /health`
- **Token Válido**: Verificar console do Postman
- **Dados Salvos**: Verificar variáveis de ambiente

## 🎯 Dicas de Uso

### **Para Desenvolvedores**
1. **Use o Health Check** antes de qualquer teste
2. **Monitore o console** para logs automáticos
3. **Verifique as variáveis** após cada operação
4. **Use o script automático** para não se preocupar com tokens

### **Para Testes**
1. **Execute em sequência** conforme o fluxo recomendado
2. **Verifique respostas** para garantir sucesso
3. **Use dados únicos** (CPFs diferentes) para evitar conflitos
4. **Limpe variáveis** se necessário reiniciar testes

### **Para Demonstração**
1. **Prepare dados** executando o fluxo completo
2. **Tenha exemplos prontos** de cada funcionalidade
3. **Mostre logs automáticos** para demonstrar automação
4. **Use diferentes cenários** (sucesso, erro, validação)

## 🔗 Links Úteis

- **Documentação Swagger**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **Info da API**: http://localhost:3000/

## 📝 Notas Importantes

- ✅ **Autenticação automática** funciona para todas as requisições
- ✅ **IDs são salvos automaticamente** após criação
- ✅ **Tokens são renovados** antes de expirar
- ✅ **Logs detalhados** no console do Postman
- ✅ **Variáveis organizadas** por funcionalidade

---

**🎉 Agora você pode testar toda a API de forma automatizada e eficiente!** 