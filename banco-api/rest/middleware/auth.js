const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'Token de autenticação não fornecido.',
            error: 'Unauthorized' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) {
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    success: false,
                    message: 'Token inválido.',
                    error: 'Invalid Token' 
                });
            }

            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false,
                    message: 'Token expirado.',
                    error: 'Token Expired' 
                });
            }

            return res.status(500).json({ 
                success: false,
                message: 'Erro ao autenticar o token.',
                error: 'Authentication Error' 
            });
        }

        req.usuario = usuario;
        next();
    });
}

module.exports = {
    autenticarToken
};