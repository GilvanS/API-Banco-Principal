# Guia de Scripts Postman - API Banco Principal

## Visão Geral

Este guia explica como funcionam os scripts de pre-request e post-response implementados na coleção Postman da API Banco Principal para automatizar a geração de dados e armazenamento no environment.

## Fluxo Correto de Cartões

### Regras Importantes
- **Cartão de Débito**: Criado automaticamente na criação do cliente
- **Cartão de Crédito**: Solicitado via POST /cartoes (titular ou adicional)
- **POST /cartoes**: Apenas para cartões de crédito

## Scripts Implementados

### 1. Script Global de Pre-request

**Localização**: Coleção > Eventos > Pre-request Script

**Função**: Verifica automaticamente se o token de autenticação existe e não expirou. Se não existir ou estiver expirado, faz login automático como admin.

**Código Principal**:
```javascript
// Verificar se o token existe e não expirou
const token = pm.environment.get('authToken');
const tokenExpiry = pm.environment.get('tokenExpiry');

// Se não há token ou expirou, fazer login automático como admin
if (!token || (tokenExpiry && new Date(tokenExpiry) < new Date())) {
    console.log('Token não encontrado ou expirado. Fazendo login automático...');
    
    // Fazer login como admin
    const loginRequest = {
        url: pm.environment.get('baseUrl') + '/auth/login',
        method: 'POST',
        header: {
            'Content-Type': 'application/json'
        },
        body: {
            mode: 'raw',
            raw: JSON.stringify({
                cpf: '00000000000',
                senha: 'AdminSenhaForte123'
            })
        }
    };
    
    pm.sendRequest(loginRequest, function (err, response) {
        if (response.code === 200) {
            const loginResponse = response.json();
            pm.environment.set('authToken', loginResponse.token);
            pm.environment.set('userId', loginResponse.user.id);
            pm.environment.set('userRole', loginResponse.user.role);
            pm.environment.set('tokenExpiry', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
            console.log('Login automático realizado com sucesso');
        }
    });
}
```

### 2. Scripts de Post-Response por Endpoint

#### Login Admin
**Função**: Salva token e dados do usuário admin no environment após login bem-sucedido.

**Variáveis Salvas**:
- `authToken`: Token JWT para autenticação
- `userId`: ID do usuário admin
- `userRole`: Role do usuário (admin)
- `tokenExpiry`: Data de expiração do token

#### Login Cliente
**Função**: Salva dados do cliente logado no environment.

**Variáveis Salvas**:
- `clienteId`: ID do cliente
- `clienteCPF`: CPF do cliente
- `clienteSenha`: Senha do cliente
- `authToken`: Token JWT
- `userRole`: Role do usuário

#### Criar Cliente
**Função**: Salva dados do cliente recém-criado no environment.

**Variáveis Salvas**:
- `clienteId`: ID do cliente criado
- `clienteCPF`: CPF do cliente
- `clienteSenha`: Senha do cliente

**Observação**: Cartão de débito é criado automaticamente na criação do cliente.

#### Criar Segundo Cliente
**Função**: Salva dados do segundo cliente para testes de transferência.

**Variáveis Salvas**:
- `clienteId2`: ID do segundo cliente
- `clienteCPF2`: CPF do segundo cliente

#### Solicitar Cartão de Crédito Titular
**Função**: Salva dados do cartão de crédito titular criado.

**Variáveis Salvas**:
- `cartaoCreditoId`: ID do cartão
- `cartaoCreditoNumero`: Número do cartão
- `cartaoCreditoLimite`: Limite do cartão

#### Solicitar Cartão de Crédito Adicional
**Função**: Salva dados do cartão de crédito adicional criado.

**Variáveis Salvas**:
- `cartaoAdicionalId`: ID do cartão
- `cartaoAdicionalNumero`: Número do cartão
- `cartaoAdicionalLimite`: Limite do cartão

#### Transferência entre Contas
**Função**: Salva dados da transferência realizada.

**Variáveis Salvas**:
- `transferenciaId`: ID da transferência
- `transferenciaValor`: Valor transferido
- `transferenciaData`: Data da transferência

## Variáveis do Environment

### Variáveis de Autenticação
- `baseUrl`: URL base da API (http://localhost:3000)
- `authToken`: Token JWT para autenticação
- `userId`: ID do usuário logado
- `userRole`: Role do usuário (admin/operador)
- `tokenExpiry`: Data de expiração do token

### Variáveis de Cliente
- `clienteId`: ID do primeiro cliente
- `clienteId2`: ID do segundo cliente
- `clienteCPF`: CPF do primeiro cliente
- `clienteCPF2`: CPF do segundo cliente
- `clienteSenha`: Senha do cliente

### Variáveis de Cartão
- `cartaoDebitoId`: ID do cartão de débito (criado automaticamente)
- `cartaoDebitoNumero`: Número do cartão de débito
- `cartaoDebitoPin`: PIN do cartão de débito
- `cartaoCreditoId`: ID do cartão de crédito titular
- `cartaoCreditoNumero`: Número do cartão de crédito titular
- `cartaoCreditoLimite`: Limite do cartão de crédito titular
- `cartaoAdicionalId`: ID do cartão de crédito adicional
- `cartaoAdicionalNumero`: Número do cartão de crédito adicional
- `cartaoAdicionalLimite`: Limite do cartão de crédito adicional

### Variáveis de Transação
- `transferenciaId`: ID da transferência
- `transferenciaValor`: Valor da transferência
- `transferenciaData`: Data da transferência

## Como Usar

### 1. Importar Arquivos
1. Importe a coleção: `API-Banco-Principal.postman_collection.json`
2. Importe o environment: `API-Banco-Principal.postman_environment.json`
3. Selecione o environment "API Banco Principal Environment"

### 2. Executar Sequência de Testes
1. **Health Check**: Verificar se o servidor está funcionando
2. **Login Admin**: Fazer login como administrador (automático via pre-request)
3. **Criar Cliente**: Criar primeiro cliente (cartão de débito criado automaticamente)
4. **Criar Segundo Cliente**: Criar segundo cliente para transferências
5. **Solicitar Cartão de Crédito Titular**: Criar cartão de crédito titular
6. **Solicitar Cartão de Crédito Adicional**: Criar cartão de crédito adicional
7. **Transferência**: Realizar transferência entre contas
8. **Operações**: Testar depósitos, saques e consultas

### 3. Verificar Dados Salvos
Após cada operação, verifique no console do Postman as mensagens de confirmação:
```
Cliente criado e dados salvos no environment
Cliente ID: [ID]
Cliente CPF: [CPF]
Cartão de débito criado automaticamente
```

### 4. Usar Variáveis em Outras Requisições
As variáveis salvas podem ser usadas em outras requisições usando a sintaxe `{{nomeDaVariavel}}`:
- `{{clienteId}}` para referenciar o ID do cliente
- `{{cartaoCreditoId}}` para referenciar o ID do cartão de crédito
- `{{authToken}}` para autenticação automática

## Fluxo Correto de Cartões

### 1. Criação de Cliente
- **Endpoint**: POST /clientes
- **Resultado**: Cliente criado + cartão de débito criado automaticamente
- **Cartão de Débito**: Mastercard, PIN padrão 1234

### 2. Solicitação de Cartões de Crédito
- **Endpoint**: POST /cartoes
- **Tipos**: titular ou adicional
- **Bandeiras**: visa, mastercard, elo, amex
- **Limite**: Configurável

### 3. Listagem de Cartões
- **Endpoint**: GET /cartoes/cliente/:id
- **Resultado**: Lista todos os cartões (débito + crédito)

## Benefícios dos Scripts

### Automação Completa
- Login automático quando necessário
- Salvamento automático de dados gerados
- Reutilização de dados entre requisições

### Facilidade de Teste
- Não precisa copiar/colar IDs manualmente
- Dados são persistidos entre sessões
- Testes podem ser executados em sequência

### Manutenibilidade
- Scripts centralizados e reutilizáveis
- Fácil modificação de lógica
- Logs detalhados para debug

## Troubleshooting

### Token Expirado
Se o token expirar, o script de pre-request fará login automático. Verifique no console:
```
Token não encontrado ou expirado. Fazendo login automático...
Login automático realizado com sucesso
```

### Erro na Criação de Dados
Se houver erro na criação de clientes/cartões, verifique:
- Se o servidor está rodando
- Se as credenciais do admin estão corretas
- Se o banco de dados está acessível

### Variáveis Não Salvas
Se as variáveis não estão sendo salvas:
- Verifique se o environment está selecionado
- Confirme se a resposta da API está no formato esperado
- Verifique os logs no console do Postman

### Erro ao Solicitar Cartão de Débito
**Problema**: Tentar criar cartão de débito via POST /cartoes
**Solução**: Cartão de débito é criado automaticamente na criação do cliente
**Fluxo Correto**: 
1. Criar cliente → cartão de débito criado automaticamente
2. POST /cartoes → apenas para cartões de crédito

## Exemplos de Uso

### Teste Completo de Fluxo
1. Execute "Health Check"
2. Execute "Criar Cliente" (dados salvos automaticamente + cartão de débito criado)
3. Execute "Solicitar Cartão de Crédito Titular" (usa clienteId salvo)
4. Execute "Solicitar Cartão de Crédito Adicional" (usa clienteId salvo)
5. Execute "Listar Cartões do Cliente" (verifica todos os cartões)
6. Execute "Transferência entre Contas" (usa dados salvos)

### Teste de Autenticação
1. Delete a variável `authToken` do environment
2. Execute qualquer requisição que requer autenticação
3. O script de pre-request fará login automático
4. A requisição será executada com o novo token

## Conclusão

Os scripts implementados tornam o teste da API muito mais eficiente e automatizado, eliminando a necessidade de gerenciamento manual de tokens e IDs, e garantindo que os dados sejam persistidos corretamente entre as requisições.

**Fluxo Correto de Cartões**:
- ✅ Cartão de débito: Criado automaticamente na criação do cliente
- ✅ Cartão de crédito: Solicitado via POST /cartoes (titular/adicional)
- ✅ Listagem: GET /cartoes/cliente/:id mostra todos os cartões 