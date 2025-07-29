# Guia de Uso: Papéis de Usuário (Admin e Operador)

Este guia detalha o sistema de papéis implementado na API, diferenciando as permissões entre **Administradores** e **Operadores**, e explica como configurar e testar o fluxo de autenticação completo.

## O Problema do "Primeiro Usuário"

Para garantir a segurança da API, a rota de criação de usuários (`POST /usuarios-contas`) é protegida e exige que o usuário já esteja autenticado. Isso cria um paradoxo: como criar o primeiro usuário se é preciso estar logado para criar um?

A solução é um **script de "seed"**, que cria o primeiro usuário **Administrador** diretamente no banco de dados, permitindo o início de todo o processo.

## Como Criar o Usuário Administrador

Para criar o usuário `ADMIN` inicial, você precisa rodar um comando específico no terminal.

### Passo 1: Configurar as Credenciais (Opcional, mas Recomendado)

As credenciais padrão do administrador são definidas no script, mas a forma mais segura e correta de configurá-las é através do arquivo `.env` na raiz do seu projeto. Se este arquivo não existir, crie-o.

#### **Onde Mudar o CPF e a Senha:**

**Local Principal (Recomendado):** Altere os valores de `ADMIN_CPF` e `ADMIN_PASSWORD` diretamente no seu arquivo `.env`.



**Local Alternativo:** Se você não usar um arquivo `.env`, pode alterar os valores padrão diretamente no script `src/database/seeds/create-admin.ts`:



### Passo 2: Executar o Script

Com as credenciais definidas, execute o seguinte comando no terminal para criar o usuário `ADMIN` no banco de dados:



### Passo 3: Iniciar a API

Após criar o admin, inicie o servidor de desenvolvimento:



## Fluxo de Teste no Swagger

1.  **Acesse a Documentação:** Abra seu navegador e vá para `http://localhost:3000/api-docs`.

2.  **Faça Login como Admin:**
    *   Encontre a rota `POST /usuarios-contas/login`.
    *   Clique em "Try it out".
    *   Use as credenciais do admin que você configurou (ou as padrão).
    *   Clique em "Execute".

3.  **Copie o Token:** Você receberá uma resposta `200 OK` com um token JWT. Copie a string completa do token.

4.  **Autorize no Swagger:**
    *   No topo da página, clique no botão verde **"Authorize"**.
    *   Na janela que abrir, cole o token no campo "Value" (não se esqueça de manter o `Bearer ` no início, se não for adicionado automaticamente).
    *   Clique em "Authorize" e depois em "Close".

5.  **Teste as Rotas Protegidas:** Agora que você está autenticado como `ADMIN`, pode usar as rotas restritas:
    *   **Criar um Operador:** Use a rota `POST /usuarios-contas` para criar um novo usuário.
    *   **Listar Contas:** Use a rota `GET /usuarios-contas` (exclusiva para admins).
    *   **Manutenção de Conta:** Use a rota `PATCH /usuarios-contas/{id}` (exclusiva para admins).

## Resumo das Permissões

#### Administrador (`ADMIN`)
-   ✅ Pode criar outros `ADMINS` e `OPERADORES`.
-   ✅ Pode definir `limiteCredito`, `contaBloqueada` e `role` ao criar um usuário.
-   ✅ Pode listar todas as contas (`GET /usuarios-contas`).
-   ✅ Pode realizar manutenção nas contas (`PATCH /usuarios-contas/:id`).
-   ✅ Pode fazer login.

#### Operador (`OPERADOR`)
-   ✅ Pode criar **apenas** outros `OPERADORES`.
-   ✅ Pode fazer login.
-   ❌ O `limiteCredito` é fixo em R$ 500,00 na criação.
-   ❌ Não pode definir `role` ou `contaBloqueada` na criação.
-   ❌ Não pode listar todas as contas.
-   ❌ Não pode realizar manutenção nas contas.