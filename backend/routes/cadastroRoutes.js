// routes/cadastroRoutes.js
const express = require('express');
const router = express.Router();
const cadastroController = require('../controllers/cadastroController');

// Rota para cadastrar novo usuário
router.post('/', cadastroController.cadastrarUsuario);

// Rota para listar todos os usuários
router.get('/usuarios', cadastroController.listarUsuarios);

// Rota para buscar usuário por ID
router.get('/usuarios/:id', cadastroController.buscarUsuarioPorId);

// Rota para atualizar usuário
router.put('/usuarios/:id', cadastroController.atualizarUsuario);

// Rota para deletar usuário
router.delete('/usuarios/:id', cadastroController.deletarUsuario);

module.exports = router;