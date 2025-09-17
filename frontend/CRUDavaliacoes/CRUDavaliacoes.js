// Configuração da API
const API_BASE_URL = 'http://localhost:3001';

// Elementos da interface
const idProdutoInput = document.getElementById('id_produto');
const btPesquisar = document.getElementById('btPesquisar');
const infoProduto = document.getElementById('info-produto');
const listaAvaliacoes = document.getElementById('lista-avaliacoes');
const divAviso = document.getElementById('divAviso');

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    // Configura evento de enter no input
    idProdutoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            pesquisarAvaliacoes();
        }
    });
    
    // Configura evento de clique no botão
    btPesquisar.addEventListener('click', pesquisarAvaliacoes);
});

// Pesquisa avaliações por ID do produto
async function pesquisarAvaliacoes() {
    const idProduto = idProdutoInput.value.trim();
    
    if (!idProduto) {
        mostrarAviso('Digite o ID de um lanche para pesquisar', 'erro');
        idProdutoInput.focus();
        return;
    }
    
    if (isNaN(idProduto) || parseInt(idProduto) <= 0) {
        mostrarAviso('ID deve ser um número positivo', 'erro');
        idProdutoInput.focus();
        return;
    }
    
    try {
        // Mostra loading
        listaAvaliacoes.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner"></i>
                <p>Carregando avaliações...</p>
            </div>
        `;
        
        // Busca informações do produto
        const produtoResponse = await fetch(`${API_BASE_URL}/produto/${idProduto}`);
        
        if (!produtoResponse.ok) {
            throw new Error('Produto não encontrado');
        }
        
        const produto = await produtoResponse.json();
        
        // Busca avaliações do produto
        const avaliacoesResponse = await fetch(`${API_BASE_URL}/api/avaliacoes/produto/${idProduto}`);
        
        if (!avaliacoesResponse.ok) {
            throw new Error('Erro ao carregar avaliações');
        }
        
        const avaliacoes = await avaliacoesResponse.json();
        
        // Exibe informações do produto
        exibirInfoProduto(produto, avaliacoes);
        
        // Exibe avaliações
        exibirAvaliacoes(avaliacoes);
        
        mostrarAviso('');
        
    } catch (error) {
        console.error('Erro ao pesquisar avaliações:', error);
        
        if (error.message === 'Produto não encontrado') {
            mostrarAviso('Lanche não encontrado', 'erro');
            infoProduto.style.display = 'none';
            listaAvaliacoes.innerHTML = `
                <div class="sem-avaliacoes">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Nenhum lanche encontrado com o ID ${idProduto}</p>
                </div>
            `;
        } else {
            mostrarAviso('Erro ao carregar avaliações', 'erro');
            listaAvaliacoes.innerHTML = `
                <div class="sem-avaliacoes">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Erro ao carregar as avaliações</p>
                </div>
            `;
        }
    }
}

// Exibe informações do produto
function exibirInfoProduto(produto, avaliacoes) {
    // Atualiza elementos
    document.getElementById('produto-imagem').src = `../img/lanche${produto.id}.png`;
    document.getElementById('produto-nome').textContent = produto.nome;
    document.getElementById('produto-ingredientes').textContent = produto.ingredientes;
    
    // Calcula média das avaliações
    const media = calcularMediaAvaliacoes(avaliacoes);
    document.getElementById('media-nota').textContent = media.toFixed(1);
    
    // Atualiza estrelas da média
    atualizarEstrelas('estrelas-media', media);
    
    // Atualiza total de avaliações
    const total = avaliacoes.length;
    document.getElementById('total-avaliacoes').textContent = 
        `${total} avaliação${total !== 1 ? 's' : ''}`;
    
    // Mostra a seção de informações
    infoProduto.style.display = 'block';
}

// Calcula média das avaliações
function calcularMediaAvaliacoes(avaliacoes) {
    if (avaliacoes.length === 0) return 0;
    
    const soma = avaliacoes.reduce((total, avaliacao) => total + avaliacao.nota, 0);
    return soma / avaliacoes.length;
}

// Atualiza estrelas baseado na nota
function atualizarEstrelas(elementId, nota) {
    const estrelasContainer = document.getElementById(elementId);
    const estrelasCheias = Math.floor(nota);
    const temMeiaEstrela = nota % 1 >= 0.5;
    
    let html = '';
    
    // Estrelas cheias
    for (let i = 0; i < estrelasCheias; i++) {
        html += '<i class="fas fa-star"></i>';
    }
    
    // Meia estrela (se necessário)
    if (temMeiaEstrela) {
        html += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Estrelas vazias
    const estrelasVazias = 5 - estrelasCheias - (temMeiaEstrela ? 1 : 0);
    for (let i = 0; i < estrelasVazias; i++) {
        html += '<i class="far fa-star"></i>';
    }
    
    estrelasContainer.innerHTML = html;
}

// Exibe a lista de avaliações
function exibirAvaliacoes(avaliacoes) {
    if (avaliacoes.length === 0) {
        listaAvaliacoes.innerHTML = `
            <div class="sem-avaliacoes">
                <i class="fas fa-comment-slash"></i>
                <p>Este lanche ainda não possui avaliações</p>
                <p>Seja o primeiro a avaliar!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    avaliacoes.forEach(avaliacao => {
        const data = new Date(avaliacao.data_avaliacao).toLocaleDateString('pt-BR');
        
        html += `
            <div class="avaliacao-item">
                <div class="avaliacao-header">
                    <span class="avaliacao-usuario">${avaliacao.usuario_nome || 'Usuário'}</span>
                    <span class="avaliacao-data">${data}</span>
                </div>
                <div class="avaliacao-nota">
                    <span class="estrelas-avaliacao">
                        ${gerarEstrelas(avaliacao.nota)}
                    </span>
                    <span>${avaliacao.nota}/5</span>
                </div>
                <div class="avaliacao-comentario">
                    ${avaliacao.comentario || 'Sem comentário'}
                </div>
            </div>
        `;
    });
    
    listaAvaliacoes.innerHTML = html;
}

// Gera HTML das estrelas para uma avaliação
function gerarEstrelas(nota) {
    let html = '';
    const notaInteira = Math.floor(nota);
    
    // Estrelas cheias
    for (let i = 0; i < notaInteira; i++) {
        html += '<i class="fas fa-star"></i>';
    }
    
    // Estrelas vazias
    for (let i = notaInteira; i < 5; i++) {
        html += '<i class="far fa-star"></i>';
    }
    
    return html;
}

// Mostra mensagem de aviso
function mostrarAviso(mensagem, tipo = '') {
    divAviso.textContent = mensagem;
    divAviso.className = tipo ? `aviso ${tipo}` : 'aviso';
}