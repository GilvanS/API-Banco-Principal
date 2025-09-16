# Guia de Testes com Newman

Este guia explica como usar o arquivo de environment `newman-environment.json` para executar testes automatizados da API do Banco Digital usando Newman (CLI do Postman).

## Pré-requisitos

1. **Node.js** instalado
2. **Newman** instalado globalmente:
   ```bash
   npm install -g newman
   ```
3. **API rodando** na porta 3000:
   ```bash
   npm run dev
   ```

## Estrutura do Environment

O arquivo `newman-environment.json` contém todas as variáveis necessárias para testar todos os endpoints:

### Configurações Base
- `baseUrl`: URL da API (http://localhost:3000)
- `apiVersion`: Versão da API (v1)
- `contentType`: Tipo de conteúdo (application/json)

### Tokens de Autenticação
- `authToken`: Token JWT do usuário (preenchido automaticamente após login)
- `adminToken`: Token JWT do administrador

### Dados de Teste
- **Usuário**: CPF, senha, email, telefone, nome
- **Administrador**: CPF e senha do admin
- **Endereço**: CEP, logradouro, cidade, estado, bairro
- **Transações**: Valores para transferências, PIX, investimentos
- **Cartões**: Bandeira, motivo para segunda via
- **PIX**: Chave, tipo, descrição

### IDs Dinâmicos
- `userId`, `accountId`, `cardId`, `transferId`, `pixKeyId`, `investmentId`
- Preenchidos automaticamente durante a execução dos testes

## Como Executar os Testes

### 1. Teste Individual com Collection Específica
```bash
# Executar com collection do Postman
newman run "API-Banco-Principal.postman_collection.json" \
  --environment "newman-environment.json" \
  --reporters cli,json \
  --reporter-json-export results.json
```

### 2. Teste com Dados Customizados
```bash
# Sobrescrever variáveis específicas
newman run "API-Banco-Principal.postman_collection.json" \
  --environment "newman-environment.json" \
  --env-var "testCpf=99999999999" \
  --env-var "testPassword=MinhaSenh@123"
```

### 3. Teste com Relatório HTML
```bash
# Instalar reporter HTML
npm install -g newman-reporter-html

# Executar com relatório HTML
newman run "API-Banco-Principal.postman_collection.json" \
  --environment "newman-environment.json" \
  --reporters cli,html \
  --reporter-html-export report.html
```

### 4. Teste com Múltiplas Iterações
```bash
# Executar 5 vezes com dados diferentes
newman run "API-Banco-Principal.postman_collection.json" \
  --environment "newman-environment.json" \
  --iteration-count 5
```

## Sequência Recomendada de Testes

### 1. Testes de Autenticação
```bash
# Testar login de usuário e admin
newman run collection.json --environment newman-environment.json --folder "Authentication"
```

### 2. Testes de Usuários
```bash
# Criar, listar, atualizar usuários
newman run collection.json --environment newman-environment.json --folder "Users"
```

### 3. Testes de Contas
```bash
# Operações com contas bancárias
newman run collection.json --environment newman-environment.json --folder "Accounts"
```

### 4. Testes de Cartões
```bash
# Criação, listagem, segunda via de cartões
newman run collection.json --environment newman-environment.json --folder "Cards"
```

### 5. Testes de Transferências
```bash
# Transferências entre contas
newman run collection.json --environment newman-environment.json --folder "Transfers"
```

### 6. Testes de PIX
```bash
# Operações PIX
newman run collection.json --environment newman-environment.json --folder "PIX"
```

### 7. Testes de Investimentos
```bash
# Produtos de investimento
newman run collection.json --environment newman-environment.json --folder "Investments"
```

## Variáveis Dinâmicas

O environment usa variáveis dinâmicas do Postman:

- `{{$guid}}`: Gera UUID único para idempotência
- `{{$timestamp}}`: Timestamp atual
- `{{$randomAlphaNumeric}}`: String aleatória
- `{{$randomInt}}`: Número aleatório

## Scripts de Teste Automatizados

### Criar script de teste completo
```bash
# criar arquivo test-all.bat (Windows) ou test-all.sh (Linux/Mac)
echo "newman run API-Banco-Principal.postman_collection.json --environment newman-environment.json --reporters cli,html --reporter-html-export full-report.html" > test-all.bat
```

### Teste de Performance
```bash
# Teste com múltiplas iterações para performance
newman run collection.json \
  --environment newman-environment.json \
  --iteration-count 10 \
  --delay-request 100 \
  --reporters cli,json \
  --reporter-json-export performance-results.json
```

## Troubleshooting

### Problemas Comuns

1. **Erro 401 - Não Autorizado**
   - Verifique se o token está sendo gerado corretamente no login
   - Confirme se o header Authorization está configurado

2. **Erro de Conexão**
   - Verifique se a API está rodando na porta 3000
   - Confirme se o `baseUrl` está correto

3. **Variáveis Não Encontradas**
   - Verifique se o arquivo environment está sendo carregado
   - Confirme se as variáveis estão definidas corretamente

### Debug Mode
```bash
# Executar em modo debug
newman run collection.json \
  --environment newman-environment.json \
  --verbose \
  --debug
```

## Integração com CI/CD

### GitHub Actions
```yaml
- name: Run Newman Tests
  run: |
    npm install -g newman
    newman run API-Banco-Principal.postman_collection.json \
      --environment newman-environment.json \
      --reporters cli,junit \
      --reporter-junit-export results.xml
```

### Jenkins
```groovy
stage('API Tests') {
    steps {
        sh 'newman run collection.json --environment newman-environment.json --reporters junit --reporter-junit-export results.xml'
    }
    post {
        always {
            junit 'results.xml'
        }
    }
}
```

## Customização

Para adicionar novas variáveis ao environment:

1. Edite o arquivo `newman-environment.json`
2. Adicione a nova variável no array `values`:
```json
{
  "key": "minhaNovaVariavel",
  "value": "valorPadrao",
  "description": "Descrição da variável",
  "enabled": true
}
```

## Monitoramento

Para monitoramento contínuo:

```bash
# Executar testes a cada 5 minutos
watch -n 300 'newman run collection.json --environment newman-environment.json --reporters cli'
```

---

**Nota**: Certifique-se de que todos os endpoints estão funcionando corretamente antes de executar os testes em lote. Use o modo verbose (`--verbose`) para debug detalhado quando necessário.