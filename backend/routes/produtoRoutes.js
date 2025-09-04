// ===========================================
// ROTAS - PRODUTOS (INTEGRAÇÃO COM POSTGRESQL)
// ===========================================

const express = require('express');
const multer = require('multer');
const ProdutoController = require('./controllers/produtoController');

const router = express.Router();

// Configuração do Multer para upload de imagens
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        // Aceita apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem são permitidos'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    }
});

// ========================
// ROTAS CRUD - PRODUTOS
// ========================

// GET /api/produtos - Listar todos os produtos
router.get('/', ProdutoController.listarProdutos);

// GET /api/produtos/:id - Buscar produto por ID
router.get('/:id', ProdutoController.buscarProduto);

// POST /api/produtos - Criar novo produto
router.post('/', ProdutoController.criarProduto);

// PUT /api/produtos - Atualizar produto existente
router.put('/', ProdutoController.atualizarProduto);

// DELETE /api/produtos/:id - Excluir produto
router.delete('/:id', ProdutoController.excluirProduto);

// ========================
// ROTA PARA UPLOAD DE IMAGEM
// ========================
router.post('/upload-imagem', upload.single('imagem'), ProdutoController.uploadImagem);

// Middleware de tratamento de erros do Multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB' });
        }
    }
    
    if (error.message === 'Apenas arquivos de imagem são permitidos') {
        return res.status(400).json({ error: error.message });
    }
    
    next(error);
});

module.exports = router;