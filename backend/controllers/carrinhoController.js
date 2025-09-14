// controllers/carrinhoController.js - VERSÃO COMPLETA E CORRIGIDA
const db = require('../database');

// ID de usuário temporário para carrinhos não autenticados
const USUARIO_TEMPORARIO_ID = 1; // Usando ID 1 que provavelmente existe

// Listar itens do carrinho
const listarCarrinho = async (req, res) => {
  try {
    // Busca itens do carrinho no banco
    const result = await db.query(`
      SELECT pp.id_produto as "produtoId", pp.quantidade, p.nome_produto as nome, p.preco_produto as preco
      FROM pedido_produto pp
      INNER JOIN produto p ON pp.id_produto = p.id_produto
      INNER JOIN pedido ped ON pp.id_pedido = ped.id_pedido
      WHERE ped.pagamento = 'Pendente' AND ped.id_usuario = $1
    `, [USUARIO_TEMPORARIO_ID]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar carrinho:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar carrinho'
    });
  }
};

// Adicionar/atualizar item no carrinho
const atualizarCarrinho = async (req, res) => {
  try {
    const { produtoId, quantidade } = req.body;
    
    if (!produtoId || quantidade < 0) {
      return res.status(400).json({ 
        message: 'Produto ID e quantidade válida são obrigatórios' 
      });
    }
    
    // Verifica se o produto existe
    const produtoResult = await db.query(
      'SELECT id_produto, preco_produto FROM produto WHERE id_produto = $1', 
      [produtoId]
    );
    
    if (produtoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    const produto = produtoResult.rows[0];

    // Busca ou cria um pedido pendente com usuário temporário
    let pedidoResult = await db.query(
      'SELECT id_pedido FROM pedido WHERE id_usuario = $1 AND pagamento = $2',
      [USUARIO_TEMPORARIO_ID, 'Pendente']
    );

    let pedidoId;
    if (pedidoResult.rows.length === 0) {
      // Cria novo pedido pendente com usuário temporário
      const novoPedido = await db.query(
        'INSERT INTO pedido (id_usuario, pagamento, valor_total) VALUES ($1, $2, $3) RETURNING id_pedido',
        [USUARIO_TEMPORARIO_ID, 'Pendente', 0]
      );
      pedidoId = novoPedido.rows[0].id_pedido;
    } else {
      pedidoId = pedidoResult.rows[0].id_pedido;
    }

    // Verifica se o item já existe no carrinho
    const itemExistente = await db.query(
      'SELECT * FROM pedido_produto WHERE id_pedido = $1 AND id_produto = $2',
      [pedidoId, produtoId]
    );

    if (itemExistente.rows.length > 0) {
      if (quantidade > 0) {
        // Atualiza quantidade
        await db.query(
          'UPDATE pedido_produto SET quantidade = $1 WHERE id_pedido = $2 AND id_produto = $3',
          [quantidade, pedidoId, produtoId]
        );
      } else {
        // Remove item
        await db.query(
          'DELETE FROM pedido_produto WHERE id_pedido = $1 AND id_produto = $2',
          [pedidoId, produtoId]
        );
      }
    } else if (quantidade > 0) {
      // Adiciona novo item
      await db.query(
        'INSERT INTO pedido_produto (id_pedido, id_produto, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
        [pedidoId, produtoId, quantidade, produto.preco_produto]
      );
    }

    // Atualiza valor total do pedido
    await atualizarValorTotalPedido(pedidoId);

    // Retorna o carrinho atualizado
    const carrinhoAtualizado = await getCarrinho();
    
    res.json({ 
      message: 'Carrinho atualizado com sucesso',
      carrinho: carrinhoAtualizado
    });
    
  } catch (error) {
    console.error('Erro ao atualizar carrinho:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar carrinho'
    });
  }
};

// Limpar carrinho
const limparCarrinho = async (req, res) => {
  try {
    // Encontra o pedido pendente do usuário temporário
    const pedidoResult = await db.query(
      'SELECT id_pedido FROM pedido WHERE id_usuario = $1 AND pagamento = $2',
      [USUARIO_TEMPORARIO_ID, 'Pendente']
    );

    if (pedidoResult.rows.length > 0) {
      const pedidoId = pedidoResult.rows[0].id_pedido;
      
      // Remove todos os itens do pedido
      await db.query(
        'DELETE FROM pedido_produto WHERE id_pedido = $1',
        [pedidoId]
      );

      // Atualiza valor total para 0
      await db.query(
        'UPDATE pedido SET valor_total = 0 WHERE id_pedido = $1',
        [pedidoId]
      );
    }

    res.json({ message: 'Carrinho limpo com sucesso' });
  } catch (error) {
    console.error('Erro ao limpar carrinho:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao limpar carrinho'
    });
  }
};

// Função auxiliar para atualizar valor total do pedido
async function atualizarValorTotalPedido(pedidoId) {
  try {
    const totalResult = await db.query(`
      SELECT COALESCE(SUM(pp.quantidade * pp.preco_unitario), 0) as total
      FROM pedido_produto pp
      WHERE pp.id_pedido = $1
    `, [pedidoId]);

    const total = totalResult.rows[0].total;
    
    await db.query(
      'UPDATE pedido SET valor_total = $1 WHERE id_pedido = $2',
      [total, pedidoId]
    );
  } catch (error) {
    console.error('Erro ao atualizar valor total:', error);
    throw error;
  }
}

// Função auxiliar para obter carrinho
async function getCarrinho() {
  try {
    const result = await db.query(`
      SELECT pp.id_produto as "produtoId", pp.quantidade, p.nome_produto as nome, p.preco_produto as preco
      FROM pedido_produto pp
      INNER JOIN produto p ON pp.id_produto = p.id_produto
      INNER JOIN pedido ped ON pp.id_pedido = ped.id_pedido
      WHERE ped.pagamento = 'Pendente' AND ped.id_usuario = $1
    `, [USUARIO_TEMPORARIO_ID]);

    return result.rows;
  } catch (error) {
    console.error('Erro ao obter carrinho:', error);
    return [];
  }
}

module.exports = {
  listarCarrinho,
  atualizarCarrinho,
  limparCarrinho
};