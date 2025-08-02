# Correção do Fluxo de Cartões - API Banco Principal

## Problema Identificado

O usuário tentou criar cartões de débito via POST /cartoes, mas esse endpoint é destinado apenas para cartões de crédito. O fluxo correto é:

1. **Cartão de Débito**: Criado automaticamente na criação do cliente
2. **Cartão de Crédito**: Solicitado via POST /cartoes (titular ou adicional)

## Correções Realizadas

### 1. Documentação Atualizada

#### REGRAS_API_BANCO_PRINCIPAL.md
- ✅ **Clarificado**: POST /cartoes é apenas para cartões de crédito
- ✅ **Adicionado**: Seção "Fluxo Correto de Teste"
- ✅ **Explicado**: Cartão de débito é criado automaticamente
- ✅ **Incluído**: Exemplos de curls corretos

### 2. Coleção Postman Corrigida

#### API-Banco-Principal.postman_collection.json
- ✅ **Renomeado**: "Criar Cartão de Débito" → "Solicitar Cartão de Crédito Titular"
- ✅ **Adicionado**: "Solicitar Cartão de Crédito Adicional"
- ✅ **Corrigido**: Body das requisições para usar `usuarioId`, `bandeira`, `titularidade`
- ✅ **Atualizado**: Scripts para salvar dados corretos no environment
- ✅ **Adicionado**: Endpoints para bloquear/desbloquear cartões
- ✅ **Incluído**: Endpoint para definir PIN do cartão de débito

### 3. Environment Atualizado

#### API-Banco-Principal.postman_environment.json
- ✅ **Adicionado**: Variáveis para cartão adicional (`cartaoAdicionalId`, `cartaoAdicionalNumero`, `cartaoAdicionalLimite`)
- ✅ **Corrigido**: Variáveis de cartão de crédito (removido PIN, cartões de crédito não têm PIN)
- ✅ **Organizado**: Variáveis por tipo (autenticação, cliente, cartão, transação)

### 4. Guias de Uso Atualizados

#### POSTMAN-SCRIPTS-GUIDE.md
- ✅ **Adicionado**: Seção "Fluxo Correto de Cartões"
- ✅ **Explicado**: Diferença entre cartões de débito e crédito
- ✅ **Incluído**: Troubleshooting para erro comum
- ✅ **Atualizado**: Exemplos de uso corretos

#### TESTE-FLUXO-CORRETO.md (Novo)
- ✅ **Criado**: Arquivo com curls corretos para teste
- ✅ **Explicado**: Regras importantes de cartões
- ✅ **Demonstrado**: Erro comum vs. fluxo correto
- ✅ **Incluído**: Fluxo completo de teste

## Fluxo Correto Implementado

### 1. Criação de Cliente
```bash
POST /clientes
{
    "nomeCompleto": "João Silva Santos",
    "cpf": "12345678901",
    "senha": "SenhaCliente123"
}
```
**Resultado**: Cliente criado + cartão de débito Mastercard criado automaticamente

### 2. Solicitação de Cartões de Crédito
```bash
# Cartão titular
POST /cartoes
{
    "usuarioId": "[ID_DO_CLIENTE]",
    "bandeira": "visa",
    "titularidade": "titular",
    "limite": 5000.00
}

# Cartão adicional
POST /cartoes
{
    "usuarioId": "[ID_DO_CLIENTE]",
    "bandeira": "mastercard",
    "titularidade": "adicional",
    "limite": 2000.00
}
```

### 3. Listagem de Cartões
```bash
GET /cartoes/cliente/[ID_DO_CLIENTE]
```
**Resultado**: Lista todos os cartões (débito + crédito)

## Regras Implementadas

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
- ✅ **Sem PIN** (cartões de crédito não têm PIN)

## Scripts Postman Atualizados

### Variáveis Salvas Automaticamente
- **Criar Cliente**: `clienteId`, `clienteCPF`, `clienteSenha`
- **Cartão Crédito Titular**: `cartaoCreditoId`, `cartaoCreditoNumero`, `cartaoCreditoLimite`
- **Cartão Crédito Adicional**: `cartaoAdicionalId`, `cartaoAdicionalNumero`, `cartaoAdicionalLimite`
- **Transferência**: `transferenciaId`, `transferenciaValor`, `transferenciaData`

### Logs Informativos
```
Cliente criado e dados salvos no environment
Cliente ID: [ID]
Cliente CPF: [CPF]
Cartão de débito criado automaticamente
```

## Benefícios das Correções

### 1. Fluxo Correto
- ✅ Cartão de débito criado automaticamente
- ✅ Cartões de crédito solicitados corretamente
- ✅ Separação clara entre tipos de cartão

### 2. Documentação Clara
- ✅ Regras explicadas detalhadamente
- ✅ Exemplos práticos incluídos
- ✅ Troubleshooting para erros comuns

### 3. Automação Completa
- ✅ Scripts salvam dados corretos
- ✅ Variáveis organizadas por tipo
- ✅ Logs informativos no console

### 4. Facilidade de Teste
- ✅ Fluxo sequencial correto
- ✅ Dados reutilizáveis entre requisições
- ✅ Validação automática de resultados

## Como Testar

### 1. Usando Postman
1. Importe a coleção e environment atualizados
2. Execute a sequência de testes na ordem correta
3. Verifique os logs no console do Postman

### 2. Usando Curl
1. Siga o arquivo `TESTE-FLUXO-CORRETO.md`
2. Execute os comandos na sequência apresentada
3. Verifique os resultados esperados

### 3. Verificação Final
- Cliente criado com sucesso
- Cartão de débito criado automaticamente
- Cartões de crédito solicitados corretamente
- Listagem mostra todos os cartões

## Conclusão

O fluxo de cartões foi corrigido e documentado adequadamente. Agora:

- ✅ **Cartão de débito**: Criado automaticamente na criação do cliente
- ✅ **Cartão de crédito**: Solicitado via POST /cartoes (titular/adicional)
- ✅ **Documentação**: Clara e completa
- ✅ **Scripts Postman**: Atualizados e funcionais
- ✅ **Testes**: Fluxo correto implementado

O sistema está pronto para uso com o fluxo correto de cartões! 