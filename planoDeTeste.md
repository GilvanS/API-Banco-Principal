# Plano de Teste - Fases do Projeto `api-banco-principal`

---

## Fase 1: Estrutura e Configuração do Projeto

### Objetivo
Estabelecer a fundação técnica do projeto, garantindo que todas as ferramentas, dependências e a estrutura de diretórios estejam corretamente configuradas.

### Escopo
- **Criação do Projeto:** Diretório e `package.json`.
- **Dependências:** Instalação de pacotes de produção e desenvolvimento.
- **Estrutura de Arquivos:** Criação da árvore de diretórios e arquivos iniciais.
- **TypeScript:** Configuração do `tsconfig.json`.
- **Scripts:** Definição de `build`, `start` e `dev`.

### Critérios de Aceite
- [x] **`package.json` completo:** Contém todas as dependências e scripts.
- [x] **Estrutura de diretórios correta:** `src` com subpastas (`database`, `entities`, etc.).
- [x] **Build sem erros:** `npm run build` executa com sucesso e cria o diretório `dist`.
- [x] **Servidor de desenvolvimento inicia:** `npm run dev` inicia sem falhas de configuração.

---

## Fase 2: Cadastro de `UsuarioConta`

### Objetivo
Implementar o endpoint para cadastrar um novo usuário com sua conta bancária, incluindo validações e regras de negócio.

### Escopo
- **Entidade:** Definição da entidade `UsuarioConta` no TypeORM.
- **Banco de Dados:** Configuração do `data-source.ts` para usar SQLite e reconhecer a nova entidade.
- **Serviço:** Implementação da lógica de negócio em `UsuarioContaService`:
  - Validação de CPF único.
  - Criptografia de senha com `bcryptjs`.
- **Rota e Controller:**
  - Criação do endpoint `POST /usuarios-contas`.
  - Validação dos dados de entrada (`nomeCompleto`, `cpf`, `senha`) usando `express-validator`.
- **Documentação:**
  - Definição do endpoint e seus schemas no `swagger.yaml`.

### Critérios de Aceite

1.  **Iniciar a Aplicação:**
    *   Execute `npm run dev`.
    *   **Resultado Esperado:** O servidor deve iniciar com sucesso, conectar-se ao banco de dados SQLite e exibir as mensagens de log no console. Acessar `http://localhost:3000/api-docs` deve mostrar a interface do Swagger.

2.  **Teste de Cadastro com Sucesso (Caminho Feliz):**
    *   **Ação:** Enviar uma requisição `POST` para `http://localhost:3000/usuarios-contas` com um corpo JSON válido:
      ```json
      {
        "nomeCompleto": "Usuario de Teste",
        "cpf": "111.222.333-44",
        "senha": "SenhaValida123"
      }
      ```
    *   **Resultado Esperado:**
        *   Status de resposta: `201 Created`.
        *   O corpo da resposta deve conter o objeto do usuário criado, **sem o campo `senha`**.
        *   O banco de dados `database.sqlite` deve conter o novo registro com a senha criptografada.

3.  **Teste de Validação de Entrada:**
    *   **Ação:** Enviar requisições `POST` com dados inválidos:
        *   CPF já existente.
        *   Senha muito curta (menos de 8 caracteres).
        *   Corpo da requisição sem campos obrigatórios (ex: `nomeCompleto`).
    *   **Resultado Esperado:**
        *   Status de resposta: `400 Bad Request`.
        *   O corpo da resposta deve conter um objeto de erro detalhando qual validação falhou (ex: `"erro": "CPF já cadastrado."` ou um array de erros do `express-validator`).

4.  **Verificar Documentação:**
    *   **Ação:** Acessar `http://localhost:3000/api-docs`.
    *   **Resultado Esperado:** A documentação do endpoint `POST /usuarios-contas` deve estar visível, com a descrição correta do request body e das possíveis respostas.

Se todos os critérios acima forem atendidos, a Fase 2 está concluída com sucesso.