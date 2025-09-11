# Guia de Testes dos Endpoints da API Banco Principal

Este guia apresenta a ordem correta para testar todos os endpoints da API, garantindo que as dependências sejam respeitadas.

## Pré-requisitos

1. **Servidor em execução**: `npm start`
2. **Base URL**: `http://localhost:3000`
3. **Dados de teste disponíveis**: CPF `00000000000` e senha `AdminSenhaForte123`

## Ordem dos Testes

### 1. Health Check
**Endpoint**: `GET /health`
**Propósito**: Verificar se a API está funcionando
**Comando**:
```bash
curl -X GET http://localhost:3000/health
```
**Resposta esperada**: Status 200 com informações do sistema

---

### 2. Autenticação - Login
**Endpoint**: `POST /api/v1/auth/login`
**Propósito**: Obter token JWT para autenticação
**Comando**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"cpf":"00000000000","senha":"AdminSenhaForte123"}'
```
**Resposta esperada**: Token JWT válido
**⚠️ IMPORTANTE**: Salve o token retornado para usar nos próximos testes

---

### 3. Conta - Dados do Usuário
**Endpoint**: `GET /api/v1/account/me`
**Propósito**: Obter dados da conta do usuário autenticado
**Comando**:
```bash
curl -X GET http://localhost:3000/api/v1/account/me \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI'
```
**Resposta esperada**: Dados completos da conta (ID, nome, CPF, agência, conta, saldo)

---

### 4. Conta - Extrato
**Endpoint**: `GET /api/v1/account/statement`
**Propósito**: Consultar extrato da conta
**Comando**:
```bash
curl -X GET http://localhost:3000/api/v1/account/statement \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI'
```
**Resposta esperada**: Lista de transações com paginação

---

### 5. Cartões - Listar
**Endpoint**: `GET /api/v1/cards`
**Propósito**: Listar cartões do usuário
**Comando**:
```bash
curl -X GET http://localhost:3000/api/v1/cards \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI'
```
**Resposta esperada**: Lista de cartões com detalhes (tipo, marca, status, limite)

---

### 6. Cartões - Solicitar Novo
**Endpoint**: `POST /api/v1/cards`
**Propósito**: Solicitar novo cartão
**Comando**:
```bash
curl -X POST http://localhost:3000/api/v1/cards \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{"tipo":"debito","marca":"visa"}'
```
**Resposta esperada**: Confirmação da solicitação ou erro se já possui cartão do tipo

---

### 7. Transações - Depósito
**Endpoint**: `POST /api/v1/transactions/deposit`
**Propósito**: Realizar depósito na conta
**Comando**:
```bash
curl -X POST http://localhost:3000/api/v1/transactions/deposit \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{"amount":100,"description":"Depósito teste via API"}'
```
**Resposta esperada**: Detalhes da transação e novo saldo

---

### 8. Transações - Compra no Crédito
**Endpoint**: `POST /api/v1/transactions/credit-purchase`
**Propósito**: Realizar compra com cartão de crédito
**Comando**:
```bash
curl -X POST http://localhost:3000/api/v1/transactions/credit-purchase \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{"amount":75,"establishment":"Supermercado Teste"}'
```
**Resposta esperada**: Confirmação da compra e limite disponível
**⚠️ NOTA**: Pode apresentar erro se houver problemas na implementação

---

### 9. Investimentos - Resumo
**Endpoint**: `GET /api/v1/investments/summary`
**Propósito**: Consultar resumo dos investimentos
**Comando**:
```bash
curl -X GET http://localhost:3000/api/v1/investments/summary \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI'
```
**Resposta esperada**: Resumo dos investimentos com valores e rentabilidade

---

### 10. Investimentos - Investir
**Endpoint**: `POST /api/v1/investments/apply`
**Propósito**: Realizar novo investimento
**Comando**:
```bash
curl -X POST http://localhost:3000/api/v1/investments/apply \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{"type":"CDB","amount":500,"name":"CDB Teste API","description":"Investimento teste via API"}'
```
**Resposta esperada**: Confirmação do investimento com ID e detalhes

---

### 11. Investimentos - Resgatar
**Endpoint**: `POST /api/v1/investments/:investmentId/redeem`
**Propósito**: Resgatar investimento (total ou parcial)
**Comando**:
```bash
curl -X POST http://localhost:3000/api/v1/investments/SEU_INVESTMENT_ID/redeem \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{"amount":200}'
```
**Resposta esperada**: Confirmação do resgate com valores atualizados
**⚠️ NOTA**: Substitua SEU_INVESTMENT_ID pelo ID retornado no endpoint de investir

---

### 12. Cartões - Troca de Senha (PIN)
**Endpoint**: `PUT /api/v1/cards/:cardId/pin`
**Propósito**: Alterar senha do cartão de débito
**Comando**:
```bash
curl -X PUT http://localhost:3000/api/v1/cards/SEU_CARD_ID/pin \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{"currentPin":"1234","newPin":"5678"}'
```
**Resposta esperada**: Confirmação da alteração da senha
**⚠️ NOTA**: 
- Substitua SEU_CARD_ID pelo ID do cartão (obtido no endpoint GET /api/v1/cards)
- Cartões são criados com senha padrão "1234"
- Apenas cartões de débito permitem alteração de PIN

---

## Endpoints Adicionais (Opcionais)

Estes endpoints podem ser testados conforme necessário:

### Transações - Saque
```bash
curl -X POST http://localhost:3000/api/v1/transactions/withdraw \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{"amount":50,"description":"Saque teste"}'
```

### Transações - Transferência
```bash
curl -X POST http://localhost:3000/api/v1/transactions/transfer \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{"targetAgency":"0001","targetAccount":"123456","targetName":"Destinatário","targetCpf":"12345678901","amount":25,"description":"Transferência teste"}'
```

### Transações - PIX
```bash
curl -X POST http://localhost:3000/api/v1/transactions/pix \
  -H 'Authorization: Bearer SEU_TOKEN_JWT_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{"pixKey":"12345678901","pixType":"cpf","amount":30,"description":"PIX teste"}'
```

---

## Notas Importantes

1. **Token JWT**: Tem validade limitada (30 minutos). Se expirar, refaça o login.
2. **Ordem dos testes**: Siga a sequência apresentada para evitar dependências não atendidas.
3. **Dados de teste**: Use sempre os dados fornecidos para garantir consistência.
4. **Erros esperados**: Alguns endpoints podem retornar erros específicos (ex: "usuário já possui cartão deste tipo").
5. **Swagger**: Consulte `http://localhost:3000/api-docs` para documentação detalhada.

---

## Status dos Testes Realizados

✅ **CONCLUÍDOS:**
- Health Check
- Autenticação (Login)
- Dados da Conta do Usuário
- Extrato da Conta
- Listagem de Cartões
- Depósito
- Resumo de Investimentos
- **Investir** (POST /api/v1/investments/apply)
- **Resgatar Investimento** (POST /api/v1/investments/:id/redeem)
- **Troca de Senha do Cartão** (PUT /api/v1/cards/:cardId/pin)

❌ **PROBLEMAS IDENTIFICADOS:**
- **Compra no Crédito**: Erro "estabelecimento is not defined" no TransacaoService.ts:374
- **Solicitação de Cartão**: Erro esperado (usuário já possui cartões)

⚠️ **OBSERVAÇÕES IMPORTANTES:**
- Token JWT expira em 30 minutos
- Dados de teste: CPF "00000000000", Senha "AdminSenhaForte123"
- Servidor deve estar rodando na porta 3000
- Documentação Swagger disponível em: http://localhost:3000/api-docs
- **Cartões são criados com senha padrão "1234"**
- **Fluxo completo de investimentos está funcional** (investir, consultar, resgatar)  

---

**Última atualização**: Janeiro 2025
**Versão da API**: v1.0.0