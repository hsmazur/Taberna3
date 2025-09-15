// controllers/loginController.js
const { pool } = require('../database.js');

const loginController = {
  // Login de usuário
  loginUsuario: async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query('SET search_path TO public');

      // Buscar usuário pelo email
      const usuarioResult = await client.query(
        `SELECT u.id_usuario, u.nome_completo, u.email, u.senha,
                CASE 
                  WHEN f.id_funcionario IS NOT NULL THEN 'funcionario'
                  WHEN c.id_cliente IS NOT NULL THEN 'cliente'
                  ELSE 'usuario'
                END as tipo
         FROM usuario u
         LEFT JOIN cliente c ON u.id_usuario = c.id_usuario
         LEFT JOIN funcionario f ON u.id_usuario = f.id_usuario
         WHERE u.email = $1`,
        [email]
      );

      if (usuarioResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Email não cadastrado'
        });
      }

      const usuario = usuarioResult.rows[0];

      // Verificar senha (em produção, use bcrypt para comparar senhas hash)
      if (usuario.senha !== senha) {
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta'
        });
      }

      // Criar cookie de sessão
      res.cookie('usuario', JSON.stringify({
        id: usuario.id_usuario,
        nome: usuario.nome_completo,
        email: usuario.email,
        tipo: usuario.tipo
      }), {
        maxAge: 86400000, // 1 dia
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Login realizado com sucesso!',
        usuario: {
          id: usuario.id_usuario,
          nome: usuario.nome_completo,
          email: usuario.email,
          tipo: usuario.tipo
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro no login:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor',
        error: error.message
      });
    } finally {
      client.release();
    }
  },

  // Logout de usuário
  logoutUsuario: (req, res) => {
    res.clearCookie('usuario').json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  },

  // Verificar usuário logado
  verificarUsuario: (req, res) => {
    if (!req.cookies.usuario) {
      return res.status(401).json({
        success: false,
        message: 'Não logado'
      });
    }

    try {
      const usuario = JSON.parse(req.cookies.usuario);
      res.json({
        success: true,
        usuario: usuario
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Sessão inválida'
      });
    }
  }
};

module.exports = loginController;