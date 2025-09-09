let listaUsuario = [];
let oQueEstaFazendo = '';
let usuario = null;

// URL base da API
const API_BASE_URL = 'http://localhost:3001/api/usuarios';

// ========================
// INICIALIZAÇÃO
// ========================
document.addEventListener('DOMContentLoaded', async () => {
    await carregarUsuariosDoBanco();
    bloquearAtributos(true);
    mostrarAviso('Sistema carregado. Digite um ID e clique em "Procurar"');
});

// ========================
// COMUNICAÇÃO COM O BANCO VIA API
// ========================

/**
 * Carrega todos os usuários do banco de dados
 */
async function carregarUsuariosDoBanco() {
    try {
        mostrarAviso('Carregando usuários...');
        
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        listaUsuario = await response.json();
        listar();
        mostrarAviso(`${listaUsuario.length} usuários carregados do banco`);
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        mostrarAviso(`Erro ao carregar usuários: ${error.message}`);
        listaUsuario = [];
    }
}

/**
 * Salva usuário no banco de dados (CREATE/UPDATE)
 */
async function salvarUsuarioNoBanco(usuarioData) {
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
            body: JSON.stringify(usuarioData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        throw error;
    }
}

/**
 * Exclui usuário do banco de dados
 */
async function excluirUsuarioDoBanco(id) {
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
        console.error('Erro ao excluir usuário:', error);
        throw error;
    }
}

// ========================
// FUNÇÕES PRINCIPAIS DO CRUD
// ========================

/**
 * Procura usuário por ID
 */
function procurePorChavePrimaria(chave) {
    for (let i = 0; i < listaUsuario.length; i++) {
        const usuario = listaUsuario[i];
        if (usuario.id == chave) {
            usuario.posicaoNaLista = i;
            return usuario;
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
    usuario = procurePorChavePrimaria(id);
    
    if (usuario) {
        // Usuário encontrado
        mostrarDadosUsuario(usuario);
        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');
        mostrarAviso("Usuário encontrado no banco! Pode alterar ou excluir.");
    } else {
        // Usuário não encontrado
        limparAtributos();
        visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');
        mostrarAviso("Usuário não encontrado. Pode inserir um novo.");
    }
}

/**
 * Inicia inserção
 */
function inserir() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'inserindo';
    mostrarAviso("INSERINDO - Digite os dados e clique em 'Salvar'");
    document.getElementById("nome").focus();
}

/**
 * Inicia alteração
 */
function alterar() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';
    mostrarAviso("ALTERANDO - Modifique os dados e clique em 'Salvar'");
    document.getElementById("nome").focus();
}

/**
 * Inicia exclusão
 */
function excluir() {
    bloquearAtributos(true);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'excluindo';
    mostrarAviso("EXCLUINDO - Clique em 'Salvar' para confirmar a exclusão");
}

/**
 * Salva as alterações no banco
 */
async function salvar() {
    try {
        // Coleta dados do formulário
        const id = usuario ? usuario.id : parseInt(document.getElementById("id").value);
        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;

        // Validação básica
        if (!id || !nome || !email || !senha) {
            mostrarAviso("⚠️ Preencha todos os campos corretamente!");
            return;
        }

        mostrarAviso("Salvando no banco de dados...");

        // Executa operação conforme o que está fazendo
        switch (oQueEstaFazendo) {
            case 'inserindo':
                await inserirNoBanco(id, nome, email, senha);
                break;
                
            case 'alterando':
                await alterarNoBanco(id, nome, email, senha);
                break;
                
            case 'excluindo':
                await excluirNoBanco(id);
                break;
                
            default:
                mostrarAviso("⚠️ Operação inválida");
                return;
        }

        // Recarrega lista e reseta interface
        await carregarUsuariosDoBanco();
        resetarInterface();
        
    } catch (error) {
        mostrarAviso(`❌ Erro: ${error.message}`);
    }
}

/**
 * Inserir usuário no banco
 */
async function inserirNoBanco(id, nome, email, senha) {
    const usuarioData = { id, nome, email, senha };
    await salvarUsuarioNoBanco(usuarioData);
    mostrarAviso("✅ Usuário inserido com sucesso!");
}

/**
 * Alterar usuário no banco
 */
async function alterarNoBanco(id, nome, email, senha) {
    const usuarioData = { id, nome, email, senha };
    await salvarUsuarioNoBanco(usuarioData);
    mostrarAviso("✅ Usuário alterado com sucesso!");
}

/**
 * Excluir usuário do banco
 */
async function excluirNoBanco(id) {
    await excluirUsuarioDoBanco(id);
    mostrarAviso("✅ Usuário excluído com sucesso!");
}

/**
 * Reseta a interface após salvar
 */
function resetarInterface() {
    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
    limparAtributos();
    usuario = null;
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
    if (usuario) {
        mostrarDadosUsuario(usuario);
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
 * Mostra dados do usuário nos campos
 */
function mostrarDadosUsuario(usuario) {
    document.getElementById("id").value = usuario.id;
    document.getElementById("nome").value = usuario.nome;
    document.getElementById("email").value = usuario.email;
    document.getElementById("senha").value = usuario.senha;
    
    bloquearAtributos(true);
}

/**
 * Limpa todos os campos
 */
function limparAtributos() {
    document.getElementById("nome").value = "";
    document.getElementById("email").value = "";
    document.getElementById("senha").value = "";
    
    bloquearAtributos(true);
}

/**
 * Controla se os campos estão bloqueados
 */
function bloquearAtributos(soLeitura) {
    document.getElementById("nome").readOnly = soLeitura;
    document.getElementById("email").readOnly = soLeitura;
    document.getElementById("senha").readOnly = soLeitura;
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
 * Monta HTML da lista de usuários
 */
function listar() {
    let html = "";
    listaUsuario.forEach(usuario => {
        html += `
            <div class="usuario-item">
                <strong>ID: ${usuario.id}</strong> - ${usuario.nome}<br>
                <small>Email: ${usuario.email}</small>
            </div>
        `;
    });
    document.getElementById("outputSaida").innerHTML = html;
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