// controllers/recuperarSenhaController.js
const { pool } = require('../database.js');

// Armazenar tokens em memória (em produção, use Redis ou banco)
const tokensRecuperacao = new Map();

const recuperarSenhaController = {
  // Gerar token de recuperação
  solicitarToken: async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query('SET search_path TO public');

      // Verificar se o email existe no banco
      const usuarioResult = await client.query(
        'SELECT id_usuario, nome_completo, email FROM usuario WHERE email = $1',
        [email]
      );

      if (usuarioResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Email não cadastrado no sistema'
        });
      }

      const usuario = usuarioResult.rows[0];

      // Gerar token de 6 dígitos
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Definir expiração para 15 minutos
      const expiracao = new Date(Date.now() + 15 * 60 * 1000);

      // Armazenar token (em produção, salvar no banco ou Redis)
      tokensRecuperacao.set(email, {
        token: token,
        expiracao: expiracao,
        usado: false,
        tentativas: 0
      });

      // Simular envio de email (em produção, use um serviço como SendGrid, Nodemailer, etc.)
      console.log(`\n=== TOKEN DE RECUPERAÇÃO ===`);
      console.log(`Email: ${email}`);
      console.log(`Nome: ${usuario.nome_completo}`);
      console.log(`Token: ${token}`);
      console.log(`Expira em: ${expiracao.toLocaleString('pt-BR')}`);
      console.log(`===========================\n`);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Código de recuperação enviado para seu email',
        // Em desenvolvimento, pode retornar o token para facilitar testes
        ...(process.env.NODE_ENV === 'development' && { token_debug: token })
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao solicitar token:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    } finally {
      client.release();
    }
  },

  // Verificar token de recuperação
  verificarToken: async (req, res) => {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email e token são obrigatórios'
      });
    }

    try {
      const dadosToken = tokensRecuperacao.get(email);

      if (!dadosToken) {
        return res.status(404).json({
          success: false,
          message: 'Token não encontrado. Solicite um novo código.'
        });
      }

      // Verificar se o token expirou
      if (new Date() > dadosToken.expiracao) {
        tokensRecuperacao.delete(email);
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Solicite um novo código.'
        });
      }

      // Verificar se o token foi usado
      if (dadosToken.usado) {
        return res.status(401).json({
          success: false,
          message: 'Token já foi utilizado. Solicite um novo código.'
        });
      }

      // Verificar tentativas (máximo 3)
      if (dadosToken.tentativas >= 3) {
        tokensRecuperacao.delete(email);
        return res.status(401).json({
          success: false,
          message: 'Muitas tentativas incorretas. Solicite um novo código.'
        });
      }

      // Verificar se o token está correto
      if (dadosToken.token !== token) {
        dadosToken.tentativas++;
        tokensRecuperacao.set(email, dadosToken);
        
        return res.status(401).json({
          success: false,
          message: `Código incorreto. Tentativas restantes: ${3 - dadosToken.tentativas}`
        });
      }

      // Token válido
      res.json({
        success: true,
        message: 'Token verificado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao verificar token:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    }
  },

  // Alterar senha
  alterarSenha: async (req, res) => {
    const { email, token, novaSenha } = req.body;

    if (!email || !token || !novaSenha) {
      return res.status(400).json({
        success: false,
        message: 'Email, token e nova senha são obrigatórios'
      });
    }

    if (novaSenha.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve ter no mínimo 8 caracteres'
      });
    }

    const client = await pool.connect();
    
    try {
      const dadosToken = tokensRecuperacao.get(email);

      if (!dadosToken) {
        return res.status(404).json({
          success: false,
          message: 'Token não encontrado. Solicite um novo código.',
          field: 'token'
        });
      }

      // Verificar se o token expirou
      if (new Date() > dadosToken.expiracao) {
        tokensRecuperacao.delete(email);
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Solicite um novo código.',
          field: 'token'
        });
      }

      // Verificar se o token está correto
      if (dadosToken.token !== token) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido',
          field: 'token'
        });
      }

      await client.query('BEGIN');
      await client.query('SET search_path TO public');

      // Verificar se o usuário ainda existe
      const usuarioResult = await client.query(
        'SELECT id_usuario FROM usuario WHERE email = $1',
        [email]
      );

      if (usuarioResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Atualizar a senha (em produção, hash a senha com bcrypt)
      await client.query(
        'UPDATE usuario SET senha = $1 WHERE email = $2',
        [novaSenha, email]
      );

      // Marcar token como usado e removê-lo
      tokensRecuperacao.delete(email);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao alterar senha:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    } finally {
      client.release();
    }
  },

  // Limpar tokens expirados (função utilitária)
  limparTokensExpirados: () => {
    const agora = new Date();
    
    for (const [email, dados] of tokensRecuperacao.entries()) {
      if (agora > dados.expiracao) {
        tokensRecuperacao.delete(email);
        console.log(`Token expirado removido para: ${email}`);
      }
    }
  },

  // Função para debug - mostrar tokens ativos (apenas desenvolvimento)
  mostrarTokensAtivos: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('\n=== TOKENS ATIVOS ===');
      if (tokensRecuperacao.size === 0) {
        console.log('Nenhum token ativo');
      } else {
        for (const [email, dados] of tokensRecuperacao.entries()) {
          console.log(`Email: ${email}`);
          console.log(`Token: ${dados.token}`);
          console.log(`Expira: ${dados.expiracao.toLocaleString('pt-BR')}`);
          console.log(`Tentativas: ${dados.tentativas}`);
          console.log('---');
        }
      }
      console.log('====================\n');
    }
  }
};

// Limpar tokens expirados a cada 5 minutos
setInterval(() => {
  recuperarSenhaController.limparTokensExpirados();
}, 5 * 60 * 1000);

// Em desenvolvimento, mostrar tokens ativos a cada 30 segundos
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    if (tokensRecuperacao.size > 0) {
      recuperarSenhaController.mostrarTokensAtivos();
    }
  }, 30 * 1000);
}

module.exports = recuperarSenhaController;