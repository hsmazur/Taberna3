// routes/pagamentoRoutes.js - Rotas de pagamento
const express = require('express');
const router = express.Router();
const pagamentoController = require('../controllers/pagamentoController');

// Middleware CORS específico para esta rota
router.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3001'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware para extrair dados do usuário (simplificado para não precisar de autenticação completa)
router.use((req, res, next) => {
  // Por enquanto, usa usuário temporário
  // Depois pode ser substituído por middleware de autenticação real
  req.usuario = { id: 1 }; // ID temporário
  next();
});

// Rota para finalizar pedido
router.post('/finalizar', pagamentoController.finalizarPedido);

// Rota para buscar detalhes de um pedido específico
router.get('/pedido/:pedidoId', pagamentoController.buscarPedido);

// Rota para listar pedidos do usuário logado
router.get('/meus-pedidos', pagamentoController.listarPedidosUsuario);

module.exports = router;