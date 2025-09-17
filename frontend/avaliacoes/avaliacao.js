// Variáveis globais
let produtoSelecionado = null;
let notaSelecionada = 0;
let usuarioLogado = null;

// Inicialização da página
document.addEventListener('DOMContentLoaded', async function() {
    await inicializarPagina();
    inicializarEventos();
});

// Inicializa a página
async function inicializarPagina() {
    try {
        // Verifica se usuário está logado
        const usuarioEstaLogado = await verificarUsuarioLogado();
        
        if (!usuarioEstaLogado) {
            mostrarMensagemErro('Você precisa estar logado para acessar as avaliações');
            // Não redireciona automaticamente, deixa o usuário ver a mensagem
            return;
        }
        
        // Carrega produtos consumidos pelo usuário
        await carregarProdutosConsumidos();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        mostrarMensagemErro('Erro ao carregar página');
    }
}

// Verifica se o usuário está logado - CORRIGIDA
async function verificarUsuarioLogado() {
    try {
        // Primeiro tenta verificar no localStorage
        const usuarioLocal = localStorage.getItem('usuario');
        if (usuarioLocal) {
            usuarioLogado = JSON.parse(usuarioLocal);
            return true;
        }

        // Tenta verificar via cookie no servidor
        const response = await fetch('http://localhost:3001/login/usuario', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.usuario) {
                usuarioLogado = data.usuario;
                // Sincroniza com localStorage
                localStorage.setItem('usuario', JSON.stringify(usuarioLogado));
                return true;
            }
        }
        
        // Se não estiver logado, mostra mensagem mas não redireciona
        console.log('Usuário não está logado');
        return false;
        
    } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        return false;
    }
}

// Carrega produtos consumidos pelo usuário
async function carregarProdutosConsumidos() {
    try {
        if (!usuarioLogado || !usuarioLogado.id) {
            mostrarMensagemErro('Usuário não identificado');
            return;
        }

        const response = await fetch(`http://localhost:3001/api/avaliacoes/produtos-consumidos/${usuarioLogado.id}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            // Se der erro 401 (não autorizado), o usuário não está logado
            if (response.status === 401) {
                usuarioLogado = null;
                localStorage.removeItem('usuario');
                mostrarMensagemErro('Sessão expirada. Faça login novamente.');
                return;
            }
            throw new Error('Erro ao carregar produtos');
        }
        
        const produtos = await response.json();
        exibirProdutosConsumidos(produtos);
        
    } catch (error) {
        console.error('Erro ao carregar produtos consumidos:', error);
        mostrarMensagemErro('Erro ao carregar produtos consumidos');
    }
}

// Exibe produtos consumidos na lista
function exibirProdutosConsumidos(produtos) {
    const listaContainer = document.querySelector('.lista-produtos');
    
    if (!produtos || produtos.length === 0) {
        listaContainer.innerHTML = `
            <div class="aviso">
                <p>Você ainda não consumiu nenhum produto ou já avaliou todos.</p>
                <p>Faça um pedido primeiro para poder avaliar!</p>
            </div>
        `;
        return;
    }
    
    listaContainer.innerHTML = '';
    
    produtos.forEach(produto => {
        const item = document.createElement('div');
        item.className = 'produto-item';
        item.dataset.id = produto.id;
        
        item.innerHTML = `
            <img src="../${produto.imagem}" alt="${produto.nome}" onerror="this.src='../img/placeholder.png'">
            <div class="produto-info">
                <strong>${produto.nome}</strong>
                <small>${produto.ingredientes}</small>
                <span class="preco">R$ ${parseFloat(produto.preco).toFixed(2)}</span>
            </div>
        `;
        
        listaContainer.appendChild(item);
    });
}

// Configura os eventos da página
function inicializarEventos() {
    // Eventos para os itens de produto
    document.querySelector('.lista-produtos').addEventListener('click', (e) => {
        const item = e.target.closest('.produto-item');
        if (item) {
            selecionarProduto(item);
        }
    });
    
    // Eventos para as estrelas de avaliação
    const estrelas = document.querySelectorAll('.estrelas-avaliacao i');
    estrelas.forEach(estrela => {
        estrela.addEventListener('click', () => selecionarNota(estrela));
        estrela.addEventListener('mouseover', () => previewNota(estrela));
    });
    
    // Evento para quando o mouse sai das estrelas
    document.querySelector('.estrelas-avaliacao').addEventListener('mouseleave', resetarPreviewNota);
    
    // Eventos para os botões
    document.getElementById('btEnviar').addEventListener('click', enviarAvaliacao);
    document.getElementById('btCancelar').addEventListener('click', cancelarAvaliacao);
    
    // Evento para validar campos enquanto digita
    document.getElementById('comentario').addEventListener('input', verificarCamposPreenchidos);
    
    // Adiciona botão de login se não estiver logado
    if (!usuarioLogado) {
        adicionarBotaoLogin();
    }
}

// Adiciona botão de login se usuário não estiver logado
function adicionarBotaoLogin() {
    const avaliacaoForm = document.querySelector('.avaliacao-form');
    const loginButton = document.createElement('a');
    loginButton.href = '../login/login.html';
    loginButton.className = 'btn medieval-btn';
    loginButton.style.marginTop = '20px';
    loginButton.textContent = 'Fazer Login';
    loginButton.onclick = (e) => {
        e.preventDefault();
        window.location.href = '../login/login.html';
    };
    
    avaliacaoForm.appendChild(loginButton);
}

// Seleciona um produto para avaliação
function selecionarProduto(item) {
    // Remove seleção anterior
    document.querySelectorAll('.produto-item').forEach(prod => {
        prod.classList.remove('selecionado');
    });
    
    // Adiciona seleção ao item clicado
    item.classList.add('selecionado');
    
    // Obtém informações do produto
    const id = item.getAttribute('data-id');
    const nome = item.querySelector('strong').textContent;
    const ingredientes = item.querySelector('small').textContent;
    const imagemSrc = item.querySelector('img').src;
    
    // Atualiza produto selecionado
    produtoSelecionado = { id, nome, ingredientes, imagemSrc };
    
    // Mostra informações do produto selecionado
    const infoSelecionado = document.getElementById('selecionado-info');
    document.getElementById('selecionado-imagem').src = imagemSrc;
    document.getElementById('selecionado-nome').textContent = nome;
    document.getElementById('selecionado-ingredientes').textContent = ingredientes;
    infoSelecionado.style.display = 'flex';
    
    // Habilita campos de avaliação
    document.getElementById('comentario').removeAttribute('readonly');
    document.querySelectorAll('.estrelas-avaliacao i').forEach(estrela => {
        estrela.style.cursor = 'pointer';
    });
    
    // Reseta avaliação anterior
    resetarAvaliacao();
}

// Seleciona uma nota pelas estrelas
function selecionarNota(estrela) {
    const nota = parseInt(estrela.getAttribute('data-nota'));
    notaSelecionada = nota;
    
    // Atualiza visualização das estrelas
    const estrelas = document.querySelectorAll('.estrelas-avaliacao i');
    estrelas.forEach((e, index) => {
        if (index < nota) {
            e.classList.add('ativa');
        } else {
            e.classList.remove('ativa');
        }
    });
    
    // Atualiza texto da nota
    const textosNota = [
        "Péssimo",
        "Ruim",
        "Regular",
        "Bom",
        "Excelente"
    ];
    document.getElementById('texto-nota').textContent = textosNota[nota - 1] || "Selecione uma nota";
    
    // Habilita botão de enviar se tudo estiver preenchido
    verificarCamposPreenchidos();
}

// Preview da nota ao passar o mouse
function previewNota(estrela) {
    const nota = parseInt(estrela.getAttribute('data-nota'));
    const estrelas = document.querySelectorAll('.estrelas-avaliacao i');
    
    estrelas.forEach((e, index) => {
        if (index < nota) {
            e.style.color = '#ffc107';
        } else {
            e.style.color = '#ccc';
        }
    });
}

// Reseta o preview da nota quando o mouse sai
function resetarPreviewNota() {
    const estrelas = document.querySelectorAll('.estrelas-avaliacao i');
    
    estrelas.forEach((e, index) => {
        if (index < notaSelecionada) {
            e.style.color = '#ffc107';
        } else {
            e.style.color = '#ccc';
        }
    });
}

// Verifica se todos os campos estão preenchidos para habilitar o envio
function verificarCamposPreenchidos() {
    const comentario = document.getElementById('comentario').value.trim();
    const btEnviar = document.getElementById('btEnviar');
    
    btEnviar.disabled = !(produtoSelecionado && notaSelecionada > 0 && comentario.length > 0);
}

// Reseta a avaliação
function resetarAvaliacao() {
    notaSelecionada = 0;
    document.getElementById('comentario').value = '';
    
    const estrelas = document.querySelectorAll('.estrelas-avaliacao i');
    estrelas.forEach(e => {
        e.classList.remove('ativa');
        e.style.color = '#ccc';
    });
    
    document.getElementById('texto-nota').textContent = "Selecione uma nota";
    document.getElementById('btEnviar').disabled = true;
}

// Envia a avaliação para o servidor
async function enviarAvaliacao() {
    try {
        const comentario = document.getElementById('comentario').value.trim();
        
        const dadosAvaliacao = {
            produtoId: parseInt(produtoSelecionado.id),
            usuarioId: usuarioLogado.id,
            nota: notaSelecionada,
            comentario: comentario
        };
        
        const response = await fetch('http://localhost:3001/api/avaliacoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(dadosAvaliacao)
        });
        
        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.error || 'Erro ao enviar avaliação');
        }
        
        const resultado = await response.json();
        
        // Mostra mensagem de sucesso
        const divAviso = document.getElementById('divAviso');
        divAviso.innerHTML = `
            <strong>Avaliação enviada com sucesso!</strong><br>
            Obrigado por avaliar o "${produtoSelecionado.nome}".
        `;
        divAviso.style.borderLeftColor = '#2e7d32';
        
        // Remove o produto avaliado da lista
        const itemAvaliado = document.querySelector(`.produto-item[data-id="${produtoSelecionado.id}"]`);
        if (itemAvaliado) {
            itemAvaliado.remove();
        }
        
        // Limpa o formulário após envio
        setTimeout(() => {
            cancelarAvaliacao();
            
            // Verifica se ainda há produtos para avaliar
            const itensRestantes = document.querySelectorAll('.produto-item');
            if (itensRestantes.length === 0) {
                exibirProdutosConsumidos([]);
            }
        }, 3000);
        
    } catch (error) {
        console.error('Erro ao enviar avaliação:', error);
        mostrarMensagemErro(error.message);
    }
}

// Cancela a avaliação atual
function cancelarAvaliacao() {
    // Remove seleção do produto
    document.querySelectorAll('.produto-item').forEach(prod => {
        prod.classList.remove('selecionado');
    });
    
    // Oculta informações do produto selecionado
    document.getElementById('selecionado-info').style.display = 'none';
    produtoSelecionado = null;
    
    // Desabilita campos de avaliação
    document.getElementById('comentario').setAttribute('readonly', 'true');
    document.querySelectorAll('.estrelas-avaliacao i').forEach(estrela => {
        estrela.style.cursor = 'default';
    });
    
    // Reseta avaliação
    resetarAvaliacao();
    
    // Limpa avisos
    document.getElementById('divAviso').innerHTML = '';
}

// Mostra mensagem de erro
function mostrarMensagemErro(mensagem) {
    const divAviso = document.getElementById('divAviso');
    divAviso.innerHTML = `
        <strong>Erro:</strong> ${mensagem}
    `;
    divAviso.style.borderLeftColor = '#8b0000';
}

// Função para redirecionar para login apenas quando explicitamente necessário
function redirecionarParaLogin() {
    localStorage.removeItem('usuario');
    window.location.href = '../login/login.html';
}