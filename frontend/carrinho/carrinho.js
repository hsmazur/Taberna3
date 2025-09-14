// frontend/carrinho.js - Versão corrigida
// Configurações
const API_URL = 'http://localhost:3001';
const TAXA_ENTREGA = 5.00;

// Estado do carrinho
let carrinhoItens = [];
let produtosDisponiveis = [];

// Elementos da interface
let listaCarrinho, totalCarrinho, opcoesEntrega, formularioEntrega, btnConfirmar;

/**
 * Inicializa a página do carrinho
 */
async function inicializarCarrinho() {
  // Obtém referências dos elementos
  listaCarrinho = document.getElementById('lista-carrinho');
  totalCarrinho = document.getElementById('total-carrinho');
  opcoesEntrega = document.querySelectorAll('input[name="tipo-entrega"]');
  formularioEntrega = document.getElementById('formulario-entrega');
  btnConfirmar = document.getElementById('btn-confirmar');

  // Verifica se os elementos essenciais existem
  if (!listaCarrinho || !totalCarrinho) {
    mostrarErroCritico();
    return;
  }

  // Configura eventos
  opcoesEntrega.forEach(opcao => {
    opcao.addEventListener('change', atualizarTipoEntrega);
  });

  btnConfirmar.addEventListener('click', confirmarPedido);

  // Configura validação do telefone
  const telefoneInput = document.getElementById('telefone');
  if (telefoneInput) {
    telefoneInput.addEventListener('input', formatarTelefone);
    telefoneInput.addEventListener('blur', validarTelefone);
  }

  // Carrega os dados
  await carregarDados();
}

/**
 * Carrega produtos e carrinho do servidor
 */
async function carregarDados() {
  try {
    mostrarCarregando();
    
    // Carrega em paralelo para melhor performance
    const [produtosResponse, carrinhoResponse] = await Promise.all([
      fetch(`${API_URL}/produto`),
      fetch(`${API_URL}/carrinho`)
    ]);
    
    // Verifica se as respostas são válidas
    if (!produtosResponse.ok) {
      throw new Error('Erro ao carregar produtos');
    }
    
    if (!carrinhoResponse.ok) {
      console.warn('Carrinho vazio ou não encontrado');
      carrinhoItens = [];
    } else {
      carrinhoItens = await carrinhoResponse.json();
    }
    
    produtosDisponiveis = await produtosResponse.json();
    
    // Filtra itens com quantidade > 0
    carrinhoItens = carrinhoItens.filter(item => item.quantidade > 0);
    
    if (carrinhoItens.length === 0) {
      mostrarCarrinhoVazio();
    } else {
      renderizarCarrinho();
    }
    
  } catch (error) {
    console.error('Erro ao carregar carrinho:', error);
    mostrarErro(error);
  }
}

/**
 * Renderiza os itens do carrinho na tela
 */
function renderizarCarrinho() {
  let html = '';
  let total = 0;

  // Para cada item no carrinho
  carrinhoItens.forEach(item => {
    const produto = produtosDisponiveis.find(p => p.id == item.produtoId);
    if (!produto) return;

    // CONVERTE preco para número (correção do erro)
    const preco = parseFloat(produto.preco);
    const subtotal = preco * item.quantidade;
    total += subtotal;

    html += `
      <div class="item-carrinho" data-id="${produto.id}">
        <img src="../img/lanche${produto.id}.png" alt="${produto.nome}" onerror="this.src='img/sem-imagem.png'">
        <div class="item-info">
          <h3>${produto.nome}</h3>
          <p class="ingredientes">${produto.ingredientes}</p>
          <div class="item-controls">
            <div class="quantidade-controls">
              <button class="btn-diminuir" data-id="${produto.id}">−</button>
              <span class="quantidade">${item.quantidade}</span>
              <button class="btn-aumentar" data-id="${produto.id}">+</button>
            </div>
            <button class="btn-remover" data-id="${produto.id}">X</button>
          </div>
          <p class="preco">Preço unitário: R$ ${preco.toFixed(2)}</p>
          <p class="subtotal">Subtotal: R$ ${subtotal.toFixed(2)}</p>
        </div>
      </div>
    `;
  });

  // Verifica se é entrega para adicionar taxa
  const isEntrega = document.querySelector('input[name="tipo-entrega"]:checked')?.value === 'entrega';
  if (isEntrega) total += TAXA_ENTREGA;

  // Atualiza a interface
  listaCarrinho.innerHTML = html;
  totalCarrinho.innerHTML = `
    <div class="resumo-total">
      ${isEntrega ? `<p>Taxa de entrega: <strong>R$ ${TAXA_ENTREGA.toFixed(2)}</strong></p>` : ''}
      <p>Total: <strong>R$ ${total.toFixed(2)}</strong></p>
    </div>
  `;

  // Adiciona os eventos aos botões
  adicionarEventosItens();
}

/**
 * Adiciona eventos aos botões dos itens
 */
function adicionarEventosItens() {
  // Botão de aumentar quantidade
  document.querySelectorAll('.btn-aumentar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      alterarQuantidadeItem(id, 1);
    });
  });

  // Botão de diminuir quantidade
  document.querySelectorAll('.btn-diminuir').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      alterarQuantidadeItem(id, -1);
    });
  });

  // Botão de remover item
  document.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      removerItem(id);
    });
  });
}

/**
 * Altera a quantidade de um item
 */
async function alterarQuantidadeItem(id, alteracao) {
  try {
    const item = carrinhoItens.find(item => item.produtoId == id);
    if (!item) return;

    const novaQuantidade = item.quantidade + alteracao;
    
    if (novaQuantidade <= 0) {
      await removerItem(id);
      return;
    }

    const response = await fetch(`${API_URL}/carrinho`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtoId: id, quantidade: novaQuantidade })
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar carrinho');
    }

    await carregarDados();
    
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    alert('Erro ao atualizar quantidade');
  }
}

/**
 * Remove completamente um item do carrinho
 */
async function removerItem(id) {
  if (confirm('Remover este item do carrinho?')) {
    try {
      const response = await fetch(`${API_URL}/carrinho`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtoId: id, quantidade: 0 })
      });

      if (!response.ok) {
        throw new Error('Erro ao remover item');
      }
      
      await carregarDados();
      
    } catch (error) {
      console.error('Erro ao remover item:', error);
      alert('Erro ao remover item');
    }
  }
}

/**
 * Atualiza a interface quando muda o tipo de entrega
 */
function atualizarTipoEntrega() {
  const isEntrega = document.querySelector('input[name="tipo-entrega"]:checked')?.value === 'entrega';
  if (formularioEntrega) {
    formularioEntrega.classList.toggle('hidden', !isEntrega);
  }
  renderizarCarrinho();
}

// Função para formatar o número de telefone
function formatarTelefone(e) {
  let value = e.target.value.replace(/\D/g, '');
  
  if (value.length > 2) {
    value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
  }
  if (value.length > 10) {
    value = `${value.substring(0, 10)}-${value.substring(10, 14)}`;
  }
  
  e.target.value = value;
}

// Função para validar o número de telefone
function validarTelefone(e) {
  const telefone = e.target.value.replace(/\D/g, '');
  const erroTelefone = document.getElementById('erro-telefone');
  
  if (telefone.length < 10 || telefone.length > 11) {
    if (erroTelefone) {
      erroTelefone.textContent = 'Telefone inválido (DDD + número)';
      erroTelefone.style.display = 'block';
    }
    return false;
  }
  
  if (erroTelefone) {
    erroTelefone.style.display = 'none';
  }
  return true;
}

/**
 * Confirma o pedido e redireciona para pagamento
 */
// frontend/carrinho.js - CORREÇÃO na função confirmarPedido()
async function confirmarPedido() {
  const isEntrega = document.querySelector('input[name="tipo-entrega"]:checked')?.value === 'entrega';
  
  if (isEntrega) {
    // Valida os campos de entrega
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value;
    const bairro = document.getElementById('bairro').value;

    if (!nome || !telefone || !endereco || !bairro) {
      alert('Preencha todos os campos para entrega!');
      return;
    }

    // Valida especificamente o telefone
    if (!validarTelefone({ target: document.getElementById('telefone') })) {
      alert('Por favor, insira um número de telefone válido com DDD');
      return;
    }

    // Armazena os dados de entrega no localStorage
    localStorage.setItem('dadosEntrega', JSON.stringify({
      nome,
      telefone: telefone.replace(/\D/g, ''),
      endereco,
      bairro,
      taxaEntrega: TAXA_ENTREGA
    }));
  } else {
    localStorage.setItem('dadosEntrega', JSON.stringify({
      taxaEntrega: 0
    }));
  }

  // Calcula o total com taxa (CORRIGIDO - converter preço para número)
  let total = carrinhoItens.reduce((total, item) => {
    const produto = produtosDisponiveis.find(p => p.id == item.produtoId);
    return total + (produto ? parseFloat(produto.preco) * item.quantidade : 0);
  }, 0);
  
  if (isEntrega) total += TAXA_ENTREGA;

  // Armazena o total no localStorage
  localStorage.setItem('totalPedido', total.toFixed(2));

  // Redireciona para a página de pagamento
  window.location.href = 'pagamento.html';
}

// Funções auxiliares de UI
function mostrarCarregando() {
  listaCarrinho.innerHTML = '<div class="loading"><p>Carregando seu carrinho...</p></div>';
  totalCarrinho.innerHTML = '';
}

function mostrarCarrinhoVazio() {
  listaCarrinho.innerHTML = `
    <div class="empty-cart">
      <img src="https://cdn-icons-png.flaticon.com/128/1288/1288704.png" alt="Carrinho vazio">
      <p>Seu carrinho está vazio</p>
      <a href="index.html" class="btn">Voltar ao cardápio</a>
    </div>
  `;
  totalCarrinho.innerHTML = '';
}

function mostrarErro(error) {
  listaCarrinho.innerHTML = `
    <div class="error">
      <p>😕 Não foi possível carregar seu carrinho</p>
      <p class="error-detail">${error.message}</p>
      <button onclick="carregarDados()">Tentar novamente</button>
    </div>
  `;
  totalCarrinho.innerHTML = '';
}

function mostrarErroCritico() {
  document.body.innerHTML = `
    <div class="critical-error">
      <h2>ERRO CRÍTICO</h2>
      <p>A página não carregou corretamente</p>
      <button onclick="location.reload()">Recarregar</button>
      <a href="index.html">Voltar à página inicial</a>
    </div>
  `;
}

// Inicializa o carrinho quando a página carrega
document.addEventListener('DOMContentLoaded', inicializarCarrinho);