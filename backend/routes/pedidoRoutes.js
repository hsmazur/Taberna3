// routes/pedidoRoutes.js
const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');

// Rota para listar todos os pedidos
router.get('/', pedidoController.listarPedidos);

// Rota para buscar pedido por ID
router.get('/:id', pedidoController.buscarPedidoPorId);

// Rota para atualizar pedido
router.put('/:id', pedidoController.atualizarPedido);

// Rota para deletar pedido
router.delete('/:id', pedidoController.deletarPedido);

module.exports = router;