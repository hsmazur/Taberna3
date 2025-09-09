// ===========================================
// ROTAS - USUÁRIOS (INTEGRAÇÃO COM POSTGRESQL)
// ===========================================

const express = require('express');
const CRUDusuarioController = require('../controllers/CRUDusuarioController');

const router = express.Router();

// ========================
// ROTAS CRUD - USUÁRIOS
// ========================

// GET /api/usuarios - Listar todos os usuários
router.get('/', CRUDusuarioController.listarUsuarios);

// GET /api/usuarios/:id - Buscar usuário por ID
router.get('/:id', CRUDusuarioController.buscarUsuario);

// POST /api/usuarios - Criar novo usuário
router.post('/', CRUDusuarioController.criarUsuario);

// PUT /api/usuarios - Atualizar usuário existente
router.put('/', CRUDusuarioController.atualizarUsuario);

// DELETE /api/usuarios/:id - Excluir usuário
router.delete('/:id', CRUDusuarioController.excluirUsuario);

module.exports = router;