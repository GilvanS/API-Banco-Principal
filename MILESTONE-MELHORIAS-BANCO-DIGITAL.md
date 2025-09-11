# MILESTONE: Melhorias da API Banco Digital

## 📋 Visão Geral

Este milestone define um plano estruturado de melhorias para tornar a API do Banco Digital mais robusta, segura e profissional, seguindo as melhores práticas do setor financeiro.

## 🎯 Objetivos

- Implementar idempotência para transações financeiras
- Padronizar nomenclatura e schemas
- Melhorar tratamento de erros
- Otimizar validações e metadados
- Revisar lógica de endpoints

## 📊 Resumo Executivo

| Prioridade | Itens | Estimativa | Impacto |
|------------|-------|------------|----------|
| 🔴 Crítica | 1 | 2-3 semanas | Alto |
| 🟡 Média | 3 | 3-4 semanas | Médio |
| 🟢 Baixa | 1 | 1-2 semanas | Baixo |

---

## 🔴 PRIORIDADE CRÍTICA

### 1. Implementação de Idempotência para Transações Financeiras

**Status:** 🚨 Crítico - Risco de Segurança Financeira

**Problema Identificado:**
- Transações podem ser processadas múltiplas vezes em caso de falha de rede
- Risco de duplicação de transferências, pagamentos e investimentos
- Ausência de controle de idempotência em endpoints transacionais

**Solução Proposta:**
- Implementar header `Idempotency-Key` (UUID) em todos endpoints POST transacionais
- Criar middleware de validação de idempotência
- Armazenar resultados associados às chaves para evitar reprocessamento

**Endpoints Afetados:**
- `/api/v1/transactions/transfer`
- `/api/v1/transactions/deposit`
- `/api/v1/transactions/credit-purchase`
- `/api/v1/transactions/pay-bill`
- `/api/v1/investments/apply`
- `/api/v1/investments/{id}/redeem`

**Implementação Técnica:**
```yaml
# Adicionar em todos endpoints transacionais
parameters:
  - name: Idempotency-Key
    in: header
    required: true
    description: "Chave única (UUID) para garantir que a transação não seja processada mais de uma vez."
    schema:
      type: string
      format: uuid
```

**Critérios de Aceitação:**
- [ ] Middleware de idempotência implementado
- [ ] Todos endpoints transacionais validam Idempotency-Key
- [ ] Testes de duplicação de transações passando
- [ ] Documentação Swagger atualizada
- [ ] Logs de auditoria implementados

**Estimativa:** 2-3 semanas
**Responsável:** Equipe Backend
**Deadline:** [Data a definir]

---

## 🟡 PRIORIDADE MÉDIA

### 2. Padronização da Nomenclatura dos Campos

**Status:** 🔄 Melhoria de Consistência

**Problema Identificado:**
- Mistura de português e inglês nos schemas
- Inconsistência entre `totalInvested/currentValue` e `valorInvestido/valorAtual`
- Confusão para desenvolvedores e consumidores da API

**Solução Proposta:**
- Padronizar todos os campos para português (alinhado com documentação)
- Criar guia de nomenclatura
- Implementar migração gradual

**Campos a Padronizar:**
```yaml
# Antes → Depois
investedAmount → valorInvestido
currentValue → valorAtual
yield → rendimento
totalInvested → totalInvestido
returnPercentage → percentualRetorno
```

**Estimativa:** 1-2 semanas

### 3. Enriquecimento dos Schemas com Validações

**Status:** 🔧 Melhoria Técnica

**Problema Identificado:**
- Schemas sem metadados `readOnly/writeOnly`
- Ausência de validações de formato (pattern)
- Falta de validações específicas para CPF, CVV, datas

**Melhorias Propostas:**

**A) Campos ReadOnly/WriteOnly:**
```yaml
properties:
  id:
    type: string
    format: uuid
    readOnly: true
  senha:
    type: string
    format: password
    writeOnly: true
```

**B) Validações de Formato:**
```yaml
cpf:
  type: string
  pattern: '^[0-9]{11}$'
  example: "12345678901"
cvv:
  type: string
  pattern: '^[0-9]{3,4}$'
  example: "438"
dataValidade:
  type: string
  pattern: '^(0[1-9]|1[0-2])\/([0-9]{2})$'
  example: "08/30"
```

**Estimativa:** 1-2 semanas

### 4. Melhoria do Schema de Tratamento de Erros

**Status:** 🛠️ Melhoria de UX

**Problema Identificado:**
- Mensagens de erro genéricas
- Ausência de códigos de erro para tratamento programático
- Falta de detalhes contextuais

**Schema Aprimorado:**
```yaml
ApiError:
  type: object
  properties:
    errorCode:
      type: string
      description: "Código de erro único para identificação programática"
      example: "INSUFFICIENT_FUNDS"
    message:
      type: string
      description: "Mensagem de erro legível para humanos"
      example: "Saldo insuficiente para realizar a transferência"
    details:
      type: object
      description: "Informações adicionais sobre o erro"
      example:
        currentBalance: 80.00
        transferAmount: 100.00
```

**Códigos de Erro Propostos:**
- `INSUFFICIENT_FUNDS` - Saldo insuficiente
- `INVALID_ACCOUNT` - Conta inválida
- `CARD_BLOCKED` - Cartão bloqueado
- `INVALID_PIN` - PIN incorreto
- `TRANSACTION_LIMIT_EXCEEDED` - Limite excedido

**Estimativa:** 1 semana

---

## 🟢 PRIORIDADE BAIXA

### 5. Revisão da Lógica de Endpoints

**Status:** 🔍 Análise de Negócio

**Pontos de Revisão:**

**A) Compra no Crédito (`/transactions/credit-purchase`):**
- Especificar qual cartão usar quando usuário tem múltiplos
- Adicionar `cardId` obrigatório no requestBody

**B) Transferência (`/transactions/transfer`):**
- Clarificar se é transferência de conta ou débito em cartão
- Revisar necessidade de `cartaoId` e `pin` para transferências bancárias

**C) Estilo RPC vs RESTful:**
- Avaliar endpoints `/cards/{id}/bloquear` e `/cards/{id}/desbloquear`
- Considerar alternativa RESTful: `PATCH /cards/{id}` com `{"status": "bloqueado"}`

**Estimativa:** 1-2 semanas
**Dependência:** Definição de regras de negócio

---

## 📅 Cronograma Proposto

### Fase 1: Segurança Crítica (Semanas 1-3)
- ✅ Implementação de Idempotência
- ✅ Testes de segurança
- ✅ Deploy em ambiente de homologação

### Fase 2: Padronização (Semanas 4-7)
- ✅ Padronização de nomenclatura
- ✅ Enriquecimento de schemas
- ✅ Melhoria de tratamento de erros
- ✅ Atualização da documentação

### Fase 3: Otimização (Semanas 8-9)
- ✅ Revisão de lógica de endpoints
- ✅ Testes finais
- ✅ Deploy em produção

---

## 🧪 Estratégia de Testes

### Testes de Idempotência
- [ ] Teste de duplicação de transações
- [ ] Teste de timeout de rede
- [ ] Teste de chaves inválidas
- [ ] Teste de performance com cache

### Testes de Validação
- [ ] Teste de formatos inválidos (CPF, CVV, datas)
- [ ] Teste de campos obrigatórios
- [ ] Teste de limites de caracteres

### Testes de Erro
- [ ] Teste de códigos de erro específicos
- [ ] Teste de mensagens contextuais
- [ ] Teste de detalhes de erro

---

## 📊 Métricas de Sucesso

### Segurança
- ✅ 0% de transações duplicadas
- ✅ 100% de endpoints transacionais com idempotência
- ✅ Auditoria completa de transações

### Qualidade
- ✅ 100% de schemas padronizados
- ✅ 95% de redução em erros de validação
- ✅ Tempo de resposta mantido < 200ms

### Experiência do Desenvolvedor
- ✅ Documentação Swagger 100% atualizada
- ✅ Códigos de erro documentados
- ✅ Exemplos práticos em todos endpoints

---

## 🚨 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|----------|
| Breaking changes na API | Média | Alto | Versionamento e período de transição |
| Performance degradada | Baixa | Médio | Testes de carga e otimização |
| Resistência da equipe | Baixa | Baixo | Treinamento e documentação |
| Prazo apertado | Média | Médio | Priorização e fases incrementais |

---

## 👥 Equipe e Responsabilidades

- **Tech Lead:** Coordenação geral e arquitetura
- **Backend Developers:** Implementação de idempotência e validações
- **QA Engineers:** Estratégia de testes e validação
- **DevOps:** Deploy e monitoramento
- **Product Owner:** Validação de regras de negócio

---

## 📚 Recursos e Referências

- [RFC 7231 - Idempotent Methods](https://tools.ietf.org/html/rfc7231#section-4.2.2)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [REST API Design Best Practices](https://restfulapi.net/)
- [Financial API Security Guidelines](https://openbanking.org.uk/)

---

**Documento criado em:** [Data atual]
**Última atualização:** [Data atual]
**Versão:** 1.0
**Status:** 📋 Planejamento