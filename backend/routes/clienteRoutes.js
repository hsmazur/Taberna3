// ===========================================
// ROTAS - CLIENTES
// ===========================================

const express = require('express');
const clienteController = require('../controllers/clienteController');

const router = express.Router();

// ========================
// ROTAS CRUD - CLIENTES
// ========================

// GET /api/clientes - Listar todos os clientes
router.get('/', clienteController.listarClientes);

// GET /api/clientes/:id - Buscar cliente por ID
router.get('/:id', clienteController.buscarCliente);

// GET /api/clientes/usuario/:id - Buscar cliente por ID do usuário
router.get('/usuario/:id', clienteController.buscarClientePorUsuario);

// POST /api/clientes - Criar novo cliente
router.post('/', clienteController.criarCliente);

// PUT /api/clientes - Atualizar cliente existente
router.put('/', clienteController.atualizarCliente);

// DELETE /api/clientes/:id - Excluir cliente
router.delete('/:id', clienteController.excluirCliente);

module.exports = router;