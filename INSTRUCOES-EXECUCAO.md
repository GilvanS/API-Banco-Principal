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

## 👨‍💼 Criação do Admin

### ✅ Criação Automática

**O admin é criado automaticamente na primeira execução do servidor!**

- **CPF**: `00000000000`
- **Senha**: `AdminSenhaForte123`
- **Role**: `admin`

### 🔧 Criação Manual (Se Necessário)

Se por algum motivo o admin não for criado automaticamente, execute:

```bash
npx ts-node src/database/seeds/create-admin.ts
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

# Fazer login como admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"00000000000","senha":"AdminSenhaForte123"}'
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

# 4. Admin será criado automaticamente
```

## 🐛 Troubleshooting

### Erro: "CPF ou senha inválidos"
- ✅ Verificar se o admin foi criado
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