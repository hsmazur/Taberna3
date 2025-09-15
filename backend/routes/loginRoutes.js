// routes/loginRoutes.js
const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// Rota para login de usuário
router.post('/', loginController.loginUsuario);

// Rota para logout
router.post('/logout', loginController.logoutUsuario);

// Rota para verificar usuário logado
router.get('/usuario', loginController.verificarUsuario);

module.exports = router;