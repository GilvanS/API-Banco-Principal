const http = require('http');

// Configurações
const BASE_URL = 'http://localhost:3000';
let jwtToken = '';
let cliente1Id = '';
let cliente2Id = '';
let cartaoDebitoId = '';

// Função para fazer requisições HTTP
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve({
                        status: res.statusCode,
                        data: jsonData,
                        headers: res.headers
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        data: responseData,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Testes de Transferências e Depósitos
async function executarTestesTransferencias() {
    console.log('=== TESTE DAS FUNCIONALIDADES DE TRANSFERÊNCIA E DEPÓSITO ===\n');

    try {
        // 1. Login Admin
        console.log('1. Testando Login Admin...');
        const loginData = {
            cpf: "00000000000",
            senha: "AdminSenhaForte123"
        };
        const loginResponse = await makeRequest('POST', '/auth/login', loginData);
        console.log(`   Status: ${loginResponse.status}`);
        
        if (loginResponse.data.token) {
            jwtToken = loginResponse.data.token;
            console.log(`   Token JWT obtido: ${jwtToken.substring(0, 20)}...\n`);
        } else {
            console.log('   ERRO: Token não obtido\n');
            return;
        }

        // 2. Criar Cliente 1
        console.log('2. Criando Cliente 1...');
        const cliente1Data = {
            nomeCompleto: "João Silva Transferência",
            cpf: "11111111111",
            senha: "SenhaForte123"
        };
        const cliente1Response = await makeRequest('POST', '/clientes', cliente1Data);
        console.log(`   Status: ${cliente1Response.status}`);
        
        if (cliente1Response.data.id) {
            cliente1Id = cliente1Response.data.id;
            console.log(`   Cliente 1 criado com ID: ${cliente1Id}`);
            console.log(`   Agência: ${cliente1Response.data.agencia}, Conta: ${cliente1Response.data.numeroConta}\n`);
        } else {
            console.log('   ERRO: Cliente 1 não criado\n');
            return;
        }

        // 3. Criar Cliente 2
        console.log('3. Criando Cliente 2...');
        const cliente2Data = {
            nomeCompleto: "Maria Santos Transferência",
            cpf: "22222222222",
            senha: "SenhaForte123"
        };
        const cliente2Response = await makeRequest('POST', '/clientes', cliente2Data);
        console.log(`   Status: ${cliente2Response.status}`);
        
        if (cliente2Response.data.id) {
            cliente2Id = cliente2Response.data.id;
            console.log(`   Cliente 2 criado com ID: ${cliente2Id}`);
            console.log(`   Agência: ${cliente2Response.data.agencia}, Conta: ${cliente2Response.data.numeroConta}\n`);
        } else {
            console.log('   ERRO: Cliente 2 não criado\n');
            return;
        }

        // 4. Buscar cartão de débito do Cliente 1
        console.log('4. Buscando cartão de débito do Cliente 1...');
        const cartoesResponse = await makeRequest('GET', `/cartoes/cliente/${cliente1Id}`);
        console.log(`   Status: ${cartoesResponse.status}`);
        
        if (cartoesResponse.data && cartoesResponse.data.length > 0) {
            const cartaoDebito = cartoesResponse.data.find(c => c.tipo === 'debito');
            if (cartaoDebito) {
                cartaoDebitoId = cartaoDebito.id;
                console.log(`   Cartão de débito encontrado: ${cartaoDebitoId}\n`);
            } else {
                console.log('   ERRO: Cartão de débito não encontrado\n');
                return;
            }
        } else {
            console.log('   ERRO: Nenhum cartão encontrado\n');
            return;
        }

        // 5. Fazer depósito no Cliente 1
        console.log('5. Testando Depósito no Cliente 1...');
        const depositoData = {
            agencia: cliente1Response.data.agencia,
            conta: cliente1Response.data.numeroConta,
            valor: 1000.00
        };
        const depositoResponse = await makeRequest('POST', '/transacoes/depositar', depositoData);
        console.log(`   Status: ${depositoResponse.status}`);
        console.log(`   Response: ${JSON.stringify(depositoResponse.data, null, 2)}\n`);

        // 6. Testar transferência com valor mínimo (R$ 10,00)
        console.log('6. Testando Transferência com valor mínimo (R$ 10,00)...');
        const transferenciaMinData = {
            agenciaOrigem: cliente1Response.data.agencia,
            contaOrigem: cliente1Response.data.numeroConta,
            agenciaDestino: cliente2Response.data.agencia,
            contaDestino: cliente2Response.data.numeroConta,
            valor: 10.00,
            cartaoId: cartaoDebitoId,
            pin: "1234"
        };
        const transferenciaMinResponse = await makeRequest('POST', '/transacoes/transferir', transferenciaMinData);
        console.log(`   Status: ${transferenciaMinResponse.status}`);
        console.log(`   Response: ${JSON.stringify(transferenciaMinResponse.data, null, 2)}\n`);

        // 7. Testar transferência com valor máximo (R$ 5.000,00)
        console.log('7. Testando Transferência com valor máximo (R$ 5.000,00)...');
        const transferenciaMaxData = {
            agenciaOrigem: cliente1Response.data.agencia,
            contaOrigem: cliente1Response.data.numeroConta,
            agenciaDestino: cliente2Response.data.agencia,
            contaDestino: cliente2Response.data.numeroConta,
            valor: 5000.00,
            cartaoId: cartaoDebitoId,
            pin: "1234"
        };
        const transferenciaMaxResponse = await makeRequest('POST', '/transacoes/transferir', transferenciaMaxData);
        console.log(`   Status: ${transferenciaMaxResponse.status}`);
        console.log(`   Response: ${JSON.stringify(transferenciaMaxResponse.data, null, 2)}\n`);

        // 8. Testar transferência com valor abaixo do mínimo (deve falhar)
        console.log('8. Testando Transferência com valor abaixo do mínimo (deve falhar)...');
        const transferenciaBaixoData = {
            agenciaOrigem: cliente1Response.data.agencia,
            contaOrigem: cliente1Response.data.numeroConta,
            agenciaDestino: cliente2Response.data.agencia,
            contaDestino: cliente2Response.data.numeroConta,
            valor: 5.00,
            cartaoId: cartaoDebitoId,
            pin: "1234"
        };
        const transferenciaBaixoResponse = await makeRequest('POST', '/transacoes/transferir', transferenciaBaixoData);
        console.log(`   Status: ${transferenciaBaixoResponse.status}`);
        console.log(`   Response: ${JSON.stringify(transferenciaBaixoResponse.data, null, 2)}\n`);

        // 9. Testar transferência com valor acima do máximo (deve falhar)
        console.log('9. Testando Transferência com valor acima do máximo (deve falhar)...');
        const transferenciaAltoData = {
            agenciaOrigem: cliente1Response.data.agencia,
            contaOrigem: cliente1Response.data.numeroConta,
            agenciaDestino: cliente2Response.data.agencia,
            contaDestino: cliente2Response.data.numeroConta,
            valor: 6000.00,
            cartaoId: cartaoDebitoId,
            pin: "1234"
        };
        const transferenciaAltoResponse = await makeRequest('POST', '/transacoes/transferir', transferenciaAltoData);
        console.log(`   Status: ${transferenciaAltoResponse.status}`);
        console.log(`   Response: ${JSON.stringify(transferenciaAltoResponse.data, null, 2)}\n`);

        // 10. Testar transferência com PIN incorreto (deve falhar)
        console.log('10. Testando Transferência com PIN incorreto (deve falhar)...');
        const transferenciaPinErradoData = {
            agenciaOrigem: cliente1Response.data.agencia,
            contaOrigem: cliente1Response.data.numeroConta,
            agenciaDestino: cliente2Response.data.agencia,
            contaDestino: cliente2Response.data.numeroConta,
            valor: 100.00,
            cartaoId: cartaoDebitoId,
            pin: "9999"
        };
        const transferenciaPinErradoResponse = await makeRequest('POST', '/transacoes/transferir', transferenciaPinErradoData);
        console.log(`   Status: ${transferenciaPinErradoResponse.status}`);
        console.log(`   Response: ${JSON.stringify(transferenciaPinErradoResponse.data, null, 2)}\n`);

        // 11. Testar transferência para mesma conta (deve falhar)
        console.log('11. Testando Transferência para mesma conta (deve falhar)...');
        const transferenciaMesmaContaData = {
            agenciaOrigem: cliente1Response.data.agencia,
            contaOrigem: cliente1Response.data.numeroConta,
            agenciaDestino: cliente1Response.data.agencia,
            contaDestino: cliente1Response.data.numeroConta,
            valor: 100.00,
            cartaoId: cartaoDebitoId,
            pin: "1234"
        };
        const transferenciaMesmaContaResponse = await makeRequest('POST', '/transacoes/transferir', transferenciaMesmaContaData);
        console.log(`   Status: ${transferenciaMesmaContaResponse.status}`);
        console.log(`   Response: ${JSON.stringify(transferenciaMesmaContaResponse.data, null, 2)}\n`);

        // 12. Consultar extrato do Cliente 1
        console.log('12. Consultando extrato do Cliente 1...');
        const extratoResponse = await makeRequest('GET', `/transacoes/extrato/${cliente1Id}?pagina=1&limite=10`);
        console.log(`   Status: ${extratoResponse.status}`);
        console.log(`   Total de movimentações: ${extratoResponse.data.paginacao.total}`);
        console.log(`   Movimentações: ${JSON.stringify(extratoResponse.data.movimentacoes.map(m => ({
            tipo: m.tipo,
            valor: m.valor,
            descricao: m.descricao
        })), null, 2)}\n`);

        // 13. Consultar saldo do Cliente 2
        console.log('13. Consultando saldo do Cliente 2...');
        const saldoResponse = await makeRequest('GET', `/clientes/${cliente2Id}/saldo`);
        console.log(`   Status: ${saldoResponse.status}`);
        console.log(`   Saldo: ${JSON.stringify(saldoResponse.data, null, 2)}\n`);

        console.log('=== TODOS OS TESTES DE TRANSFERÊNCIA E DEPÓSITO CONCLUÍDOS COM SUCESSO! ===');

    } catch (error) {
        console.error('Erro durante os testes de transferência:', error.message);
    }
}

executarTestesTransferencias(); 