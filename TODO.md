# Roteiro de Próximas Etapas e Melhorias

Este documento detalha as funcionalidades, melhorias e correções de segurança pendentes para a API Banco Principal.

---

## 1. Segurança (Crítico)

A segurança é o ponto mais importante em qualquer aplicação financeira.

### 1.1. Armazenar o PIN do Cartão com Hash
- **O que falta?** Atualmente, o PIN do cartão de débito está sendo salvo como texto puro no banco de dados. Isso é uma falha de segurança grave.
- **Ação Recomendada:** Usar `bcrypt` para gerar um hash do PIN antes de salvá-lo, da mesma forma que a senha do usuário é tratada. O serviço de transferência precisará ser ajustado para usar `bcrypt.compare` para validar o PIN.

### 1.2. Gerenciamento de Segredos (JWT Secret)
- **O que falta?** O segredo do JWT possui um valor padrão no código (`"desenvolvimento_chave_secreta_padrao"`). Isso nunca deve ir para produção.
- **Ação Recomendada:** Garantir que a aplicação falhe ao iniciar se a variável de ambiente `JWT_SECRET` não estiver definida, removendo o valor padrão.

---

## 2. Funcionalidades Essenciais Faltantes

Estas são as principais funcionalidades que um usuário esperaria de um sistema bancário.

### 2.1. Saldo Real da Conta Corrente
- **O que falta?** A lógica de transferência atual usa o `limiteDebitoDiario` como um substituto para o saldo da conta. Uma conta real precisa de um campo `saldo`.
- **Ação Recomendada:**
    1. Adicionar um campo `saldo` à entidade `UsuarioConta`.
    2. Modificar o serviço de transferência para debitar o valor diretamente do `saldo` do remetente e creditar no `saldo` do destinatário.
    3. O `limiteDebitoDiario` deve ser usado apenas como uma verificação de segurança adicional, não como a fonte dos fundos.

### 2.2. Fatura e Pagamento do Cartão de Crédito
- **O que falta?** Os clientes podem fazer compras no crédito, mas não há como pagar a fatura. O `creditoUtilizado` só aumenta.
- **Ação Recomendada:**
    1. **Endpoint de Pagamento de Fatura:** Criar uma rota `POST /transacoes/pagar-fatura-credito` onde o cliente informa o valor a ser pago.
    2. **Lógica de Serviço:** O serviço deve debitar o valor do `saldo` da conta do cliente e abater esse mesmo valor do `creditoUtilizado`.
    3. **(Avançado) Geração de Fatura:** Implementar um processo (por exemplo, um cron job mensal) que "fecha" a fatura, calculando o total a pagar e a data de vencimento.

---

## 3. Melhorias na API e Experiência do Usuário (UX)

Melhorias que tornam a API mais robusta e fácil de usar.

### 3.1. Fluxo de Definição e Recuperação do PIN
- **O que falta?** O PIN do cartão de débito é gerado aleatoriamente, mas o cliente não tem como saber qual é o seu PIN.
- **Ação Recomendada:**
    1. **Endpoint para Definir/Alterar PIN:** Criar uma rota segura, como `PATCH /cartoes/{id}/definir-pin`, para que o usuário logado possa definir o PIN do seu próprio cartão.
    2. **Segurança:** Esta operação deve exigir a senha do usuário como confirmação.

### 3.2. Padronização de Erros
- **O que falta?** Os erros lançados no `TransacaoService` são capturados no controller e retornados como uma mensagem genérica (`{ message: error.message }`).
- **Ação Recomendada:** Padronizar todos os erros para usar a mesma estrutura do `ApiError` definida no `swagger.yaml`, retornando `type`, `title`, `status`, `detail`, e `instance`.

---

## 4. Qualidade de Código e Boas Práticas

Itens que aumentam a manutenibilidade e a confiabilidade do projeto.

### 4.1. Testes Unitários e de Integração
- **O que falta?** O projeto não possui testes automatizados. Para uma API financeira, isso é essencial para garantir que as regras de negócio funcionem como esperado e que novas alterações não quebrem funcionalidades existentes.
- **Ação Recomendada:** Implementar testes usando uma framework como **Jest** e **Supertest** para cobrir:
    - **Serviços:** Testar a lógica de negócio (transferências, limites, etc.) de forma isolada.
    - **Endpoints:** Testar os fluxos da API, desde a requisição até a resposta.

### 4.2. Logging Estruturado
- **O que falta?** A API usa `console.log` e `console.error`. Em produção, é necessário um sistema de logging mais robusto.
- **Ação Recomendada:** Integrar uma biblioteca de logging como **Winston** ou **Pino** para gerar logs estruturados (em JSON), facilitando a análise e o monitoramento em ambientes de produção.
