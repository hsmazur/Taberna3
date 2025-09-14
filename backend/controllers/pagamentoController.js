// controllers/pagamentoController.js - Controlador de pagamentos
const db = require('../database');

// Finalizar pedido e processar pagamento
const finalizarPedido = async (req, res) => {
    const client = await db.connect();
    
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
        
        // Se há dados de entrega, salva na tabela de entregas (criar se necessário)
        if (dadosEntrega && dadosEntrega.taxaEntrega > 0) {
            // Verifica se existe tabela de entrega, senão cria
            await client.query(`
                CREATE TABLE IF NOT EXISTS entrega (
                    id_entrega SERIAL PRIMARY KEY,
                    id_pedido INT UNIQUE REFERENCES pedido(id_pedido),
                    nome_cliente VARCHAR(150) NOT NULL,
                    telefone VARCHAR(20) NOT NULL,
                    endereco VARCHAR(200) NOT NULL,
                    bairro VARCHAR(100) NOT NULL,
                    taxa_entrega DECIMAL(10,2) NOT NULL,
                    status_entrega VARCHAR(50) DEFAULT 'Pendente',
                    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await client.query(`
                INSERT INTO entrega (id_pedido, nome_cliente, telefone, endereco, bairro, taxa_entrega)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                pedidoId,
                dadosEntrega.nome,
                dadosEntrega.telefone,
                dadosEntrega.endereco,
                dadosEntrega.bairro,
                dadosEntrega.taxaEntrega
            ]);
        }
        
        // Se for pagamento com cartão, salva informações (mascaradas)
        if (metodoPagamento === 'debito' && dadosCartao) {
            // Cria tabela de pagamentos se não existir
            await client.query(`
                CREATE TABLE IF NOT EXISTS pagamento (
                    id_pagamento SERIAL PRIMARY KEY,
                    id_pedido INT UNIQUE REFERENCES pedido(id_pedido),
                    tipo_pagamento VARCHAR(50) NOT NULL,
                    ultimos_digitos_cartao VARCHAR(4),
                    nome_cartao VARCHAR(100),
                    valor_pago DECIMAL(10,2) NOT NULL,
                    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await client.query(`
                INSERT INTO pagamento (id_pedido, tipo_pagamento, ultimos_digitos_cartao, nome_cartao, valor_pago)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                pedidoId,
                metodoPagamento,
                dadosCartao.numero, // Já vem apenas os 4 últimos dígitos
                dadosCartao.nome,
                total
            ]);
        }
        
        // Se for dinheiro com troco, salva a informação
        if (metodoPagamento === 'dinheiro' && valorTroco) {
            await client.query(`
                CREATE TABLE IF NOT EXISTS pagamento (
                    id_pagamento SERIAL PRIMARY KEY,
                    id_pedido INT UNIQUE REFERENCES pedido(id_pedido),
                    tipo_pagamento VARCHAR(50) NOT NULL,
                    valor_pago DECIMAL(10,2) NOT NULL,
                    valor_troco DECIMAL(10,2),
                    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await client.query(`
                INSERT INTO pagamento (id_pedido, tipo_pagamento, valor_pago, valor_troco)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id_pedido) DO UPDATE SET
                valor_troco = $4
            `, [pedidoId, metodoPagamento, total, valorTroco]);
        }
        
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
        
        // Busca dados de entrega se houver
        try {
            const entregaResult = await db.query(`
                SELECT nome_cliente, telefone, endereco, bairro, taxa_entrega, status_entrega
                FROM entrega
                WHERE id_pedido = $1
            `, [pedidoId]);
            
            if (entregaResult.rows.length > 0) {
                pedido.entrega = entregaResult.rows[0];
            }
        } catch (err) {
            // Tabela de entrega pode não existir ainda
            console.log('Tabela entrega não encontrada');
        }
        
        // Busca dados de pagamento se houver
        try {
            const pagamentoResult = await db.query(`
                SELECT tipo_pagamento, ultimos_digitos_cartao, nome_cartao, 
                       valor_pago, valor_troco, data_pagamento
                FROM pagamento
                WHERE id_pedido = $1
            `, [pedidoId]);
            
            if (pagamentoResult.rows.length > 0) {
                pedido.pagamento_detalhes = pagamentoResult.rows[0];
            }
        } catch (err) {
            // Tabela de pagamento pode não existir ainda
            console.log('Tabela pagamento não encontrada');
        }
        
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