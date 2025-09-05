// routes/produtoRoutes.js
const express = require('express');
const router = express.Router();
const produtoController = require('../controllers/produtoController');

// Rota para listar todos os produtos
router.get('/', produtoController.listarProdutos);

// Rota para buscar produto por ID
router.get('/:id', produtoController.buscarProdutoPorId);

// Rota para criar novo produto
router.post('/', produtoController.criarProduto);

// Rota para atualizar produto
router.put('/:id', produtoController.atualizarProduto);

// Rota para deletar produto
router.delete('/:id', produtoController.deletarProduto);

module.exports = router;