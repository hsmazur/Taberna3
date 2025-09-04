// ===========================================
// PRODUTO.JS - CRUD INTEGRADO COM POSTGRESQL
// ===========================================

let listaProduto = [];
let oQueEstaFazendo = '';
let produto = null;

// URL base da API (ajustar conforme necessário)
const API_BASE_URL = 'http://localhost:3000/api/produtos';

// ========================
// INICIALIZAÇÃO
// ========================
document.addEventListener('DOMContentLoaded', async () => {
    await carregarProdutosDoBanco();
    bloquearAtributos(true);
    mostrarAviso('Sistema carregado. Digite um ID e clique em "Procurar"');
});

// ========================
// COMUNICAÇÃO COM O BANCO VIA API
// ========================

/**
 * Carrega todos os produtos do banco de dados
 */
async function carregarProdutosDoBanco() {
    try {
        mostrarAviso('Carregando produtos...');
        
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        listaProduto = await response.json();
        listar();
        mostrarAviso(`${listaProduto.length} produtos carregados do banco`);
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        mostrarAviso(`Erro ao carregar produtos: ${error.message}`);
        listaProduto = []; // Lista vazia em caso de erro
    }
}

/**
 * Salva produto no banco de dados (CREATE/UPDATE)
 */
async function salvarProdutoNoBanco(produtoData) {
    try {
        let url = API_BASE_URL;
        let method = 'POST';
        
        // Se é alteração, usa PUT
        if (oQueEstaFazendo === 'alterando') {
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(produtoData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        throw error;
    }
}

/**
 * Exclui produto do banco de dados
 */
async function excluirProdutoDoBanco(id) {
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
        console.error('Erro ao excluir produto:', error);
        throw error;
    }
}

/**
 * Faz upload da imagem do produto
 */
async function uploadImagemProduto(file, id) {
    try {
        const formData = new FormData();
        formData.append('imagem', file);
        formData.append('id', id);
        
        const response = await fetch(`${API_BASE_URL}/upload-imagem`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha no upload da imagem');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erro no upload:', error);
        throw error;
    }
}

// ========================
// FUNÇÕES PRINCIPAIS DO CRUD
// ========================

/**
 * Procura produto por ID (mantém lógica original)
 */
function procurePorChavePrimaria(chave) {
    for (let i = 0; i < listaProduto.length; i++) {
        const produto = listaProduto[i];
        if (produto.id == chave) {
            produto.posicaoNaLista = i;
            return produto;
        }
    }
    return null;
}

/**
 * Função de procurar (mantém interface original)
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
    produto = procurePorChavePrimaria(id);
    
    if (produto) {
        // Produto encontrado
        mostrarDadosProduto(produto);
        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');
        mostrarAviso("Produto encontrado no banco! Pode alterar ou excluir.");
    } else {
        // Produto não encontrado
        limparAtributos();
        visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');
        mostrarAviso("Produto não encontrado. Pode inserir um novo.");
    }
}

/**
 * Inicia inserção (mantém interface original)
 */
function inserir() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'inserindo';
    mostrarAviso("INSERINDO - Digite os dados e clique em 'Salvar'");
    document.getElementById("nome").focus();
}

/**
 * Inicia alteração (mantém interface original)
 */
function alterar() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';
    mostrarAviso("ALTERANDO - Modifique os dados e clique em 'Salvar'");
    document.getElementById("nome").focus();
}

/**
 * Inicia exclusão (mantém interface original)
 */
function excluir() {
    bloquearAtributos(true); // Bloqueia campos na exclusão
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'excluindo';
    mostrarAviso("EXCLUINDO - Clique em 'Salvar' para confirmar a exclusão");
}

/**
 * Salva as alterações no banco (integração com PostgreSQL)
 */
async function salvar() {
    try {
        // Coleta dados do formulário
        const id = produto ? produto.id : parseInt(document.getElementById("id").value);
        const nome = document.getElementById("nome").value.trim();
        const ingredientes = document.getElementById("ingredientes").value.trim();
        const preco = parseFloat(document.getElementById("preco").value);
        const inputImagem = document.getElementById("imagem");

        // Validação básica
        if (!id || !nome || !ingredientes || isNaN(preco)) {
            mostrarAviso("❌ Preencha todos os campos corretamente!");
            return;
        }

        mostrarAviso("Salvando no banco de dados...");

        // Executa operação conforme o que está fazendo
        switch (oQueEstaFazendo) {
            case 'inserindo':
                await inserirNoBanco(id, nome, ingredientes, preco, inputImagem);
                break;
                
            case 'alterando':
                await alterarNoBanco(id, nome, ingredientes, preco, inputImagem);
                break;
                
            case 'excluindo':
                await excluirNoBanco(id);
                break;
                
            default:
                mostrarAviso("❌ Operação inválida");
                return;
        }

        // Recarrega lista e reseta interface
        await carregarProdutosDoBanco();
        resetarInterface();
        
    } catch (error) {
        mostrarAviso(`❌ Erro: ${error.message}`);
    }
}

/**
 * Inserir produto no banco
 */
async function inserirNoBanco(id, nome, ingredientes, preco, inputImagem) {
    // Dados do produto
    const produtoData = { id, nome, ingredientes, preco };
    
    // Salva produto no banco
    const produtoSalvo = await salvarProdutoNoBanco(produtoData);
    
    // Upload da imagem (se selecionada)
    if (inputImagem.files.length > 0) {
        await uploadImagemProduto(inputImagem.files[0], id);
    }
    
    mostrarAviso("✅ Produto inserido com sucesso!");
}

/**
 * Alterar produto no banco
 */
async function alterarNoBanco(id, nome, ingredientes, preco, inputImagem) {
    // Dados do produto
    const produtoData = { id, nome, ingredientes, preco };
    
    // Atualiza produto no banco
    const produtoAtualizado = await salvarProdutoNoBanco(produtoData);
    
    // Upload da nova imagem (se selecionada)
    if (inputImagem.files.length > 0) {
        await uploadImagemProduto(inputImagem.files[0], id);
    }
    
    mostrarAviso("✅ Produto alterado com sucesso!");
}

/**
 * Excluir produto do banco
 */
async function excluirNoBanco(id) {
    await excluirProdutoDoBanco(id);
    mostrarAviso("✅ Produto excluído com sucesso!");
}

/**
 * Reseta a interface após salvar
 */
function resetarInterface() {
    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
    limparAtributos();
    produto = null;
    oQueEstaFazendo = '';
    document.getElementById("id").focus();
}

// ========================
// FUNÇÕES DE INTERFACE (mantidas originais)
// ========================

/**
 * Cancela operação em andamento
 */
function cancelarOperacao() {
    if (produto) {
        mostrarDadosProduto(produto);
        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');
    } else {
        limparAtributos();
        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
    }
    
    bloquearAtributos(true);
    oQueEstaFazendo = '';
    mostrarAviso("Operação cancelada");
}

/**
 * Mostra dados do produto nos campos
 */
function mostrarDadosProduto(produto) {
    document.getElementById("id").value = produto.id;
    document.getElementById("nome").value = produto.nome;
    document.getElementById("ingredientes").value = produto.ingredientes;
    document.getElementById("preco").value = produto.preco;
    
    // Mostra nome do arquivo de imagem atual
    const nomeArquivo = document.getElementById("nome-arquivo");
    if (nomeArquivo) {
        nomeArquivo.textContent = produto.imagem ? `Imagem atual: ${produto.imagem}` : 'Nenhuma imagem';
    }
    
    bloquearAtributos(true);
}

/**
 * Limpa todos os campos
 */
function limparAtributos() {
    document.getElementById("nome").value = "";
    document.getElementById("ingredientes").value = "";
    document.getElementById("preco").value = "";
    document.getElementById("imagem").value = "";
    
    // Limpa nome do arquivo
    const nomeArquivo = document.getElementById("nome-arquivo");
    if (nomeArquivo) {
        nomeArquivo.textContent = '';
    }
    
    bloquearAtributos(true);
}

/**
 * Controla se os campos estão bloqueados
 */
function bloquearAtributos(soLeitura) {
    document.getElementById("nome").readOnly = soLeitura;
    document.getElementById("ingredientes").readOnly = soLeitura;
    document.getElementById("preco").readOnly = soLeitura;
    document.getElementById("imagem").readOnly = soLeitura;
}

/**
 * Controla visibilidade dos botões
 */
function visibilidadeDosBotoes(btProcure, btInserir, btAlterar, btExcluir, btSalvar) {
    document.getElementById("btProcure").style.display = btProcure;
    document.getElementById("btInserir").style.display = btInserir;
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
        divAviso.style.color = "#28a745"; // Verde para sucesso
    } else if (mensagem.includes("❌")) {
        divAviso.style.color = "#dc3545"; // Vermelho para erro
    } else if (mensagem.includes("⚠️")) {
        divAviso.style.color = "#ffc107"; // Amarelo para aviso
    } else {
        divAviso.style.color = "#6c757d"; // Cinza padrão
    }
}

/**
 * Monta HTML da lista de produtos (integrada com banco)
 */
function preparaListagem(vetor) {
    if (vetor.length === 0) {
        return "<p>Nenhum produto cadastrado no banco.</p>";
    }
    
    let html = "";
    for (let i = 0; i < vetor.length; i++) {
        const produto = vetor[i];
        const imagemSrc = produto.imagem || `img/lanche${produto.id}.png`;
        
        html += `
            <div class="produto-item" style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 5px;">
                <img src="../${imagemSrc}" alt="${produto.nome}" 
                     onerror="this.src='../img/sem-imagem.png'" 
                     style="width: 80px; height: 80px; object-fit: cover; float: left; margin-right: 10px;">
                <div>
                    <strong>ID: ${produto.id}</strong> - ${produto.nome}<br>
                    <small><strong>Ingredientes:</strong> ${produto.ingredientes}</small><br>
                    <span style="color: #28a745; font-weight: bold;">R$ ${parseFloat(produto.preco).toFixed(2)}</span>
                </div>
                <div style="clear: both;"></div>
            </div>
        `;
    }
    return html;
}

/**
 * Atualiza a lista visual de produtos
 */
function listar() {
    const outputElement = document.getElementById("outputSaida");
    if (outputElement) {
        outputElement.innerHTML = preparaListagem(listaProduto);
    }
}

// ========================
// EVENT LISTENERS ADICIONAIS
// ========================

// Listener para preview da imagem selecionada
document.addEventListener('DOMContentLoaded', () => {
    const inputImagem = document.getElementById("imagem");
    const nomeArquivo = document.getElementById("nome-arquivo");
    
    if (inputImagem && nomeArquivo) {
        inputImagem.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                const arquivo = e.target.files[0];
                nomeArquivo.textContent = `Arquivo selecionado: ${arquivo.name}`;
                
                // Validação do arquivo
                if (!arquivo.type.startsWith('image/')) {
                    nomeArquivo.textContent = "❌ Apenas arquivos de imagem são permitidos";
                    nomeArquivo.style.color = "#dc3545";
                    e.target.value = ""; // Limpa seleção
                } else if (arquivo.size > 5 * 1024 * 1024) { // 5MB
                    nomeArquivo.textContent = "❌ Arquivo muito grande (máx 5MB)";
                    nomeArquivo.style.color = "#dc3545";
                    e.target.value = ""; // Limpa seleção
                } else {
                    nomeArquivo.style.color = "#28a745";
                }
            } else {
                nomeArquivo.textContent = "";
            }
        });
    }
});

// ========================
// FUNÇÕES DE UTILITÁRIO
// ========================

/**
 * Recarrega dados do banco (útil para refresh manual)
 */
async function recarregarDados() {
    await carregarProdutosDoBanco();
    mostrarAviso("Dados recarregados do banco");
}

/**
 * Limpa cache local e recarrega
 */
function limparCache() {
    listaProduto = [];
    listar();
    mostrarAviso("Cache limpo");
}

// ========================
// COMPATIBILIDADE COM CÓDIGO ANTIGO
// ========================

// Mantém funções com nomes originais para compatibilidade
window.procurePorChavePrimaria = procurePorChavePrimaria;
window.procure = procure;
window.inserir = inserir;
window.alterar = alterar;
window.excluir = excluir;
window.salvar = salvar;
window.cancelarOperacao = cancelarOperacao;
window.mostrarAviso = mostrarAviso;
window.listar = listar;

// Funções adicionais
window.recarregarDados = recarregarDados;
window.limparCache = limparCache;