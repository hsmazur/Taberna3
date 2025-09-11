// ===========================================
// CONTROLLER - GERENCIAMENTO DE FUNCIONÁRIOS
// ===========================================

const { query, transaction } = require('../database');

class FuncionarioController {
    
    // ========================
    // LISTAR TODOS OS FUNCIONÁRIOS
    // ========================
    static async listarFuncionarios(req, res) {
        try {
            const sql = `
                SELECT f.id_funcionario, f.id_usuario, f.cargo,
                       u.nome_completo as nome, u.email
                FROM funcionario f
                INNER JOIN usuario u ON f.id_usuario = u.id_usuario
                ORDER BY u.nome_completo
            `;
            
            const result = await query(sql);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar funcionários:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // BUSCAR FUNCIONÁRIO POR ID
    // ========================
    static async buscarFuncionario(req, res) {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT f.id_funcionario, f.id_usuario, f.cargo,
                       u.nome_completo as nome, u.email
                FROM funcionario f
                INNER JOIN usuario u ON f.id_usuario = u.id_usuario
                WHERE f.id_funcionario = $1
            `;
            
            const result = await query(sql, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar funcionário:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // BUSCAR FUNCIONÁRIO POR ID DO USUÁRIO
    // ========================
    static async buscarFuncionarioPorUsuario(req, res) {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT f.id_funcionario, f.id_usuario, f.cargo,
                       u.nome_completo as nome, u.email
                FROM funcionario f
                INNER JOIN usuario u ON f.id_usuario = u.id_usuario
                WHERE f.id_usuario = $1
            `;
            
            const result = await query(sql, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar funcionário por usuário:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // CRIAR NOVO FUNCIONÁRIO
    // ========================
    static async criarFuncionario(req, res) {
        try {
            const { id_usuario, cargo } = req.body;
            
            // Verifica se usuário existe
            const checkUsuarioSql = 'SELECT id_usuario FROM usuario WHERE id_usuario = $1';
            const usuarioExistente = await query(checkUsuarioSql, [id_usuario]);
            
            if (usuarioExistente.rows.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            
            // Verifica se já é funcionário
            const checkFuncionarioSql = 'SELECT id_funcionario FROM funcionario WHERE id_usuario = $1';
            const funcionarioExistente = await query(checkFuncionarioSql, [id_usuario]);
            
            if (funcionarioExistente.rows.length > 0) {
                return res.status(409).json({ error: 'Usuário já é funcionário' });
            }
            
            const insertSql = `
                INSERT INTO funcionario (id_usuario, cargo)
                VALUES ($1, $2)
                RETURNING *
            `;
            
            const result = await query(insertSql, [id_usuario, cargo]);
            
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao criar funcionário:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // ATUALIZAR FUNCIONÁRIO
    // ========================
    static async atualizarFuncionario(req, res) {
        try {
            const { id_usuario, cargo } = req.body;
            
            // Verifica se funcionário existe
            const checkSql = 'SELECT id_funcionario FROM funcionario WHERE id_usuario = $1';
            const existing = await query(checkSql, [id_usuario]);
            
            if (existing.rows.length === 0) {
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }
            
            const updateSql = `
                UPDATE funcionario 
                SET cargo = $2
                WHERE id_usuario = $1
                RETURNING *
            `;
            
            const result = await query(updateSql, [id_usuario, cargo]);
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao atualizar funcionário:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // EXCLUIR FUNCIONÁRIO
    // ========================
    static async excluirFuncionario(req, res) {
        try {
            const { id } = req.params;
            
            const deleteSql = 'DELETE FROM funcionario WHERE id_funcionario = $1';
            const result = await query(deleteSql, [id]);
            
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Funcionário não encontrado' });
            }
            
            res.json({ 
                success: true, 
                message: 'Funcionário excluído com sucesso' 
            });
        } catch (error) {
            console.error('Erro ao excluir funcionário:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
}

module.exports = FuncionarioController;