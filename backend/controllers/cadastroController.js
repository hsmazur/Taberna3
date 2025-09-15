// controllers/cadastroController.js
const { pool } = require('../database.js');

const cadastroController = {
  // Cadastrar novo usuário
  cadastrarUsuario: async (req, res) => {
    console.log('Dados recebidos:', req.body);

    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
    }

    if (senha.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter no mínimo 8 caracteres'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Definir o search_path
      await client.query('SET search_path TO public');

      // Verificar se email já existe
      const emailCheck = await client.query(
        'SELECT id_usuario FROM usuario WHERE email = $1',
        [email]
      );

      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Este email já está cadastrado'
        });
      }

      // Inserir apenas na tabela usuario
      const usuarioResult = await client.query(
        `INSERT INTO usuario (nome_completo, email, senha) 
         VALUES ($1, $2, $3) RETURNING id_usuario, nome_completo, email`,
        [nome, email, senha]
      );

      console.log('Usuário inserido:', usuarioResult.rows[0]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Cadastro realizado com sucesso!',
        usuario: {
          id: usuarioResult.rows[0].id_usuario,
          nome: usuarioResult.rows[0].nome_completo,
          email: usuarioResult.rows[0].email,
          tipo: 'usuario'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro detalhado no cadastro:', error);
      
      res.status(500).json({
        success: false,
        message: `Erro interno no servidor: ${error.message}`,
        error: error.message
      });
    } finally {
      client.release();
    }
  },

  // Listar todos os usuários
  listarUsuarios: async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.id_usuario, u.nome_completo, u.email, 
               c.telefone, c.endereco, c.bairro,
               CASE 
                 WHEN f.id_funcionario IS NOT NULL THEN 'funcionario'
                 WHEN c.id_cliente IS NOT NULL THEN 'cliente'
                 ELSE 'usuario'
               END as tipo
        FROM usuario u
        LEFT JOIN cliente c ON u.id_usuario = c.id_usuario
        LEFT JOIN funcionario f ON u.id_usuario = f.id_usuario
        ORDER BY u.id_usuario
      `);

      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({ error: 'Erro no servidor' });
    }
  },

  // Buscar usuário por ID
  buscarUsuarioPorId: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`
        SELECT u.id_usuario, u.nome_completo, u.email, 
               c.telefone, c.endereco, c.bairro,
               CASE 
                 WHEN f.id_funcionario IS NOT NULL THEN 'funcionario'
                 WHEN c.id_cliente IS NOT NULL THEN 'cliente'
                 ELSE 'usuario'
               END as tipo
        FROM usuario u
        LEFT JOIN cliente c ON u.id_usuario = c.id_usuario
        LEFT JOIN funcionario f ON u.id_usuario = f.id_usuario
        WHERE u.id_usuario = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ error: 'Erro no servidor' });
    }
  },

  // Atualizar usuário
  atualizarUsuario: async (req, res) => {
    const { id } = req.params;
    const { nome_completo, email } = req.body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query('SET search_path TO public');

      // Verificar se email já existe (excluindo o próprio usuário)
      if (email) {
        const emailCheck = await client.query(
          'SELECT id_usuario FROM usuario WHERE email = $1 AND id_usuario != $2',
          [email, id]
        );

        if (emailCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Email já está em uso' });
        }
      }

      // Atualizar apenas a tabela usuario
      const result = await client.query(
        'UPDATE usuario SET nome_completo = COALESCE($1, nome_completo), email = COALESCE($2, email) WHERE id_usuario = $3 RETURNING *',
        [nome_completo, email, id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      await client.query('COMMIT');

      res.json({ 
        success: true, 
        message: 'Usuário atualizado com sucesso',
        usuario: result.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro no servidor' });
    } finally {
      client.release();
    }
  },

  // Deletar usuário
  deletarUsuario: async (req, res) => {
    try {
      const result = await pool.query(
        'DELETE FROM usuario WHERE id_usuario = $1 RETURNING id_usuario',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({ success: true, message: 'Usuário deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({ error: 'Erro no servidor' });
    }
  }
};

module.exports = cadastroController;