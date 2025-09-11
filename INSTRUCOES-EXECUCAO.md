# 🚀 Instruções de Execução - API Banco Principal

## 📋 Pré-requisitos

- **Node.js**: Versão 16 ou superior
- **npm**: Gerenciador de pacotes do Node.js
- **Git**: Para clonar o repositório

## 🔧 Instalação

### 1. Clonar o Repositório
```bash
git clone [URL_DO_REPOSITORIO]
cd API-Banco-Principal
```

### 2. Instalar Dependências
```bash
npm install
```

## 🎯 Execução

### Modo Desenvolvimento (Recomendado)
```bash
npm run dev
```

**Vantagens:**
- ✅ Hot reload automático
- ✅ Reinicia automaticamente quando há mudanças
- ✅ Melhor para desenvolvimento

### Modo Produção
```bash
npm run build
npm start
```

**Vantagens:**
- ✅ Código otimizado
- ✅ Melhor performance
- ✅ Ideal para produção

## 👥 Criação de Usuários

**✅ IMPORTANTE**: 

**Os usuários são criados através do endpoint de registro!**

- **Endpoint**: `POST /api/v1/auth/register`
- **Dados necessários**: nome, CPF, email, senha, telefone
- **Papel**: `CLIENTE` (padrão)

### 🔧 Exemplo de Registro

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
-H "Content-Type: application/json" \
-d '{"nomeCompleto":"João Silva","cpf":"12345678901","email":"joao@email.com","senha":"Senha123","telefone":"11987654321"}'
```

**Quando usar:**
- Banco de dados deletado manualmente
- Erro na criação automática
- Primeira configuração do projeto

## 🌐 Acesso à API

### URLs Principais
- **Servidor**: http://localhost:3000
- **Documentação Swagger**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

### Teste Rápido
```bash
# Verificar se o servidor está funcionando
curl http://localhost:3000/health

# Fazer login como usuário
curl -X POST http://localhost:3000/api/v1/auth/login \
-H "Content-Type: application/json" \
-d '{"cpf":"12345678901","senha":"Senha123"}'
```

## 🔄 Reset do Banco de Dados

### Quando Resetar
- Problemas de integridade do banco
- Mudanças na estrutura das entidades
- Testes com dados limpos

### Como Resetar
```bash
# 1. Parar o servidor
Ctrl + C

# 2. Deletar o banco
Remove-Item -Path "banco.sqlite" -Force

# 3. Reiniciar o servidor
npm run dev

# 4. Sistema pronto para registro de usuários
```

## 🐛 Troubleshooting

### Erro: "CPF ou senha inválidos"
- ✅ Verificar se o sistema está funcionando
- ✅ Executar o comando de criação manual se necessário

### Erro: "Porta 3000 já em uso"
```bash
# Verificar processos na porta
netstat -an | findstr :3000

# Parar processos Node.js
Get-Process -Name "node" | Stop-Process -Force
```

### Erro: "Banco de dados não conectado"
- ✅ Verificar se o arquivo `banco.sqlite` existe
- ✅ Verificar permissões de escrita na pasta
- ✅ Resetar o banco se necessário

## 📚 Documentação Adicional

- **Regras da API**: `REGRAS_API_BANCO_PRINCIPAL.md`
- **Guia Postman**: `README-POSTMAN.md`
- **Instruções Postman**: `INSTRUCOES-POSTMAN.md`
- **Resumo de Atualizações**: `RESUMO-ATUALIZACOES.md`

## 🎉 Pronto!

Agora você pode usar a API normalmente! O sistema está configurado e funcionando.

**Próximos passos:**
1. Testar com Postman (coleção incluída)
2. Explorar a documentação Swagger
3. Implementar funcionalidades adicionais