// controllers/avaliacaoController.js
const { query, transaction } = require('../database');

class AvaliacaoController {
    
    // ========================
    // BUSCAR AVALIAÇÕES POR USUÁRIO
    // ========================
    static async getAvaliacoesPorUsuario(req, res) {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT a.id_avaliacao as id, a.nota, a.comentario, a.data_avaliacao,
                       p.id_produto as produto_id, p.nome_produto as produto_nome,
                       p.descricao as produto_descricao
                FROM avaliacao a
                INNER JOIN produto p ON a.id_produto = p.id_produto
                WHERE a.id_usuario = $1
                ORDER BY a.data_avaliacao DESC
            `;
            
            const result = await query(sql, [id]);
            
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar avaliações do usuário:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // BUSCAR AVALIAÇÕES POR PRODUTO
    // ========================
    static async getAvaliacoesPorProduto(req, res) {
        try {
            const { id } = req.params;
            
            const sql = `
                SELECT a.id_avaliacao as id, a.nota, a.comentario, a.data_avaliacao,
                       u.id_usuario as usuario_id, u.nome_completo as usuario_nome
                FROM avaliacao a
                INNER JOIN usuario u ON a.id_usuario = u.id_usuario
                WHERE a.id_produto = $1
                ORDER BY a.data_avaliacao DESC
            `;
            
            const result = await query(sql, [id]);
            
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar avaliações do produto:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // BUSCAR PRODUTOS CONSUMIDOS POR USUÁRIO
    // ========================
    static async getProdutosConsumidos(req, res) {
        try {
            const { usuarioId } = req.params;
            
            const sql = `
                SELECT DISTINCT p.id_produto as id, p.nome_produto as nome, 
                       p.descricao as ingredientes, p.preco_produto as preco
                FROM pedido_produto pp
                INNER JOIN pedido ped ON pp.id_pedido = ped.id_pedido
                INNER JOIN produto p ON pp.id_produto = p.id_produto
                WHERE ped.id_usuario = $1
                AND ped.pagamento = 'Aprovado' -- Apenas pedidos pagos
                AND NOT EXISTS (
                    SELECT 1 FROM avaliacao a 
                    WHERE a.id_produto = p.id_produto 
                    AND a.id_usuario = $1
                ) -- Apenas produtos não avaliados ainda
                ORDER BY p.nome_produto
            `;
            
            const result = await query(sql, [usuarioId]);
            
            // Adiciona imagem padrão para cada produto
            const produtos = result.rows.map(produto => ({
                ...produto,
                imagem: `img/lanche${produto.id}.png`
            }));
            
            res.json(produtos);
        } catch (error) {
            console.error('Erro ao buscar produtos consumidos:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // CRIAR NOVA AVALIAÇÃO
    // ========================
    static async criarAvaliacao(req, res) {
        try {
            const { produtoId, usuarioId, nota, comentario } = req.body;
            
            // Validação básica
            if (!produtoId || !usuarioId || !nota) {
                return res.status(400).json({ 
                    error: 'Dados incompletos',
                    required: ['produtoId', 'usuarioId', 'nota']
                });
            }
            
            // Verifica se nota está entre 1 e 5
            if (nota < 1 || nota > 5) {
                return res.status(400).json({ 
                    error: 'Nota deve estar entre 1 e 5' 
                });
            }
            
            // Verifica se usuário já avaliou este produto
            const checkSql = `
                SELECT id_avaliacao 
                FROM avaliacao 
                WHERE id_produto = $1 AND id_usuario = $2
            `;
            
            const existing = await query(checkSql, [produtoId, usuarioId]);
            
            if (existing.rows.length > 0) {
                return res.status(409).json({ 
                    error: 'Usuário já avaliou este produto' 
                });
            }
            
            // Verifica se usuário realmente consumiu o produto
            const consumoCheckSql = `
                SELECT 1 
                FROM pedido_produto pp
                INNER JOIN pedido ped ON pp.id_pedido = ped.id_pedido
                WHERE pp.id_produto = $1 
                AND ped.id_usuario = $2
                AND ped.pagamento = 'Aprovado'
                LIMIT 1
            `;
            
            const consumoCheck = await query(consumoCheckSql, [produtoId, usuarioId]);
            
            if (consumoCheck.rows.length === 0) {
                return res.status(403).json({ 
                    error: 'Usuário não consumiu este produto' 
                });
            }
            
            const insertSql = `
                INSERT INTO avaliacao (id_produto, id_usuario, nota, comentario)
                VALUES ($1, $2, $3, $4)
                RETURNING id_avaliacao as id, id_produto as produtoId, 
                         id_usuario as usuarioId, nota, comentario, 
                         data_avaliacao as data
            `;
            
            const result = await query(insertSql, [produtoId, usuarioId, nota, comentario]);
            const novaAvaliacao = result.rows[0];
            
            res.status(201).json(novaAvaliacao);
        } catch (error) {
            console.error('Erro ao criar avaliação:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // ATUALIZAR AVALIAÇÃO
    // ========================
    static async atualizarAvaliacao(req, res) {
        try {
            const { id } = req.params;
            const { nota, comentario } = req.body;
            
            // Validação básica
            if (!nota) {
                return res.status(400).json({ 
                    error: 'Nota é obrigatória' 
                });
            }
            
            if (nota < 1 || nota > 5) {
                return res.status(400).json({ 
                    error: 'Nota deve estar entre 1 e 5' 
                });
            }
            
            // Verifica se avaliação existe
            const checkSql = 'SELECT id_avaliacao FROM avaliacao WHERE id_avaliacao = $1';
            const existing = await query(checkSql, [id]);
            
            if (existing.rows.length === 0) {
                return res.status(404).json({ error: 'Avaliação não encontrada' });
            }
            
            const updateSql = `
                UPDATE avaliacao 
                SET nota = $2, comentario = $3
                WHERE id_avaliacao = $1
                RETURNING id_avaliacao as id, id_produto as produtoId, 
                         id_usuario as usuarioId, nota, comentario, 
                         data_avaliacao as data
            `;
            
            const result = await query(updateSql, [id, nota, comentario]);
            const avaliacaoAtualizada = result.rows[0];
            
            res.json(avaliacaoAtualizada);
        } catch (error) {
            console.error('Erro ao atualizar avaliação:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    
    // ========================
    // EXCLUIR AVALIAÇÃO
    // ========================
    static async excluirAvaliacao(req, res) {
        try {
            const { id } = req.params;
            
            // Verifica se avaliação existe
            const checkSql = 'SELECT id_avaliacao FROM avaliacao WHERE id_avaliacao = $1';
            const existing = await query(checkSql, [id]);
            
            if (existing.rows.length === 0) {
                return res.status(404).json({ error: 'Avaliação não encontrada' });
            }
            
            const deleteSql = 'DELETE FROM avaliacao WHERE id_avaliacao = $1';
            await query(deleteSql, [id]);
            
            res.json({ 
                success: true, 
                message: `Avaliação ID ${id} excluída com sucesso` 
            });
        } catch (error) {
            console.error('Erro ao excluir avaliação:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    // ========================
    // BUSCAR O LANCHE MAIS BEM AVALIADO
    // ========================
    static async getMelhorLanche(req, res) {
        try {
        const sql = `
                SELECT p.id_produto as id, p.nome_produto as nome, 
                       p.descricao as ingredientes, p.preco_produto as preco,
                       ROUND(AVG(a.nota)::numeric, 1) as media,
                       COUNT(a.id_avaliacao) as total_avaliacoes
                FROM produto p
                LEFT JOIN avaliacao a ON p.id_produto = a.id_produto
                GROUP BY p.id_produto, p.nome_produto, p.descricao, p.preco_produto
                HAVING COUNT(a.id_avaliacao) > 0
                ORDER BY media DESC, total_avaliacoes DESC
                LIMIT 1
            `;
        
            const result = await query(sql);
        
            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'Nenhum lanche avaliado encontrado' 
                });
            }
        
            const melhorLanche = result.rows[0];
        
            res.json({
                produto: {
                    id: melhorLanche.id,
                    nome: melhorLanche.nome,
                    ingredientes: melhorLanche.ingredientes,
                    preco: melhorLanche.preco
                },
                media: parseFloat(melhorLanche.media),
                total_avaliacoes: parseInt(melhorLanche.total_avaliacoes)
            });
        
        } catch (error) {
            console.error('Erro ao buscar melhor lanche:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
    // ========================
    // BUSCAR AVALIAÇÕES POR PRODUTO
    // ========================
    static async getAvaliacoesPorProduto(req, res) {
        try {
            const { id } = req.params;
            
            const sql = `
            SELECT a.id_avaliacao, a.nota, a.comentario, a.data_avaliacao,
            u.id_usuario, u.nome_completo as usuario_nome
            FROM avaliacao a
            INNER JOIN usuario u ON a.id_usuario = u.id_usuario
            WHERE a.id_produto = $1
            ORDER BY a.data_avaliacao DESC
            `;
            
            const result = await query(sql, [id]);
            
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar avaliações do produto:', error);
            res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }
    }
}


module.exports = AvaliacaoController;