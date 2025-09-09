# Milestone: API de Aquisição Simplificada (NuvemBank)

## Task 1: Configuração e Autenticação Simplificada
- **Issue:** Remover Módulo de Administração
  - [x] Excluir rotas e lógicas da role `admin`.
  - [x] Remover ou padronizar o campo `role` no modelo `UsuarioConta`.
- **Issue:** Remover Módulo de Dispositivos
  - [x] Excluir o modelo `Device` e suas referências.
- **Issue:** Configurar Geração de Token Inicial Simplificada
  - [x] Manter o endpoint `POST /auth/login`.
  - [x] Ajustar a validade do token JWT para 30 minutos.
  - [x] Remover lógicas de `forgot-password` e `reset-password`.
- **Issue:** Padronizar Rotas para `/api/v1/`
  - [x] Mover todas as rotas para o prefixo `/api/v1/`.

## Task 2: Módulo de Clientes e Contas (Aquisição)
- **Issue:** Endpoint: Criar Novo Cliente e Conta (`POST /api/v1/clientes`)
  - [x] Criar `UsuarioConta` e `Cartao` de débito automaticamente.
  - [x] Simplificar o modelo, removendo `tipoConta` se for padrão.
  - [x] Garantir que `cpf` e `email` sejam únicos.
- **Issue:** Endpoint: Obter Detalhes da Conta do Usuário Autenticado (`GET /api/v1/account/me`)
  - [x] Permitir que o usuário autenticado obtenha os detalhes de sua `UsuarioConta`.
- **Issue:** Endpoint: Atualizar Dados do Perfil (`PATCH /api/v1/users/me/profile`)
  - [x] Permitir que o usuário autenticado atualize seus dados básicos.

## Task 3: Módulo de Cartões
- **Issue:** Endpoint: Solicitar Cartão de Crédito (`POST /api/v1/cards/credit-request`)
  - [x] Permitir a solicitação de cartão de crédito usando o `usuarioId` do token.
  - [x] Atribuir um limite de crédito padrão para testes.
- **Issue:** Endpoint: Listar Meus Cartões (`GET /api/v1/cards`)
  - [x] Permitir que o usuário autenticado liste seus cartões.
- **Issue:** Endpoints: Gerenciamento de Cartão
  - [x] Manter `PATCH /api/v1/cards/{id}/pin`.
  - [x] Manter `PATCH /api/v1/cards/{id}/block`.
  - [x] Manter `PATCH /api/v1/cards/{id}/unblock`.

## Task 4: Módulo de Transações Financeiras (Geração de Massa)
- **Issue:** Endpoint: Depósito (`POST /api/v1/transactions/deposit`)
  - [x] Implementar lógica para simular depósitos.
- **Issue:** Endpoint: Transferência (`POST /api/v1/transactions/transfer`)
  - [x] Implementar lógica para transferências entre contas.
- **Issue:** Endpoint: Compra no Crédito (`POST /api/v1/transactions/credit-purchase`)
  - [x] Implementar lógica para simular compras no crédito.
- **Issue:** Endpoint: Pagar Fatura (`POST /api/v1/transactions/pay-bill`)
  - [x] Implementar lógica para simular pagamento de fatura.
- **Issue:** Endpoint: Obter Extrato da Conta (`GET /api/v1/account/statement`)
  - [x] Implementar filtros por data e tipo de transação.

## Task 5: Módulo de Investimentos (Básico para Massa)
- **Issue:** Endpoint: Resumo de Investimentos (`GET /api/v1/investments/summary`)
  - [x] Manter endpoint para o usuário ver o resumo de seus investimentos.
- **Issue:** Simplificar Módulo de Investimentos
  - [x] Remover "Consultar poupança" se não for essencial.
  - [x] Simplificar os tipos de `Investment` se for apenas para massa de dados.

## Task 6: Testes Automatizados
- **Issue:** Revisar e Atualizar Testes Existentes
  - [x] Garantir que os testes reflitam as novas mudanças.
- **Issue:** Adicionar Testes para Novos Cenários de Massa
  - [ ] Criar testes para os novos cenários de geração de massa.

## Task 7: Documentação e Qualidade
- **Issue:** Atualizar `README.md`
  - [ ] Refletir a nova estrutura da API e o propósito do projeto.
- **Issue:** Gerar o novo arquivo Swagger/OpenAPI
  - [ ] Garantir que a documentação da API esteja atualizada.

## Task 8: Correção de Erros
- **Issue:** Corrigir erro de tipagem no TransacaoService.ts
  - [x] Resolver erro TS2322 na linha 284 do TransacaoService.ts
  - [x] Substituir string literal "debito" por TipoCartao.DEBITO
- **Issue:** Corrigir propriedades inexistentes nos objetos de resposta
  - [x] Atualizar todas as rotas para usar as propriedades corretas dos objetos de resposta
  - [x] Substituir referências a `req.user` por `req.usuario`

## Task 9: Análise e Refatoração Sistemática
- **Issue:** Mapeamento completo das referências a `req.user`
  - [x] Identificar sistematicamente todos os arquivos que usam `req.user`
  - [x] Atualizar todas as referências para `req.usuario`
- **Issue:** Verificação de métodos inexistentes
  - [x] Mapear todos os métodos chamados no `TransacaoService`
  - [x] Garantir que todos os métodos chamados realmente existam
- **Issue:** Estratégia de verificação estática
  - [x] Executar verificação estática do TypeScript antes dos testes
  - [x] Resolver todos os erros de compilação antes de executar testes

## Task 10: Consideração de Alternativas
- **Issue:** Avaliação de frameworks/dependências
  - [x] Analisar se é viável utilizar outro framework para resolver os problemas
  - [x] Documentar prós e contras de possíveis alternativas
