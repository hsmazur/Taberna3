// routes/carrinhoRoutes.js - VERSÃO CORRIGIDA
const express = require('express');
const router = express.Router();
const carrinhoController = require('../controllers/carrinhoController');

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

// REMOVA completamente a parte de verificação de autenticação
// Rota para listar itens do carrinho
router.get('/', carrinhoController.listarCarrinho);

// Rota para atualizar carrinho
router.post('/', carrinhoController.atualizarCarrinho);

// Rota para limpar carrinho
router.delete('/', carrinhoController.limparCarrinho);

module.exports = router;