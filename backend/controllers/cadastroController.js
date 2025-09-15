// controllers/cadastroController.js
const { pool } = require('../database.js');

const cadastroController = {
  // Cadastrar novo usuário
  cadastrarUsuario: async (req, res) => {
    console.log('Dados recebidos:', req.body);

    const { nome, email, senha, telefone, endereco, bairro, tipo } = req.body;

    // Validações básicas
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios'
      });
    }

    if (senha.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter no mínimo 8 caracteres'
      });
    }

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
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

      // Inserir na tabela usuario
      const usuarioResult = await client.query(
        `INSERT INTO usuario (nome_completo, email, senha) 
         VALUES ($1, $2, $3) 
         RETURNING id_usuario, nome_completo, email`,
        [nome, email, senha]
      );

      const usuarioId = usuarioResult.rows[0].id_usuario;

      // Se for cliente, inserir na tabela cliente
      if (tipo === 'cliente' && (telefone || endereco || bairro)) {
        await client.query(
          `INSERT INTO cliente (id_usuario, telefone, endereco, bairro)
           VALUES ($1, $2, $3, $4)`,
          [usuarioId, telefone || null, endereco || null, bairro || null]
        );
      }

      // Se for funcionário, inserir na tabela funcionario
      if (tipo === 'funcionario') {
        await client.query(
          `INSERT INTO funcionario (id_usuario, cargo)
           VALUES ($1, $2)`,
          [usuarioId, 'Funcionário'] // Cargo padrão
        );
      }

      await client.query('COMMIT');

      // Criar cookie de sessão automaticamente após cadastro
      res.cookie('usuario', JSON.stringify({
        id: usuarioId,
        nome: usuarioResult.rows[0].nome_completo,
        email: usuarioResult.rows[0].email,
        tipo: tipo || 'usuario'
      }), {
        maxAge: 86400000, // 1 dia
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      res.status(201).json({
        success: true,
        message: 'Cadastro realizado com sucesso!',
        usuario: {
          id: usuarioId,
          nome: usuarioResult.rows[0].nome_completo,
          email: usuarioResult.rows[0].email,
          tipo: tipo || 'usuario'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro detalhado no cadastro:', error);
      
      // Tratamento de erros específicos do PostgreSQL
      if (error.code === '23505') { // Violação de constraint única
        return res.status(409).json({
          success: false,
          message: 'Email já cadastrado'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      client.release();
    }
  },

  // Listar todos os usuários com informações completas
  listarUsuarios: async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          u.id_usuario, 
          u.nome_completo, 
          u.email,
          c.telefone, 
          c.endereco, 
          c.bairro,
          f.cargo,
          CASE 
            WHEN f.id_funcionario IS NOT NULL THEN 'funcionario'
            WHEN c.id_cliente IS NOT NULL THEN 'cliente'
            ELSE 'usuario'
          END as tipo,
          u.senha IS NOT NULL as tem_senha
        FROM usuario u
        LEFT JOIN cliente c ON u.id_usuario = c.id_usuario
        LEFT JOIN funcionario f ON u.id_usuario = f.id_usuario
        ORDER BY u.id_usuario
      `);

      res.json({
        success: true,
        usuarios: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar usuários',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Buscar usuário por ID
  buscarUsuarioPorId: async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        SELECT 
          u.id_usuario, 
          u.nome_completo, 
          u.email,
          c.telefone, 
          c.endereco, 
          c.bairro,
          f.cargo,
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
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      res.json({
        success: true,
        usuario: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Atualizar usuário
  atualizarUsuario: async (req, res) => {
    const { id } = req.params;
    const { nome_completo, email, telefone, endereco, bairro, cargo, tipo } = req.body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query('SET search_path TO public');

      // Verificar se usuário existe
      const usuarioCheck = await client.query(
        'SELECT id_usuario FROM usuario WHERE id_usuario = $1',
        [id]
      );

      if (usuarioCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar se email já existe (excluindo o próprio usuário)
      if (email) {
        const emailCheck = await client.query(
          'SELECT id_usuario FROM usuario WHERE email = $1 AND id_usuario != $2',
          [email, id]
        );

        if (emailCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            success: false,
            message: 'Email já está em uso por outro usuário'
          });
        }
      }

      // Atualizar tabela usuario
      const usuarioUpdate = await client.query(
        `UPDATE usuario 
         SET nome_completo = COALESCE($1, nome_completo), 
             email = COALESCE($2, email) 
         WHERE id_usuario = $3 
         RETURNING *`,
        [nome_completo, email, id]
      );

      // Gerenciar tabelas específicas baseado no tipo
      if (tipo === 'cliente') {
        // Verificar se já existe registro na tabela cliente
        const clienteCheck = await client.query(
          'SELECT id_cliente FROM cliente WHERE id_usuario = $1',
          [id]
        );

        if (clienteCheck.rows.length > 0) {
          // Atualizar cliente existente
          await client.query(
            `UPDATE cliente 
             SET telefone = COALESCE($1, telefone),
                 endereco = COALESCE($2, endereco),
                 bairro = COALESCE($3, bairro)
             WHERE id_usuario = $4`,
            [telefone, endereco, bairro, id]
          );
        } else {
          // Inserir novo cliente
          await client.query(
            `INSERT INTO cliente (id_usuario, telefone, endereco, bairro)
             VALUES ($1, $2, $3, $4)`,
            [id, telefone, endereco, bairro]
          );
        }

        // Remover de funcionario se existir
        await client.query(
          'DELETE FROM funcionario WHERE id_usuario = $1',
          [id]
        );

      } else if (tipo === 'funcionario') {
        // Verificar se já existe registro na tabela funcionario
        const funcionarioCheck = await client.query(
          'SELECT id_funcionario FROM funcionario WHERE id_usuario = $1',
          [id]
        );

        if (funcionarioCheck.rows.length > 0) {
          // Atualizar funcionario existente
          await client.query(
            `UPDATE funcionario 
             SET cargo = COALESCE($1, cargo)
             WHERE id_usuario = $2`,
            [cargo || 'Funcionário', id]
          );
        } else {
          // Inserir novo funcionario
          await client.query(
            `INSERT INTO funcionario (id_usuario, cargo)
             VALUES ($1, $2)`,
            [id, cargo || 'Funcionário']
          );
        }

        // Remover de cliente se existir
        await client.query(
          'DELETE FROM cliente WHERE id_usuario = $1',
          [id]
        );

      } else if (tipo === 'usuario') {
        // Remover de ambas as tabelas específicas
        await client.query(
          'DELETE FROM cliente WHERE id_usuario = $1',
          [id]
        );
        await client.query(
          'DELETE FROM funcionario WHERE id_usuario = $1',
          [id]
        );
      }

      await client.query('COMMIT');

      // Buscar dados atualizados
      const usuarioAtualizado = await client.query(`
        SELECT 
          u.id_usuario, 
          u.nome_completo, 
          u.email,
          c.telefone, 
          c.endereco, 
          c.bairro,
          f.cargo,
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

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        usuario: usuarioAtualizado.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao atualizar usuário:', error);
      
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'Email já está em uso'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      client.release();
    }
  },

  // Deletar usuário
  deletarUsuario: async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('SET search_path TO public');

      // Verificar se usuário existe
      const usuarioCheck = await client.query(
        'SELECT id_usuario FROM usuario WHERE id_usuario = $1',
        [id]
      );

      if (usuarioCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Deletar usuário (as FK constraints com ON DELETE CASCADE cuidarão das tabelas relacionadas)
      const result = await client.query(
        'DELETE FROM usuario WHERE id_usuario = $1 RETURNING id_usuario',
        [id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Usuário deletado com sucesso',
        id_usuario: result.rows[0].id_usuario
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao deletar usuário:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      client.release();
    }
  },

  // Buscar usuário por email
  buscarUsuarioPorEmail: async (req, res) => {
    try {
      const { email } = req.params;
      
      const result = await pool.query(`
        SELECT 
          u.id_usuario, 
          u.nome_completo, 
          u.email,
          c.telefone, 
          c.endereco, 
          c.bairro,
          f.cargo,
          CASE 
            WHEN f.id_funcionario IS NOT NULL THEN 'funcionario'
            WHEN c.id_cliente IS NOT NULL THEN 'cliente'
            ELSE 'usuario'
          END as tipo
        FROM usuario u
        LEFT JOIN cliente c ON u.id_usuario = c.id_usuario
        LEFT JOIN funcionario f ON u.id_usuario = f.id_usuario
        WHERE u.email = $1
      `, [email]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      res.json({
        success: true,
        usuario: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = cadastroController;