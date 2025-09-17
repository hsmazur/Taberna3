// routes/avaliacaoRoutes.js
const express = require('express');
const avaliacaoController = require('../controllers/avaliacaoController');

const router = express.Router();

// ========================
// ROTAS - AVALIAÇÕES
// ========================

// GET /api/avaliacoes/melhor-lanche - Buscar o lanche mais bem avaliado
router.get('/melhor-lanche', avaliacaoController.getMelhorLanche);

// GET /api/avaliacoes/usuario/:id - Buscar avaliações de um usuário
router.get('/usuario/:id', avaliacaoController.getAvaliacoesPorUsuario);

// GET /api/avaliacoes/produto/:id - Buscar avaliações de um produto
router.get('/produto/:id', avaliacaoController.getAvaliacoesPorProduto);

// GET /api/avaliacoes/produtos-consumidos/:usuarioId - Buscar produtos consumidos por um usuário
router.get('/produtos-consumidos/:usuarioId', avaliacaoController.getProdutosConsumidos);

// POST /api/avaliacoes - Criar nova avaliação
router.post('/', avaliacaoController.criarAvaliacao);

// PUT /api/avaliacoes/:id - Atualizar avaliação
router.put('/:id', avaliacaoController.atualizarAvaliacao);

// DELETE /api/avaliacoes/:id - Excluir avaliação
router.delete('/:id', avaliacaoController.excluirAvaliacao);

module.exports = router;