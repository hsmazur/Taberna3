// controllers/pagamentoController.js - Controlador de pagamentos (versão simplificada)
const db = require('../database');

// Finalizar pedido e processar pagamento
const finalizarPedido = async (req, res) => {
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { metodoPagamento, total, dadosEntrega, valorTroco, dadosCartao } = req.body;
        const usuarioId = req.usuario?.id || 1; // ID do usuário logado ou temporário
        
        // Validações básicas
        if (!metodoPagamento || !total || total <= 0) {
            return res.status(400).json({ 
                error: 'Dados de pagamento inválidos' 
            });
        }
        
        // Busca o pedido pendente do usuário
        const pedidoResult = await client.query(
            'SELECT id_pedido FROM pedido WHERE id_usuario = $1 AND pagamento = $2',
            [usuarioId, 'Pendente']
        );
        
        if (pedidoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                error: 'Nenhum pedido pendente encontrado' 
            });
        }
        
        const pedidoId = pedidoResult.rows[0].id_pedido;
        
        // Verifica se o pedido tem itens
        const itensResult = await client.query(
            'SELECT COUNT(*) as total FROM pedido_produto WHERE id_pedido = $1',
            [pedidoId]
        );
        
        if (parseInt(itensResult.rows[0].total) === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Pedido não possui itens' 
            });
        }
        
        // Atualiza o pedido com dados do pagamento
        await client.query(`
            UPDATE pedido 
            SET pagamento = $1, 
                valor_total = $2, 
                data_pedido = CURRENT_TIMESTAMP
            WHERE id_pedido = $3
        `, [metodoPagamento, total, pedidoId]);
        
        // Confirma a transação
        await client.query('COMMIT');
        
        // Busca dados completos do pedido finalizado
        const pedidoCompleto = await buscarDetalhesPedido(pedidoId);
        
        res.json({
            success: true,
            message: 'Pedido finalizado com sucesso',
            pedidoId: pedidoId,
            pedido: pedidoCompleto
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao finalizar pedido:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Não foi possível finalizar o pedido'
        });
    } finally {
        client.release();
    }
};

// Buscar detalhes do pedido
const buscarPedido = async (req, res) => {
    try {
        const { pedidoId } = req.params;
        
        if (!pedidoId) {
            return res.status(400).json({ error: 'ID do pedido é obrigatório' });
        }
        
        const pedido = await buscarDetalhesPedido(pedidoId);
        
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        res.json(pedido);
        
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao buscar pedido'
        });
    }
};

// Função auxiliar para buscar detalhes completos do pedido
async function buscarDetalhesPedido(pedidoId) {
    try {
        // Busca dados básicos do pedido
        const pedidoResult = await db.query(`
            SELECT p.id_pedido, p.id_usuario, p.data_pedido, p.pagamento, p.valor_total,
                   u.nome_completo as cliente_nome, u.email as cliente_email
            FROM pedido p
            INNER JOIN usuario u ON p.id_usuario = u.id_usuario
            WHERE p.id_pedido = $1
        `, [pedidoId]);
        
        if (pedidoResult.rows.length === 0) {
            return null;
        }
        
        const pedido = pedidoResult.rows[0];
        
        // Busca itens do pedido
        const itensResult = await db.query(`
            SELECT pp.id_produto, pp.quantidade, pp.preco_unitario,
                   pr.nome_produto, pr.descricao
            FROM pedido_produto pp
            INNER JOIN produto pr ON pp.id_produto = pr.id_produto
            WHERE pp.id_pedido = $1
        `, [pedidoId]);
        
        pedido.itens = itensResult.rows;
        
        return pedido;
        
    } catch (error) {
        console.error('Erro ao buscar detalhes do pedido:', error);
        throw error;
    }
}

// Listar pedidos do usuário
const listarPedidosUsuario = async (req, res) => {
    try {
        const usuarioId = req.usuario?.id || 1;
        
        const result = await db.query(`
            SELECT p.id_pedido, p.data_pedido, p.pagamento, p.valor_total,
                   COUNT(pp.id_produto) as total_itens
            FROM pedido p
            LEFT JOIN pedido_produto pp ON p.id_pedido = pp.id_pedido
            WHERE p.id_usuario = $1 AND p.pagamento != 'Pendente'
            GROUP BY p.id_pedido, p.data_pedido, p.pagamento, p.valor_total
            ORDER BY p.data_pedido DESC
        `, [usuarioId]);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao listar pedidos'
        });
    }
};

module.exports = {
    finalizarPedido,
    buscarPedido,
    listarPedidosUsuario
};