// routes/recuperarSenhaRoutes.js
const express = require('express');
const router = express.Router();
const recuperarSenhaController = require('../controllers/recuperarSenhaController');

// Rota para solicitar token de recuperação
router.post('/solicitar-token', recuperarSenhaController.solicitarToken);

// Rota para verificar token
router.post('/verificar-token', recuperarSenhaController.verificarToken);

// Rota para alterar senha
router.post('/alterar-senha', recuperarSenhaController.alterarSenha);

module.exports = router;