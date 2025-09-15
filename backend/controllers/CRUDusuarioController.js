// ===========================================
// CONTROLLER - GERENCIAMENTO DE USUÁRIOS (ATUALIZADO)
// ===========================================

const { query, transaction } = require('../database');

class UsuarioController {
    
    // ========================
    // LISTAR TODOS OS USUÁRIOS
    // ========================
    static async listarUsuarios(req, res) {
        try {
            const sql = `
                SELECT id_usuario as id, nome_completo as nome, 
                       email, senha
                FROM usuario 
                ORDER BY id_usuario
            `;
            
            const result = await query(sql);
            
            // Adiciona tipo baseado nas tabelas cliente/funcionario
            const usuariosComTipo = await Promise.all(
                result.rows.map(async (usuario) => {
                    const tipo = await UsuarioController.detectarTipoUsuario(usuario.id);
                    return { ...usuario, tipo };
                })
            );
            
            res.json(usuariosComTipo);
        } catch (error) {
            console.error('Erro ao listar usuários:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // BUSCAR USUÁRIO POR ID
    // ========================
    static async buscarUsuario(req, res) {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT id_usuario as id, nome_completo as nome, 
                       email, senha
                FROM usuario 
                WHERE id_usuario = $1
            `;
            
            const result = await query(sql, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            
            const usuario = result.rows[0];
            // Detecta o tipo do usuário
            usuario.tipo = await UsuarioController.detectarTipoUsuario(id);
            
            res.json(usuario);
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // DETECTAR TIPO DO USUÁRIO
    // ========================
    static async detectarTipoUsuario(idUsuario) {
        try {
            // Verifica se é funcionário
            const funcionarioSql = 'SELECT id_funcionario FROM funcionario WHERE id_usuario = $1';
            const funcionarioResult = await query(funcionarioSql, [idUsuario]);
            
            if (funcionarioResult.rows.length > 0) {
                return 'funcionario';
            }
            
            // Verifica se é cliente
            const clienteSql = 'SELECT id_cliente FROM cliente WHERE id_usuario = $1';
            const clienteResult = await query(clienteSql, [idUsuario]);
            
            if (clienteResult.rows.length > 0) {
                return 'cliente';
            }
            
            // Se não está em nenhuma tabela, retorna padrão
            return 'cliente';
            
        } catch (error) {
            console.error('Erro ao detectar tipo:', error);
            return 'cliente'; // Padrão seguro
        }
    }
    
    // ========================
    // CRIAR NOVO USUÁRIO
    // ========================
    static async criarUsuario(req, res) {
        try {
            const { id, nome, email, senha, tipo } = req.body;
            
            // Validação básica
            if (!id || !nome || !email || !senha) {
                return res.status(400).json({ 
                    error: 'Dados incompletos',
                    required: ['id', 'nome', 'email', 'senha']
                });
            }
            
            // Verifica se ID já existe
            const checkSql = 'SELECT id_usuario FROM usuario WHERE id_usuario = $1';
            const existingId = await query(checkSql, [id]);
            
            if (existingId.rows.length > 0) {
                return res.status(409).json({ error: 'ID já existe' });
            }

            // Verifica se email já existe
            const checkEmailSql = 'SELECT id_usuario FROM usuario WHERE email = $1';
            const existingEmail = await query(checkEmailSql, [email]);
            
            if (existingEmail.rows.length > 0) {
                return res.status(409).json({ error: 'Email já cadastrado' });
            }
            
            const insertSql = `
                INSERT INTO usuario (id_usuario, nome_completo, email, senha)
                VALUES ($1, $2, $3, $4)
                RETURNING id_usuario as id, nome_completo as nome, 
                         email
            `;
            
            const result = await query(insertSql, [id, nome, email, senha]);
            const novoUsuario = result.rows[0];
            
            // Adiciona tipo na resposta
            novoUsuario.tipo = tipo || 'cliente';
            
            res.status(201).json(novoUsuario);
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // ATUALIZAR USUÁRIO
    // ========================
    static async atualizarUsuario(req, res) {
        try {
            const { id, nome, email, senha, tipo } = req.body;
            
            // Validação básica
            if (!id || !nome || !email || !senha) {
                return res.status(400).json({ 
                    error: 'Dados incompletos',
                    required: ['id', 'nome', 'email', 'senha']
                });
            }
            
            // Verifica se usuário existe
            const checkSql = 'SELECT id_usuario FROM usuario WHERE id_usuario = $1';
            const existing = await query(checkSql, [id]);
            
            if (existing.rows.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            // Verifica se o email foi alterado para um que já existe
            const checkEmailSql = 'SELECT id_usuario FROM usuario WHERE email = $1 AND id_usuario != $2';
            const existingEmail = await query(checkEmailSql, [email, id]);
            
            if (existingEmail.rows.length > 0) {
                return res.status(409).json({ error: 'Email já está em uso por outro usuário' });
            }
            
            const updateSql = `
                UPDATE usuario 
                SET nome_completo = $2, email = $3, senha = $4
                WHERE id_usuario = $1
                RETURNING id_usuario as id, nome_completo as nome, 
                         email
            `;
            
            const result = await query(updateSql, [id, nome, email, senha]);
            const usuarioAtualizado = result.rows[0];
            
            // Adiciona tipo na resposta
            usuarioAtualizado.tipo = tipo || 'cliente';
            
            res.json(usuarioAtualizado);
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // EXCLUIR USUÁRIO (CORRIGIDO)
    // ========================
    static async excluirUsuario(req, res) {
        try {
            const { id } = req.params;
            
            // Usa transação para garantir consistência
            const result = await transaction(async (client) => {
                // Verifica se usuário existe
                const checkSql = 'SELECT id_usuario FROM usuario WHERE id_usuario = $1';
                const existing = await client.query(checkSql, [id]);
                
                if (existing.rows.length === 0) {
                    throw new Error('Usuário não encontrado');
                }
                
                // PASSO 1: Verifica se usuário tem dados relacionados e os remove
                
                // Remove registro de funcionário se existir
                const deleteFuncionarioSql = 'DELETE FROM funcionario WHERE id_usuario = $1';
                const funcionarioResult = await client.query(deleteFuncionarioSql, [id]);
                
                if (funcionarioResult.rowCount > 0) {
                    console.log(`Removido registro de funcionário para usuário ${id}`);
                }
                
                // Remove registro de cliente se existir
                const deleteClienteSql = 'DELETE FROM cliente WHERE id_usuario = $1';
                const clienteResult = await client.query(deleteClienteSql, [id]);
                
                if (clienteResult.rowCount > 0) {
                    console.log(`Removido registro de cliente para usuário ${id}`);
                }
                
                // PASSO 2: Remove o usuário
                const deleteUsuarioSql = 'DELETE FROM usuario WHERE id_usuario = $1';
                const usuarioResult = await client.query(deleteUsuarioSql, [id]);
                
                if (usuarioResult.rowCount === 0) {
                    throw new Error('Falha ao excluir usuário');
                }
                
                return {
                    usuario_removido: true,
                    funcionario_removido: funcionarioResult.rowCount > 0,
                    cliente_removido: clienteResult.rowCount > 0
                };
            });
            
            res.json({ 
                success: true, 
                message: `Usuário ID ${id} excluído com sucesso`,
                detalhes: {
                    usuario: 'removido',
                    funcionario: result.funcionario_removido ? 'removido' : 'não existia',
                    cliente: result.cliente_removido ? 'removido' : 'não existia'
                }
            });
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            
            if (error.message === 'Usuário não encontrado') {
                return res.status(404).json({ error: error.message });
            }
            
            // Verifica se é erro de constraint/foreign key
            if (error.code === '23503') {
                return res.status(400).json({ 
                    error: 'Não é possível excluir o usuário',
                    message: 'Existem registros relacionados que impedem a exclusão',
                    details: 'Remova primeiro os dados relacionados (pedidos, etc.) antes de excluir o usuário'
                });
            }
            
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // FUNÇÃO AUXILIAR: VERIFICAR DEPENDÊNCIAS
    // ========================
    static async verificarDependencias(req, res) {
        try {
            const { id } = req.params;
            
            const dependencias = {
                cliente: false,
                funcionario: false,
                pedidos: 0,
                outras_referencias: []
            };
            
            // Verifica se é cliente
            const clienteResult = await query(
                'SELECT id_cliente FROM cliente WHERE id_usuario = $1', 
                [id]
            );
            dependencias.cliente = clienteResult.rows.length > 0;
            
            // Verifica se é funcionário
            const funcionarioResult = await query(
                'SELECT id_funcionario FROM funcionario WHERE id_usuario = $1', 
                [id]
            );
            dependencias.funcionario = funcionarioResult.rows.length > 0;
            
            // Verifica outras dependências que possam existir
            // (adicione aqui outras tabelas que referenciam usuario)
            
            res.json(dependencias);
            
        } catch (error) {
            console.error('Erro ao verificar dependências:', error);
            res.status(500).json({ 
                error: 'Erro ao verificar dependências',
                details: error.message 
            });
        }
    }
}

module.exports = UsuarioController;