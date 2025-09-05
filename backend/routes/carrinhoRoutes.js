// routes/carrinhoRoutes.js
const express = require('express');
const router = express.Router();
const carrinhoController = require('../controllers/carrinhoController');

// Rota para listar itens do carrinho
router.get('/', carrinhoController.listarCarrinho);

// Rota para atualizar carrinho
router.post('/', carrinhoController.atualizarCarrinho);

// Rota para limpar carrinho
router.delete('/', carrinhoController.limparCarrinho);

module.exports = router;