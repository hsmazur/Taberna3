// controllers/produtoController.js
const db = require('../database');

// Listar todos os produtos
const listarProdutos = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM produtos ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar produtos'
    });
  }
};

// Buscar produto por ID
const buscarProdutoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM produtos WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar produto'
    });
  }
};

// Criar novo produto
const criarProduto = async (req, res) => {
  try {
    const { nome, ingredientes, preco, categoria } = req.body;
    
    if (!nome || !ingredientes || !preco) {
      return res.status(400).json({ 
        message: 'Nome, ingredientes e preço são obrigatórios' 
      });
    }
    
    const result = await db.query(
      'INSERT INTO produtos (nome, ingredientes, preco, categoria) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, ingredientes, preco, categoria || 'lanche']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao criar produto'
    });
  }
};

// Atualizar produto
const atualizarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, ingredientes, preco, categoria } = req.body;
    
    // Verifica se o produto existe
    const produtoExiste = await db.query('SELECT id FROM produtos WHERE id = $1', [id]);
    if (produtoExiste.rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    const result = await db.query(
      'UPDATE produtos SET nome = $1, ingredientes = $2, preco = $3, categoria = $4 WHERE id = $5 RETURNING *',
      [nome, ingredientes, preco, categoria, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar produto'
    });
  }
};

// Deletar produto
const deletarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM produtos WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro ao deletar produto'
    });
  }
};

module.exports = {
  listarProdutos,
  buscarProdutoPorId,
  criarProduto,
  atualizarProduto,
  deletarProduto
};