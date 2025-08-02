const http = require('http');

// Teste da rota principal
function testarRotaPrincipal() {
    return new Promise((resolve, reject) => {
        const req = http.request('http://localhost:3000/', (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('✅ Rota principal funcionando:');
                console.log(JSON.parse(data));
                resolve();
            });
        });
        
        req.on('error', (err) => {
            console.log('❌ Erro na rota principal:', err.message);
            reject(err);
        });
        
        req.end();
    });
}

// Teste do health check
function testarHealthCheck() {
    return new Promise((resolve, reject) => {
        const req = http.request('http://localhost:3000/health', (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('✅ Health check funcionando:');
                console.log(JSON.parse(data));
                resolve();
            });
        });
        
        req.on('error', (err) => {
            console.log('❌ Erro no health check:', err.message);
            reject(err);
        });
        
        req.end();
    });
}

// Executar testes
async function executarTestes() {
    console.log('🚀 Iniciando testes da API Banco Principal...\n');
    
    try {
        await testarRotaPrincipal();
        console.log('');
        await testarHealthCheck();
        console.log('\n🎉 Todos os testes passaram! A API está funcionando corretamente.');
    } catch (error) {
        console.log('\n💥 Alguns testes falharam:', error.message);
    }
}

executarTestes(); 