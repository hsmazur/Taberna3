// controllers/produtoController.js
const db = require('../database');

// Listar todos os produtos
const listarProdutos = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM produto ORDER BY id_produto');
    
    // Mapear os campos do banco para os campos esperados pelo frontend
    const produtos = result.rows.map(produto => ({
      id: produto.id_produto,
      nome: produto.nome_produto,
      ingredientes: produto.descricao || 'Ingredientes não especificados',
      preco: produto.preco_produto,
      categoria: 'lanche' // Valor padrão já que não existe no banco
    }));
    
    res.json(produtos);
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
    const result = await db.query('SELECT * FROM produto WHERE id_produto = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    const produto = result.rows[0];
    // Mapear os campos
    const produtoFormatado = {
      id: produto.id_produto,
      nome: produto.nome_produto,
      ingredientes: produto.descricao || 'Ingredientes não especificados',
      preco: produto.preco_produto,
      categoria: 'lanche'
    };
    
    res.json(produtoFormatado);
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
    
    if (!nome || !preco) {
      return res.status(400).json({ 
        message: 'Nome e preço são obrigatórios' 
      });
    }
    
    const result = await db.query(
      'INSERT INTO produto (nome_produto, descricao, preco_produto) VALUES ($1, $2, $3) RETURNING *',
      [nome, ingredientes || '', preco]
    );
    
    const novoProduto = result.rows[0];
    res.status(201).json({
      id: novoProduto.id_produto,
      nome: novoProduto.nome_produto,
      ingredientes: novoProduto.descricao,
      preco: novoProduto.preco_produto,
      categoria: categoria || 'lanche'
    });
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
    const produtoExiste = await db.query('SELECT id_produto FROM produto WHERE id_produto = $1', [id]);
    if (produtoExiste.rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    const result = await db.query(
      'UPDATE produto SET nome_produto = $1, descricao = $2, preco_produto = $3 WHERE id_produto = $4 RETURNING *',
      [nome, ingredientes || '', preco, id]
    );
    
    const produtoAtualizado = result.rows[0];
    res.json({
      id: produtoAtualizado.id_produto,
      nome: produtoAtualizado.nome_produto,
      ingredientes: produtoAtualizado.descricao,
      preco: produtoAtualizado.preco_produto,
      categoria: categoria || 'lanche'
    });
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
    
    const result = await db.query('DELETE FROM produto WHERE id_produto = $1 RETURNING *', [id]);
    
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