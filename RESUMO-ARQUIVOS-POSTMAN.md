# Resumo dos Arquivos Postman Gerados

## Arquivos Criados

### 1. Coleção Postman
**Arquivo**: `API-Banco-Principal-Final.postman_collection.json`

**Características**:
- Coleção completa para testar a API Banco Principal
- Fluxo correto de cartões implementado
- Scripts de pre-request e post-response automatizados
- Organização em pastas por funcionalidade

**Estrutura**:
- Setup Inicial: Health Check
- Autenticação: Login Admin
- Gestão de Clientes: Criar, listar, buscar clientes
- Gestão de Cartões: Solicitar crédito, listar, bloquear/desbloquear
- Operações Financeiras: Transferência, depósito, saque
- Funcionalidades Admin: Listar usuários, estatísticas

### 2. Environment Postman
**Arquivo**: `API-Banco-Principal-Final.postman_environment.json`

**Características**:
- Environment completo com todas as variáveis necessárias
- Variáveis organizadas por tipo (autenticação, cliente, cartão, transação)
- Configuração para ambiente local (localhost:3000)

**Variáveis Incluídas**:
- Autenticação: authToken, userId, userRole, tokenExpiry
- Cliente: clienteId, clienteId2, clienteCPF, clienteCPF2, clienteSenha
- Cartão: cartaoDebitoId, cartaoCreditoId, cartaoAdicionalId e respectivos dados
- Transação: transferenciaId, transferenciaValor, transferenciaData

### 3. Guia de Scripts
**Arquivo**: `GUIA-SCRIPTS-POSTMAN.md`

**Características**:
- Documentação completa dos scripts implementados
- Explicação do fluxo correto de cartões
- Instruções de uso detalhadas
- Troubleshooting para problemas comuns

## Scripts Implementados

### Script Global de Pre-request
**Função**: Autenticação automática
- Verifica se o token existe e não expirou
- Faz login automático como admin se necessário
- Salva token e dados do usuário no environment

### Scripts de Post-Response
**Função**: Salvamento automático de dados
- Login Admin: Salva token e dados do usuário
- Criar Cliente: Salva dados do cliente criado
- Criar Segundo Cliente: Salva dados do segundo cliente
- Solicitar Cartão de Crédito: Salva dados dos cartões criados
- Listar Cartões: Salva dados do cartão de débito automaticamente
- Transferência: Salva dados da transferência realizada

## Fluxo Correto de Cartões

### Regras Implementadas
- **Cartão de Débito**: Criado automaticamente na criação do cliente
- **Cartão de Crédito**: Solicitado via POST /cartoes (titular ou adicional)
- **POST /cartoes**: Apenas para cartões de crédito

### Sequência de Teste
1. Criar Cliente → Cartão de débito criado automaticamente
2. Solicitar Cartão de Crédito Titular → Via POST /cartoes
3. Solicitar Cartão de Crédito Adicional → Via POST /cartoes
4. Listar Cartões → Verificar todos os cartões (débito + crédito)

## Como Usar

### 1. Importar Arquivos
1. Abra o Postman
2. Clique em "Import"
3. Selecione os arquivos:
   - `API-Banco-Principal-Final.postman_collection.json`
   - `API-Banco-Principal-Final.postman_environment.json`
4. Selecione o environment "API Banco Principal - Environment Final"

### 2. Executar Testes
1. Execute "Health Check" para verificar o servidor
2. Execute "Login Admin" para autenticação
3. Execute "Criar Cliente" para criar primeiro cliente
4. Execute "Criar Segundo Cliente" para criar segundo cliente
5. Execute "Solicitar Cartão de Crédito Titular"
6. Execute "Solicitar Cartão de Crédito Adicional"
7. Execute "Listar Cartões do Cliente" para verificar
8. Execute "Transferência entre Contas" para testar operações

### 3. Verificar Resultados
- Console do Postman mostra logs detalhados
- Environment salva automaticamente os dados
- Variáveis podem ser usadas em outras requisições

## Benefícios

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

### Problemas Comuns
1. **Token Expirado**: Script de pre-request faz login automático
2. **Variáveis Não Salvas**: Verificar se environment está selecionado
3. **Erro na Criação**: Verificar se servidor está rodando
4. **Cartão de Débito**: Não pode ser solicitado via POST /cartoes

### Soluções
- Verificar logs no console do Postman
- Confirmar se environment está selecionado
- Verificar se servidor está funcionando
- Seguir fluxo correto de cartões

## Conclusão

Os arquivos Postman gerados fornecem uma solução completa para testar a API Banco Principal com:

- Automação completa de autenticação
- Salvamento automático de dados
- Fluxo correto de cartões implementado
- Documentação detalhada de uso
- Troubleshooting para problemas comuns

O sistema está pronto para uso com automação completa e fluxo correto de cartões. 