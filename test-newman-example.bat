@echo off
REM Script de exemplo para testar a API usando Newman
REM Certifique-se de que Newman está instalado: npm install -g newman

echo ========================================
echo  TESTE DA API BANCO DIGITAL COM NEWMAN
echo ========================================
echo.

REM Verificar se Newman está instalado
newman --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Newman não está instalado!
    echo Execute: npm install -g newman
    pause
    exit /b 1
)

REM Verificar se os arquivos necessários existem
if not exist "newman-environment.json" (
    echo ERRO: Arquivo newman-environment.json não encontrado!
    pause
    exit /b 1
)

if not exist "API-Banco-Principal.postman_collection.json" (
    echo AVISO: Collection do Postman não encontrada!
    echo Você pode exportar a collection do Postman ou usar uma collection existente.
    echo.
)

echo Verificando se a API está rodando...
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo AVISO: API pode não estar rodando na porta 3000
    echo Certifique-se de executar: npm run dev
    echo.
)

echo ========================================
echo  EXECUTANDO TESTES
echo ========================================
echo.

REM Exemplo 1: Teste básico de health check
echo 1. Testando Health Check...
curl -X GET http://localhost:3000/health
echo.
echo.

REM Exemplo 2: Teste de login (se tiver collection)
if exist "API-Banco-Principal.postman_collection.json" (
    echo 2. Executando testes com Newman...
    newman run "API-Banco-Principal.postman_collection.json" --environment "newman-environment.json" --reporters cli,json --reporter-json-export "test-results.json"
) else (
    echo 2. Teste manual de login...
    echo Testando endpoint de login:
    curl -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"cpf\": \"11111111111\", \"senha\": \"Teste123@\"}"
    echo.
    echo.
    
    echo 3. Testando endpoint de segunda via (sem autenticação - deve retornar 401):
    curl -X POST http://localhost:3000/api/v1/cartoes/segunda-via -H "Content-Type: application/json" -H "Idempotency-Key: test-123" -d "{\"motivo\": \"perda\", \"bandeira\": \"visa\"}"
    echo.
    echo.
)

echo ========================================
echo  COMANDOS ÚTEIS PARA NEWMAN
echo ========================================
echo.
echo Para executar testes específicos:
echo newman run collection.json --environment newman-environment.json --folder "Authentication"
echo.
echo Para gerar relatório HTML:
echo newman run collection.json --environment newman-environment.json --reporters cli,html --reporter-html-export report.html
echo.
echo Para executar com dados customizados:
echo newman run collection.json --environment newman-environment.json --env-var "testCpf=99999999999"
echo.
echo Para modo debug:
echo newman run collection.json --environment newman-environment.json --verbose --debug
echo.

if exist "test-results.json" (
    echo Resultados salvos em: test-results.json
    echo.
)

echo Teste concluído!
echo Consulte o README-NEWMAN-TESTS.md para mais informações.
echo.
pause