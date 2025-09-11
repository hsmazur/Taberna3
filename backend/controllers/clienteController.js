// ===========================================
// CONTROLLER - GERENCIAMENTO DE CLIENTES
// ===========================================

const { query, transaction } = require('../database');

class ClienteController {
    
    // ========================
    // LISTAR TODOS OS CLIENTES
    // ========================
    static async listarClientes(req, res) {
        try {
            const sql = `
                SELECT c.id_cliente, c.id_usuario, c.telefone, c.endereco, c.bairro,
                       u.nome_completo as nome, u.email
                FROM cliente c
                INNER JOIN usuario u ON c.id_usuario = u.id_usuario
                ORDER BY u.nome_completo
            `;
            
            const result = await query(sql);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar clientes:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // BUSCAR CLIENTE POR ID
    // ========================
    static async buscarCliente(req, res) {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT c.id_cliente, c.id_usuario, c.telefone, c.endereco, c.bairro,
                       u.nome_completo as nome, u.email
                FROM cliente c
                INNER JOIN usuario u ON c.id_usuario = u.id_usuario
                WHERE c.id_cliente = $1
            `;
            
            const result = await query(sql, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // BUSCAR CLIENTE POR ID DO USUÁRIO
    // ========================
    static async buscarClientePorUsuario(req, res) {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT c.id_cliente, c.id_usuario, c.telefone, c.endereco, c.bairro,
                       u.nome_completo as nome, u.email
                FROM cliente c
                INNER JOIN usuario u ON c.id_usuario = u.id_usuario
                WHERE c.id_usuario = $1
            `;
            
            const result = await query(sql, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar cliente por usuário:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // CRIAR NOVO CLIENTE
    // ========================
    static async criarCliente(req, res) {
        try {
            const { id_usuario, telefone, endereco, bairro } = req.body;
            
            // Verifica se usuário existe
            const checkUsuarioSql = 'SELECT id_usuario FROM usuario WHERE id_usuario = $1';
            const usuarioExistente = await query(checkUsuarioSql, [id_usuario]);
            
            if (usuarioExistente.rows.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            
            // Verifica se já é cliente
            const checkClienteSql = 'SELECT id_cliente FROM cliente WHERE id_usuario = $1';
            const clienteExistente = await query(checkClienteSql, [id_usuario]);
            
            if (clienteExistente.rows.length > 0) {
                return res.status(409).json({ error: 'Usuário já é cliente' });
            }
            
            const insertSql = `
                INSERT INTO cliente (id_usuario, telefone, endereco, bairro)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            
            const result = await query(insertSql, [id_usuario, telefone, endereco, bairro]);
            
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // ATUALIZAR CLIENTE
    // ========================
    static async atualizarCliente(req, res) {
        try {
            const { id_usuario, telefone, endereco, bairro } = req.body;
            
            // Verifica se cliente existe
            const checkSql = 'SELECT id_cliente FROM cliente WHERE id_usuario = $1';
            const existing = await query(checkSql, [id_usuario]);
            
            if (existing.rows.length === 0) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
            
            const updateSql = `
                UPDATE cliente 
                SET telefone = $2, endereco = $3, bairro = $4
                WHERE id_usuario = $1
                RETURNING *
            `;
            
            const result = await query(updateSql, [id_usuario, telefone, endereco, bairro]);
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // EXCLUIR CLIENTE
    // ========================
    static async excluirCliente(req, res) {
        try {
            const { id } = req.params;
            
            const deleteSql = 'DELETE FROM cliente WHERE id_cliente = $1';
            const result = await query(deleteSql, [id]);
            
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Cliente não encontrado' });
            }
            
            res.json({ 
                success: true, 
                message: 'Cliente excluído com sucesso' 
            });
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
}

module.exports = ClienteController;