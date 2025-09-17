// controllers/pedidoController.js
const db = require('../database');

// Listar todos os pedidos
const listarPedidos = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id_pedido,
        p.id_usuario,
        u.nome_completo as nome_usuario,
        p.data_pedido,
        p.pagamento,
        p.valor_total,
        json_agg(
          json_build_object(
            'id_produto', pp.id_produto,
            'nome_produto', prod.nome_produto,
            'quantidade', pp.quantidade,
            'preco_unitario', pp.preco_unitario
          )
        ) as produtos
      FROM pedido p
      INNER JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN pedido_produto pp ON p.id_pedido = pp.id_pedido
      LEFT JOIN produto prod ON pp.id_produto = prod.id_produto
      GROUP BY p.id_pedido, u.nome_completo
      ORDER BY p.data_pedido DESC
    `);
    
    // Mapear os campos do banco para os campos esperados pelo frontend
    const pedidos = result.rows.map(pedido => ({
      id: pedido.id_pedido,
      id_usuario: pedido.id_usuario,
      nome_usuario: pedido.nome_usuario,
      data_pedido: pedido.data_pedido,
      pagamento: pedido.pagamento,
      valor_total: pedido.valor_total,
      produtos: pedido.produtos || []
    }));
    
    res.json(pedidos);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar pedidos'
    });
  }
};

// Buscar pedido por ID
const buscarPedidoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        p.id_pedido,
        p.id_usuario,
        u.nome_completo as nome_usuario,
        p.data_pedido,
        p.pagamento,
        p.valor_total,
        json_agg(
          json_build_object(
            'id_produto', pp.id_produto,
            'nome_produto', prod.nome_produto,
            'quantidade', pp.quantidade,
            'preco_unitario', pp.preco_unitario
          )
        ) as produtos
      FROM pedido p
      INNER JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN pedido_produto pp ON p.id_pedido = pp.id_pedido
      LEFT JOIN produto prod ON pp.id_produto = prod.id_produto
      WHERE p.id_pedido = $1
      GROUP BY p.id_pedido, u.nome_completo
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    const pedido = result.rows[0];
    // Mapear os campos
    const pedidoFormatado = {
      id: pedido.id_pedido,
      id_usuario: pedido.id_usuario,
      nome_usuario: pedido.nome_usuario,
      data_pedido: pedido.data_pedido,
      pagamento: pedido.pagamento,
      valor_total: pedido.valor_total,
      produtos: pedido.produtos || []
    };
    
    res.json(pedidoFormatado);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar pedido'
    });
  }
};

// Atualizar pedido
const atualizarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { pagamento } = req.body;
    
    // Verifica se o pedido existe
    const pedidoExiste = await db.query('SELECT id_pedido FROM pedido WHERE id_pedido = $1', [id]);
    if (pedidoExiste.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    // Validação do status de pagamento
    const statusValidos = ['Pendente', 'Aprovado', 'Cancelado', 'Reembolsado'];
    if (pagamento && !statusValidos.includes(pagamento)) {
      return res.status(400).json({ 
        message: 'Status de pagamento inválido. Valores válidos: Pendente, Aprovado, Cancelado, Reembolsado' 
      });
    }
    
    const result = await db.query(
      'UPDATE pedido SET pagamento = $1 WHERE id_pedido = $2 RETURNING *',
      [pagamento, id]
    );
    
    const pedidoAtualizado = result.rows[0];
    res.json({
      id: pedidoAtualizado.id_pedido,
      id_usuario: pedidoAtualizado.id_usuario,
      data_pedido: pedidoAtualizado.data_pedido,
      pagamento: pedidoAtualizado.pagamento,
      valor_total: pedidoAtualizado.valor_total,
      message: 'Pedido atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar pedido'
    });
  }
};

// Deletar pedido
const deletarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primeiro deleta os itens do pedido_produto
    await db.query('DELETE FROM pedido_produto WHERE id_pedido = $1', [id]);
    
    // Depois deleta o pedido
    const result = await db.query('DELETE FROM pedido WHERE id_pedido = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }
    
    res.json({ message: 'Pedido deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar pedido:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao deletar pedido'
    });
  }
};

module.exports = {
  listarPedidos,
  buscarPedidoPorId,
  atualizarPedido,
  deletarPedido
};