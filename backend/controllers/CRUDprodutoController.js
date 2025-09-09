// ===========================================
// CONTROLLER - GERENCIAMENTO DE PRODUTOS
// ===========================================

const { query, transaction } = require('../database');
const fs = require('fs');
const path = require('path');

class ProdutoController {
    
    // ========================
    // LISTAR TODOS OS PRODUTOS
    // ========================
    static async listarProdutos(req, res) {
        try {
            const sql = `
                SELECT id_produto as id, nome_produto as nome, 
                       descricao as ingredientes, 
                       preco_produto as preco 
                FROM produto 
                ORDER BY id_produto
            `;
            
            const result = await query(sql);
            
            // Adiciona imagem padrão para cada produto
            const produtos = result.rows.map(produto => ({
                ...produto,
                imagem: `img/lanche${produto.id}.png`
            }));
            
            res.json(produtos);
        } catch (error) {
            console.error('Erro ao listar produtos:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // BUSCAR PRODUTO POR ID
    // ========================
    static async buscarProduto(req, res) {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT id_produto as id, nome_produto as nome, 
                       descricao as ingredientes, 
                       preco_produto as preco 
                FROM produto 
                WHERE id_produto = $1
            `;
            
            const result = await query(sql, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }
            
            const produto = result.rows[0];
            // Adiciona imagem padrão
            produto.imagem = `img/lanche${produto.id}.png`;
            
            res.json(produto);
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // CRIAR NOVO PRODUTO
    // ========================
    static async criarProduto(req, res) {
        try {
            const { id, nome, ingredientes, preco } = req.body;
            
            // Validação básica
            if (!id || !nome || !ingredientes || !preco) {
                return res.status(400).json({ 
                    error: 'Dados incompletos',
                    required: ['id', 'nome', 'ingredientes', 'preco']
                });
            }
            
            // Verifica se ID já existe
            const checkSql = 'SELECT id_produto FROM produto WHERE id_produto = $1';
            const existing = await query(checkSql, [id]);
            
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'ID já existe' });
            }
            
            const insertSql = `
                INSERT INTO produto (id_produto, nome_produto, descricao, preco_produto)
                VALUES ($1, $2, $3, $4)
                RETURNING id_produto as id, nome_produto as nome, 
                         descricao as ingredientes, preco_produto as preco
            `;
            
            const result = await query(insertSql, [id, nome, ingredientes, preco]);
            const novoProduto = result.rows[0];
            
            // Adiciona imagem padrão na resposta
            novoProduto.imagem = `img/lanche${novoProduto.id}.png`;
            
            res.status(201).json(novoProduto);
        } catch (error) {
            console.error('Erro ao criar produto:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // ATUALIZAR PRODUTO
    // ========================
    static async atualizarProduto(req, res) {
        try {
            const { id, nome, ingredientes, preco } = req.body;
            
            // Validação básica
            if (!id || !nome || !ingredientes || !preco) {
                return res.status(400).json({ 
                    error: 'Dados incompletos',
                    required: ['id', 'nome', 'ingredientes', 'preco']
                });
            }
            
            // Verifica se produto existe
            const checkSql = 'SELECT id_produto FROM produto WHERE id_produto = $1';
            const existing = await query(checkSql, [id]);
            
            if (existing.rows.length === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }
            
            const updateSql = `
                UPDATE produto 
                SET nome_produto = $2, descricao = $3, preco_produto = $4
                WHERE id_produto = $1
                RETURNING id_produto as id, nome_produto as nome, 
                         descricao as ingredientes, preco_produto as preco
            `;
            
            const result = await query(updateSql, [id, nome, ingredientes, preco]);
            const produtoAtualizado = result.rows[0];
            
            // Adiciona imagem padrão na resposta
            produtoAtualizado.imagem = `img/lanche${produtoAtualizado.id}.png`;
            
            res.json(produtoAtualizado);
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // EXCLUIR PRODUTO
    // ========================
    static async excluirProduto(req, res) {
        try {
            const { id } = req.params;
            
            // Usa transação para garantir consistência
            const result = await transaction(async (client) => {
                // Verifica se produto existe
                const checkSql = 'SELECT id_produto FROM produto WHERE id_produto = $1';
                const existing = await client.query(checkSql, [id]);
                
                if (existing.rows.length === 0) {
                    throw new Error('Produto não encontrado');
                }
                
                // Exclui o produto
                const deleteSql = 'DELETE FROM produto WHERE id_produto = $1';
                await client.query(deleteSql, [id]);
                
                return existing.rows[0];
            });
            
            // Opcional: Remover arquivo de imagem (se existir)
            try {
                const imagemPath = path.join(__dirname, '../../frontend/img', `lanche${id}.png`);
                if (fs.existsSync(imagemPath)) {
                    fs.unlinkSync(imagemPath);
                }
            } catch (imgError) {
                console.warn('Aviso: Não foi possível remover a imagem:', imgError.message);
            }
            
            res.json({ 
                success: true, 
                message: `Produto ID ${id} excluído com sucesso` 
            });
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            if (error.message === 'Produto não encontrado') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ 
                    error: 'Erro interno do servidor',
                    details: error.message 
                });
            }
        }
    }
    
    // ========================
    // UPLOAD DE IMAGEM
    // ========================
    static async uploadImagem(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhuma imagem enviada' });
            }

            const { id } = req.body;
            if (!id) {
                return res.status(400).json({ error: 'ID do produto não fornecido' });
            }

            // Verifica se produto existe
            const checkSql = 'SELECT id_produto FROM produto WHERE id_produto = $1';
            const existing = await query(checkSql, [id]);
            
            if (existing.rows.length === 0) {
                // Remove arquivo temporário
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            // Define o caminho final da imagem
            const novoNome = `lanche${id}.png`;
            const caminhoDestino = path.join(__dirname, '../../frontend/img', novoNome);

            // Cria diretório se não existir
            const dirDestino = path.dirname(caminhoDestino);
            if (!fs.existsSync(dirDestino)) {
                fs.mkdirSync(dirDestino, { recursive: true });
            }

            // Move o arquivo para a pasta final
            fs.renameSync(req.file.path, caminhoDestino);

            res.json({ 
                success: true, 
                imagem: novoNome,
                caminho: `img/${novoNome}`
            });
        } catch (error) {
            // Remove arquivo temporário em caso de erro
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            console.error('Erro no upload:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
}

module.exports = ProdutoController;