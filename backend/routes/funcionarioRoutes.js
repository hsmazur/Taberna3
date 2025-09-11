// ===========================================
// ROTAS - FUNCIONÁRIOS
// ===========================================

const express = require('express');
const funcionarioController = require('../controllers/funcionarioController');

const router = express.Router();

// ========================
// ROTAS CRUD - FUNCIONÁRIOS
// ========================

// GET /api/funcionarios - Listar todos os funcionários
router.get('/', funcionarioController.listarFuncionarios);

// GET /api/funcionarios/:id - Buscar funcionário por ID
router.get('/:id', funcionarioController.buscarFuncionario);

// GET /api/funcionarios/usuario/:id - Buscar funcionário por ID do usuário
router.get('/usuario/:id', funcionarioController.buscarFuncionarioPorUsuario);

// POST /api/funcionarios - Criar novo funcionário
router.post('/', funcionarioController.criarFuncionario);

// PUT /api/funcionarios - Atualizar funcionário existente
router.put('/', funcionarioController.atualizarFuncionario);

// DELETE /api/funcionarios/:id - Excluir funcionário
router.delete('/:id', funcionarioController.excluirFuncionario);

module.exports = router;