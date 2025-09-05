// controllers/carrinhoController.js
const db = require('../database');

// Listar itens do carrinho (simulação - pode usar sessão ou cookie)
const listarCarrinho = async (req, res) => {
  try {
    // Por enquanto, retornamos um carrinho vazio
    // Em uma implementação real, você usaria sessões ou autenticação
    const carrinho = req.session?.carrinho || [];
    res.json(carrinho);
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
    const produto = await db.query('SELECT id FROM produtos WHERE id = $1', [produtoId]);
    if (produto.rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    // Inicializa carrinho na sessão se não existir
    if (!req.session.carrinho) {
      req.session.carrinho = [];
    }
    
    const carrinho = req.session.carrinho;
    const itemIndex = carrinho.findIndex(item => item.produtoId == produtoId);
    
    if (itemIndex >= 0) {
      if (quantidade > 0) {
        carrinho[itemIndex].quantidade = quantidade;
      } else {
        carrinho.splice(itemIndex, 1);
      }
    } else if (quantidade > 0) {
      carrinho.push({ produtoId: parseInt(produtoId), quantidade });
    }
    
    res.json({ 
      message: 'Carrinho atualizado com sucesso',
      carrinho: carrinho
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
    if (req.session) {
      req.session.carrinho = [];
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

module.exports = {
  listarCarrinho,
  atualizarCarrinho,
  limparCarrinho
};