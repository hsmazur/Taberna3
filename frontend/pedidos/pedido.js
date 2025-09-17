// pedido.js
let listaPedido = [];
let oQueEstaFazendo = '';
let pedido = null;

// URL base da API
const API_BASE_URL = 'http://localhost:3001/api/pedidos';

// ========================
// INICIALIZAÇÃO
// ========================
document.addEventListener('DOMContentLoaded', async () => {
    await carregarPedidosDoBanco();
    bloquearAtributos(true);
    mostrarAviso('Sistema carregado. Digite um ID e clique em "Procurar"');
});

// ========================
// COMUNICAÇÃO COM O BANCO VIA API
// ========================

/**
 * Carrega todos os pedidos do banco de dados
 */
async function carregarPedidosDoBanco() {
    try {
        mostrarAviso('Carregando pedidos...');
        
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        listaPedido = await response.json();
        listar();
        mostrarAviso(`${listaPedido.length} pedidos carregados do banco`);
        
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        mostrarAviso(`Erro ao carregar pedidos: ${error.message}`);
        listaPedido = [];
    }
}

/**
 * Atualiza pedido no banco de dados
 */
async function atualizarPedidoNoBanco(id, dados) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        throw error;
    }
}

/**
 * Exclui pedido do banco de dados
 */
async function excluirPedidoDoBanco(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        throw error;
    }
}

// ========================
// FUNÇÕES PRINCIPAIS DO CRUD
// ========================

/**
 * Procura pedido por ID
 */
function procurePorChavePrimaria(chave) {
    for (let i = 0; i < listaPedido.length; i++) {
        const pedido = listaPedido[i];
        if (pedido.id == chave) {
            pedido.posicaoNaLista = i;
            return pedido;
        }
    }
    return null;
}

/**
 * Função de procurar
 */
function procure() {
    const id = document.getElementById("id").value;
    
    // Validação do ID
    if (!id || isNaN(id) || !Number.isInteger(Number(id))) {
        mostrarAviso("Precisa ser um número inteiro");
        document.getElementById("id").focus();
        return;
    }

    // Busca na lista carregada
    pedido = procurePorChavePrimaria(id);
    
    if (pedido) {
        // Pedido encontrado
        mostrarDadosPedido(pedido);
        visibilidadeDosBotoes('inline', 'inline', 'inline', 'none');
        mostrarAviso("Pedido encontrado no banco! Pode alterar ou excluir.");
    } else {
        // Pedido não encontrado
        limparAtributos();
        visibilidadeDosBotoes('inline', 'none', 'none', 'none');
        mostrarAviso("Pedido não encontrado.");
    }
}

/**
 * Inicia alteração
 */
function alterar() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';
    mostrarAviso("ALTERANDO - Modifique o status e clique em 'Salvar'");
    document.getElementById("pagamento").focus();
}

/**
 * Inicia exclusão
 */
function excluir() {
    bloquearAtributos(true);
    visibilidadeDosBotoes('none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'excluindo';
    mostrarAviso("EXCLUINDO - Clique em 'Salvar' para confirmar a exclusão");
}

/**
 * Salva as alterações no banco
 */
async function salvar() {
    try {
        const id = pedido.id;
        
        mostrarAviso("Salvando no banco de dados...");

        // Executa operação conforme o que está fazendo
        switch (oQueEstaFazendo) {
            case 'alterando':
                const pagamento = document.getElementById("pagamento").value;
                await atualizarPedidoNoBanco(id, { pagamento });
                mostrarAviso("✅ Status do pedido atualizado com sucesso!");
                break;
                
            case 'excluindo':
                await excluirPedidoDoBanco(id);
                mostrarAviso("✅ Pedido excluído com sucesso!");
                break;
                
            default:
                mostrarAviso("⚠️ Operação inválida");
                return;
        }

        // Recarrega lista e reseta interface
        await carregarPedidosDoBanco();
        resetarInterface();
        
    } catch (error) {
        mostrarAviso(`❌ Erro: ${error.message}`);
    }
}

/**
 * Reseta a interface após salvar
 */
function resetarInterface() {
    visibilidadeDosBotoes('inline', 'none', 'none', 'none');
    limparAtributos();
    pedido = null;
    oQueEstaFazendo = '';
    document.getElementById("id").focus();
}

// ========================
// FUNÇÕES DE INTERFACE
// ========================

/**
 * Cancela operação em andamento
 */
function cancelarOperacao() {
    if (pedido) {
        mostrarDadosPedido(pedido);
        visibilidadeDosBotoes('inline', 'inline', 'inline', 'none');
    } else {
        limparAtributos();
        visibilidadeDosBotoes('inline', 'none', 'none', 'none');
    }
    
    bloquearAtributos(true);
    oQueEstaFazendo = '';
    mostrarAviso("Operação cancelada");
}

/**
 * Mostra dados do pedido nos campos
 */
function mostrarDadosPedido(pedido) {
    document.getElementById("id").value = pedido.id;
    document.getElementById("id_usuario").value = pedido.id_usuario;
    document.getElementById("nome_usuario").value = pedido.nome_usuario;
    document.getElementById("data_pedido").value = new Date(pedido.data_pedido).toLocaleString('pt-BR');
    document.getElementById("pagamento").value = pedido.pagamento;
    document.getElementById("valor_total").value = pedido.valor_total;
    
    // Mostra produtos do pedido
    mostrarProdutosPedido(pedido.produtos);
    
    bloquearAtributos(true);
}

/**
 * Mostra lista de produtos do pedido
 */
function mostrarProdutosPedido(produtos) {
    const listaProdutos = document.getElementById("lista-produtos");
    
    if (!produtos || produtos.length === 0) {
        listaProdutos.innerHTML = '<p>Nenhum produto neste pedido</p>';
        return;
    }
    
    let html = '';
    produtos.forEach(produto => {
        html += `
            <div class="produto-item-pedido">
                <span>${produto.nome_produto || 'Produto não encontrado'}</span>
                <span>${produto.quantidade}x R$ ${parseFloat(produto.preco_unitario || 0).toFixed(2)}</span>
            </div>
        `;
    });
    
    listaProdutos.innerHTML = html;
}

/**
 * Limpa todos os campos
 */
function limparAtributos() {
    document.getElementById("id_usuario").value = "";
    document.getElementById("nome_usuario").value = "";
    document.getElementById("data_pedido").value = "";
    document.getElementById("pagamento").value = "Pendente";
    document.getElementById("valor_total").value = "";
    document.getElementById("lista-produtos").innerHTML = "";
    
    bloquearAtributos(true);
}

/**
 * Controla se os campos estão bloqueados
 */
function bloquearAtributos(soLeitura) {
    document.getElementById("id_usuario").readOnly = soLeitura;
    document.getElementById("nome_usuario").readOnly = soLeitura;
    document.getElementById("data_pedido").readOnly = soLeitura;
    document.getElementById("pagamento").disabled = soLeitura;
    document.getElementById("valor_total").readOnly = soLeitura;
}

/**
 * Controla visibilidade dos botões
 */
function visibilidadeDosBotoes(btProcure, btAlterar, btExcluir, btSalvar) {
    document.getElementById("btProcure").style.display = btProcure;
    document.getElementById("btAlterar").style.display = btAlterar;
    document.getElementById("btExcluir").style.display = btExcluir;
    document.getElementById("btSalvar").style.display = btSalvar;
    document.getElementById("btCancelar").style.display = btSalvar;
}

/**
 * Mostra mensagem de aviso
 */
function mostrarAviso(mensagem) {
    const divAviso = document.getElementById("divAviso");
    divAviso.innerHTML = mensagem;
    
    // Remove classes anteriores e adiciona cor baseada no conteúdo
    divAviso.className = "aviso";
    if (mensagem.includes("✅")) {
        divAviso.style.color = "#28a745";
    } else if (mensagem.includes("❌")) {
        divAviso.style.color = "#dc3545";
    } else if (mensagem.includes("⚠️")) {
        divAviso.style.color = "#ffc107";
    } else {
        divAviso.style.color = "#6c757d";
    }
}

/**
 * Monta HTML da lista de pedidos
 */
function preparaListagem(vetor) {
    if (vetor.length === 0) {
        return "<p>Nenhum pedido encontrado.</p>";
    }
    
    let html = "";
    for (let i = 0; i < vetor.length; i++) {
        const pedido = vetor[i];
        const dataFormatada = new Date(pedido.data_pedido).toLocaleString('pt-BR');
        
        html += `
            <div class="pedido-item" onclick="selecionarPedido(${pedido.id})">
                <div class="pedido-header">
                    <span class="pedido-id">Pedido #${pedido.id}</span>
                    <span class="pedido-status status-${pedido.pagamento.toLowerCase()}">${pedido.pagamento}</span>
                </div>
                <div class="pedido-cliente">${pedido.nome_usuario} (ID: ${pedido.id_usuario})</div>
                <div class="pedido-detalhes">
                    <span><strong>Data:</strong> ${dataFormatada}</span>
                    <span><strong>Total:</strong> R$ ${parseFloat(pedido.valor_total).toFixed(2)}</span>
                </div>
                <div class="pedido-produtos">
                    <strong>Produtos (${pedido.produtos.length}):</strong>
                    ${pedido.produtos.slice(0, 2).map(produto => `
                        <div class="produto-linha">
                            <span>${produto.nome_produto || 'Produto não encontrado'}</span>
                            <span>${produto.quantidade}x R$ ${parseFloat(produto.preco_unitario || 0).toFixed(2)}</span>
                        </div>
                    `).join('')}
                    ${pedido.produtos.length > 2 ? `<div class="produto-linha">+${pedido.produtos.length - 2} mais itens...</div>` : ''}
                </div>
            </div>
        `;
    }
    return html;
}

/**
 * Seleciona pedido ao clicar na lista
 */
function selecionarPedido(id) {
    document.getElementById("id").value = id;
    procure();
}

/**
 * Atualiza a lista visual de pedidos
 */
function listar() {
    const outputElement = document.getElementById("outputSaida");
    if (outputElement) {
        outputElement.innerHTML = preparaListagem(listaPedido);
    }
}

// ========================
// COMPATIBILIDADE COM CÓDIGO ANTIGO
// ========================

// Mantém funções com nomes originais para compatibilidade
window.procurePorChavePrimaria = procurePorChavePrimaria;
window.procure = procure;
window.alterar = alterar;
window.excluir = excluir;
window.salvar = salvar;
window.cancelarOperacao = cancelarOperacao;
window.mostrarAviso = mostrarAviso;
window.listar = listar;
window.selecionarPedido = selecionarPedido;