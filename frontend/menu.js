// frontend/menu.js - Versão corrigida com autenticação e controle de acesso
// Estado global
let carrinho = [];
let produtos = [];
let usuarioLogado = null;

// Configuração da API
const API_BASE_URL = 'http://localhost:3001';

// Elementos da interface
const produtosContainer = document.getElementById("produtosContainer");

// Função principal de inicialização
async function inicializarPagina() {
    try {
        // Mostra estado de carregamento
        if (produtosContainer) {
            produtosContainer.innerHTML = '<div class="loading">Carregando cardápio...</div>';
        }
        
        // Verifica se usuário está logado
        await verificarUsuarioLogado();
        
        // Carrega dados
        await carregarProdutos();
        await carregarCarrinho();
        
        // Inicializa componentes da interface
        criarBotaoCarrinho();
        
    } catch (error) {
        console.error("Erro na inicialização:", error);
        mostrarErroCarregamento();
    }
}

// === FUNÇÕES DE AUTENTICAÇÃO ===

// Verifica se o usuário está logado
async function verificarUsuarioLogado() {
    try {
        // Primeiro tenta verificar no localStorage (para compatibilidade)
        const usuarioLocal = localStorage.getItem('usuario');
        if (usuarioLocal) {
            usuarioLogado = JSON.parse(usuarioLocal);
            atualizarInterfaceUsuario();
            atualizarPainelAdministrativo();
            return;
        }

        // Tenta verificar via cookie no servidor
        const response = await fetch(`${API_BASE_URL}/login/usuario`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.usuario) {
                usuarioLogado = data.usuario;
                // Sincroniza com localStorage
                localStorage.setItem('usuario', JSON.stringify(usuarioLogado));
                atualizarInterfaceUsuario();
                atualizarPainelAdministrativo();
            }
        }
    } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        // Mantém interface como deslogado em caso de erro
        usuarioLogado = null;
        atualizarInterfaceUsuario();
        atualizarPainelAdministrativo();
    }
}

// Atualiza a interface baseada no status do usuário
function atualizarInterfaceUsuario() {
    const usuarioLogadoDiv = document.getElementById('usuario-logado');
    const usuarioDeslogadoDiv = document.getElementById('usuario-deslogado');
    const nomeUsuarioSpan = document.getElementById('nome-usuario');
    const logoutBtn = document.getElementById('logout');

    if (usuarioLogado) {
        // Usuário está logado
        if (usuarioLogadoDiv) usuarioLogadoDiv.style.display = 'block';
        if (usuarioDeslogadoDiv) usuarioDeslogadoDiv.style.display = 'none';
        if (nomeUsuarioSpan) nomeUsuarioSpan.textContent = `Bem-vindo, ${usuarioLogado.nome}!`;
        
        // Configura evento de logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', realizarLogout);
        }
    } else {
        // Usuário não está logado
        if (usuarioLogadoDiv) usuarioLogadoDiv.style.display = 'none';
        if (usuarioDeslogadoDiv) usuarioDeslogadoDiv.style.display = 'block';
    }
}

// Realiza o logout
async function realizarLogout(event) {
    event.preventDefault();
    
    try {
        // Remove do localStorage
        localStorage.removeItem('usuario');
        
        // Chama endpoint de logout no servidor
        await fetch(`${API_BASE_URL}/login/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        // Atualiza estado local
        usuarioLogado = null;
        
        // Atualiza interface
        atualizarInterfaceUsuario();
        atualizarPainelAdministrativo();
        
        alert('Logout realizado com sucesso!');
        
    } catch (error) {
        console.error('Erro no logout:', error);
        // Mesmo em caso de erro, limpa o estado local
        usuarioLogado = null;
        atualizarInterfaceUsuario();
        atualizarPainelAdministrativo();
        alert('Logout realizado localmente.');
    }
}

// === FUNÇÕES DE CONTROLE DE ACESSO ===

// Função para verificar permissões do usuário
function verificarPermissoesUsuario(usuario) {
    if (!usuario || !usuario.tipo) return false;
    
    // Funcionários e gerentes têm acesso aos recursos administrativos
    return ['funcionario', 'gerente'].includes(usuario.tipo.toLowerCase());
}

// Função para verificar se é gerente
function isGerente(usuario) {
    if (!usuario) return false;
    
    // Primeiro tenta pelo tipo
    if (usuario.tipo && usuario.tipo.toLowerCase() === 'gerente') {
        return true;
    }
    
    // Depois tenta pelo cargo (se existir)
    if (usuario.cargo && usuario.cargo.toLowerCase() === 'gerente') {
        return true;
    }
    
    // Verificações alternativas
    const nome = usuario.nome || '';
    const email = usuario.email || '';
    
    return nome.toLowerCase().includes('gerente') || 
           email.toLowerCase().includes('gerente');
}

// Função para mostrar/ocultar painel administrativo
function atualizarPainelAdministrativo() {
    const adminPanel = document.getElementById('admin-panel');
    const botoesGerente = document.querySelectorAll('.gerente-only');
    
    if (usuarioLogado && verificarPermissoesUsuario(usuarioLogado)) {
        // Mostra o painel administrativo para funcionários e gerentes
        if (adminPanel) adminPanel.style.display = 'block';
        
        // Mostra ou oculta botões de gerente
        botoesGerente.forEach(botao => {
            botao.style.display = isGerente(usuarioLogado) ? 'inline-block' : 'none';
        });
    } else {
        // Oculta o painel administrativo para clientes e usuários não logados
        if (adminPanel) adminPanel.style.display = 'none';
    }
}

// === FUNÇÕES DE API ===

// Carrega produtos do servidor
async function carregarProdutos() {
    try {
        console.log('Carregando produtos de:', `${API_BASE_URL}/produto`);
        
        const response = await fetch(`${API_BASE_URL}/produto`);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        produtos = await response.json();
        console.log('Produtos carregados:', produtos);
        
        if (!Array.isArray(produtos) || produtos.length === 0) {
            throw new Error('Nenhum produto disponível');
        }
        
        exibirProdutos(produtos);
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        throw error;
    }
}

// Carrega o carrinho do servidor
async function carregarCarrinho() {
    try {
        console.log('Carregando carrinho de:', `${API_BASE_URL}/carrinho`);
        
        const response = await fetch(`${API_BASE_URL}/carrinho`);
        
        if (!response.ok) {
            console.warn('Carrinho não encontrado, inicializando vazio');
            carrinho = [];
            return;
        }
        
        const carrinhoData = await response.json();
        
        if (!Array.isArray(carrinhoData)) {
            carrinho = [];
        } else {
            carrinho = carrinhoData;
        }
        
        console.log('Carrinho carregado:', carrinho);
        atualizarContadores();
        
    } catch (error) {
        console.error("Erro ao carregar carrinho:", error);
        carrinho = [];
    }
}

// === FUNÇÕES DE INTERFACE ===

// Exibe produtos na tela
function exibirProdutos(produtosLista) {
  if (!produtosContainer) {
    console.error('Container de produtos não encontrado');
    return;
  }
  
  produtosContainer.innerHTML = "";
  
  produtosLista.forEach(produto => {
    const itemCarrinho = carrinho.find(item => item.produtoId == produto.id);
    const quantidade = itemCarrinho ? itemCarrinho.quantidade : 0;
    
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = produto.id;

    // Caminho da imagem
    const imagemSrc = `img/lanche${produto.id}.png`;
    
    // CONVERTE preco para número (correção)
    const preco = parseFloat(produto.preco);
    
    card.innerHTML = `
      <img src="${imagemSrc}" alt="${produto.nome}" onerror="this.src='img/placeholder.png'">
      <div class="card-info">
        <h3>${produto.nome}</h3>
        <p>${produto.ingredientes}</p>
        <div class="quantidade">
          <button class="btn-menos" onclick="alterarQuantidade(${produto.id}, -1)">-</button>
          <span class="contador" id="qtd-${produto.id}">${quantidade}</span>
          <button class="btn-mais" onclick="alterarQuantidade(${produto.id}, 1)">+</button>
        </div>
      </div>
      <div class="card-preco">R$ ${preco.toFixed(2)}</div>
    `;

    produtosContainer.appendChild(card);
  });
}

// Altera quantidade de um item no carrinho
async function alterarQuantidade(produtoId, alteracao) {
    try {
        // Calcula nova quantidade
        const itemIndex = carrinho.findIndex(item => item.produtoId == produtoId);
        let novaQuantidade = (itemIndex >= 0 ? carrinho[itemIndex].quantidade : 0) + alteracao;
        novaQuantidade = Math.max(0, novaQuantidade);
        
        console.log(`Alterando quantidade do produto ${produtoId} para ${novaQuantidade}`);
        
        // Atualiza localmente primeiro para responsividade
        if (itemIndex >= 0) {
            if (novaQuantidade > 0) {
                carrinho[itemIndex].quantidade = novaQuantidade;
            } else {
                carrinho.splice(itemIndex, 1);
            }
        } else if (novaQuantidade > 0) {
            carrinho.push({ produtoId: parseInt(produtoId), quantidade: novaQuantidade });
        }
        
        // Atualiza UI imediatamente
        const contadorElement = document.getElementById(`qtd-${produtoId}`);
        if (contadorElement) {
            contadorElement.textContent = novaQuantidade;
        }
        atualizarContadorCarrinho();
        
        // Envia para o servidor
        const response = await fetch(`${API_BASE_URL}/carrinho`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                produtoId: parseInt(produtoId), 
                quantidade: novaQuantidade 
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erro do servidor: ${response.status}`);
        }
        
        const resultado = await response.json();
        console.log('Carrinho atualizado no servidor:', resultado);
        
    } catch (error) {
        console.error("Erro ao atualizar carrinho:", error);
        alert("Erro ao atualizar carrinho. Recarregando página...");
        location.reload();
    }
}

// Atualiza todos os contadores na tela
function atualizarContadores() {
    carrinho.forEach(item => {
        const elemento = document.getElementById(`qtd-${item.produtoId}`);
        if (elemento) {
            elemento.textContent = item.quantidade;
        }
    });
    atualizarContadorCarrinho();
}

// Atualiza o ícone do carrinho
function atualizarContadorCarrinho() {
    const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
    const contador = document.getElementById('carrinho-contador');
    if (contador) {
        contador.textContent = totalItens;
    }
}

// Cria o botão do carrinho
function criarBotaoCarrinho() {
    const btnCarrinho = document.getElementById('btn-carrinho');
    if (btnCarrinho) {
        const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
        btnCarrinho.innerHTML = `
            <span id="carrinho-contador">${totalItens}</span>
            <i class="fas fa-shopping-cart"></i>
        `;
    }
}

// === FUNÇÕES DE ERRO ===

// Mostra erro de carregamento
function mostrarErroCarregamento() {
    if (produtosContainer) {
        produtosContainer.innerHTML = `
            <div class="error">
                <p>⚠ Falha ao carregar o cardápio</p>
                <p>Verifique se o servidor está rodando na porta 3001</p>
                <button onclick="inicializarPagina()" style="margin-top: 10px; padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 Tentar novamente
                </button>
            </div>
        `;
    }
}

// === FUNÇÕES UTILITÁRIAS ===

// Limpa o carrinho
async function limparCarrinho() {
    try {
        const response = await fetch(`${API_BASE_URL}/carrinho`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            carrinho = [];
            atualizarContadores();
            console.log('Carrinho limpo com sucesso');
        }
    } catch (error) {
        console.error('Erro ao limpar carrinho:', error);
    }
}

// Verifica se o servidor está funcionando
async function verificarServidor() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const resultado = await response.json();
        console.log('Status do servidor:', resultado);
        return response.ok;
    } catch (error) {
        console.error('Servidor não está respondendo:', error);
        return false;
    }
}

// === INICIALIZAÇÃO ===

// Inicializa a página quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, inicializando página...');
    
    // Verifica se o servidor está funcionando
    const servidorOk = await verificarServidor();
    if (!servidorOk) {
        console.error('Servidor não está respondendo');
        mostrarErroCarregamento();
        return;
    }
    
    // Inicializa a página
    await inicializarPagina();
});

// Adiciona função global para debug
window.debugMenu = {
    carrinho: () => console.log('Carrinho atual:', carrinho),
    produtos: () => console.log('Produtos carregados:', produtos),
    usuario: () => console.log('Usuário logado:', usuarioLogado),
    recarregar: () => location.reload(),
    limparCarrinho: limparCarrinho,
    logout: realizarLogout
};
// Função de debug detalhada - adicione ao menu.js
async function debugDetalhado() {
    try {
        console.log('=== DEBUG DETALHADO ===');
        
        // Verifica o localStorage
        const usuarioLocal = localStorage.getItem('usuario');
        console.log('LocalStorage:', usuarioLocal ? JSON.parse(usuarioLocal) : 'Nenhum usuário no localStorage');
        
        // Verifica a API
        const response = await fetch(`${API_BASE_URL}/login/usuario`, {
            credentials: 'include'
        });
        
        console.log('Status da API:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Resposta completa da API:', data);
            
            if (data.success && data.usuario) {
                console.log('Dados do usuário:', data.usuario);
                console.log('Tipo:', data.usuario.tipo);
                console.log('Todos os campos:', Object.keys(data.usuario));
                
                // Verifica se há campo cargo
                if (data.usuario.cargo) {
                    console.log('Cargo:', data.usuario.cargo);
                }
            }
        }
        
        console.log('=== FIM DEBUG ===');
    } catch (error) {
        console.error('Erro no debug:', error);
    }
}

// Chame esta função após o login
// debugDetalhado();