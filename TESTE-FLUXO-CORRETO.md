# Teste do Fluxo Correto - API Banco Principal

## Fluxo Correto de Cartões

### 1. Login como Admin
```bash
curl --location 'http://localhost:3000/auth/login' \
--header 'Content-Type: application/json' \
--data '{
    "cpf": "00000000000",
    "senha": "AdminSenhaForte123"
}'
```

### 2. Criar Cliente (Cartão de Débito é Criado Automaticamente)
```bash
curl --location 'http://localhost:3000/clientes' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [TOKEN_ADMIN]' \
--data '{
    "nomeCompleto": "João Silva Santos",
    "cpf": "12345678901",
    "senha": "SenhaCliente123"
}'
```

**Resultado**: Cliente criado + cartão de débito Mastercard criado automaticamente

### 3. Solicitar Cartão de Crédito Titular
```bash
curl --location 'http://localhost:3000/cartoes' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [TOKEN_ADMIN]' \
--data '{
    "usuarioId": "[ID_DO_CLIENTE]",
    "bandeira": "visa",
    "titularidade": "titular",
    "limite": 5000.00
}'
```

### 4. Solicitar Cartão de Crédito Adicional
```bash
curl --location 'http://localhost:3000/cartoes' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [TOKEN_ADMIN]' \
--data '{
    "usuarioId": "[ID_DO_CLIENTE]",
    "bandeira": "mastercard",
    "titularidade": "adicional",
    "limite": 2000.00
}'
```

### 5. Listar Cartões do Cliente
```bash
curl --location 'http://localhost:3000/cartoes/cliente/[ID_DO_CLIENTE]' \
--header 'Authorization: Bearer [TOKEN_ADMIN]'
```

**Resultado Esperado**: 3 cartões
- 1 cartão de débito (criado automaticamente)
- 1 cartão de crédito titular
- 1 cartão de crédito adicional

## Regras Importantes

### Cartões de Débito
- ✅ **Criados automaticamente** na criação do cliente
- ✅ **Bandeira padrão**: Mastercard
- ✅ **PIN padrão**: 1234
- ✅ **Não podem ser solicitados** via POST /cartoes

### Cartões de Crédito
- ✅ **Solicitados via POST /cartoes**
- ✅ **Tipos**: titular ou adicional
- ✅ **Bandeiras**: visa, mastercard, elo, amex
- ✅ **Limite configurável**

## Erro Comum

### ❌ INCORRETO - Tentar criar cartão de débito via POST /cartoes
```bash
# ISSO NÃO FUNCIONA!
curl --location 'http://localhost:3000/cartoes' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [TOKEN_ADMIN]' \
--data '{
    "clienteId": "[ID_DO_CLIENTE]",
    "tipo": "debito",  # ❌ ERRO - POST /cartoes é apenas para crédito
    "bandeira": "visa",
    "limite": 1000.00
}'
```

**Erro esperado**: Validação falha porque `tipo` não é aceito no endpoint POST /cartoes

### ✅ CORRETO - Cartão de débito é criado automaticamente
```bash
# Ao criar cliente, o cartão de débito é criado automaticamente
curl --location 'http://localhost:3000/clientes' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [TOKEN_ADMIN]' \
--data '{
    "nomeCompleto": "João Silva Santos",
    "cpf": "12345678901",
    "senha": "SenhaCliente123"
}'
```

## Fluxo Completo de Teste

### 1. Setup
```bash
# Login como admin
curl --location 'http://localhost:3000/auth/login' \
--header 'Content-Type: application/json' \
--data '{
    "cpf": "00000000000",
    "senha": "AdminSenhaForte123"
}'
```

### 2. Criar Cliente
```bash
# Criar cliente (cartão de débito criado automaticamente)
curl --location 'http://localhost:3000/clientes' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [TOKEN_ADMIN]' \
--data '{
    "nomeCompleto": "João Silva Santos",
    "cpf": "12345678901",
    "senha": "SenhaCliente123"
}'
```

### 3. Solicitar Cartões de Crédito
```bash
# Cartão titular
curl --location 'http://localhost:3000/cartoes' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [TOKEN_ADMIN]' \
--data '{
    "usuarioId": "[ID_DO_CLIENTE]",
    "bandeira": "visa",
    "titularidade": "titular",
    "limite": 5000.00
}'

# Cartão adicional
curl --location 'http://localhost:3000/cartoes' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer [TOKEN_ADMIN]' \
--data '{
    "usuarioId": "[ID_DO_CLIENTE]",
    "bandeira": "mastercard",
    "titularidade": "adicional",
    "limite": 2000.00
}'
```

### 4. Verificar Resultado
```bash
# Listar todos os cartões do cliente
curl --location 'http://localhost:3000/cartoes/cliente/[ID_DO_CLIENTE]' \
--header 'Authorization: Bearer [TOKEN_ADMIN]'
```

## Resumo do Fluxo

1. **Criar Cliente** → Cartão de débito criado automaticamente
2. **POST /cartoes** → Apenas para cartões de crédito (titular/adicional)
3. **GET /cartoes/cliente/:id** → Lista todos os cartões (débito + crédito)

## Dados de Teste

- **Admin**: CPF 00000000000, Senha AdminSenhaForte123
- **Cliente**: CPF 12345678901, Senha SenhaCliente123
- **Cartão Débito**: Criado automaticamente (Mastercard, PIN: 1234)
- **Cartão Crédito Titular**: Visa, Limite: R$ 5.000,00
- **Cartão Crédito Adicional**: Mastercard, Limite: R$ 2.000,00 