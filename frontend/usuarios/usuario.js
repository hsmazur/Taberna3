let listaUsuario = [];
let oQueEstaFazendo = '';
let usuario = null;

// URL base da API
const API_BASE_URL = 'http://localhost:3001/api/usuarios';
const CLIENTE_BASE_URL = 'http://localhost:3001/api/clientes';
const FUNCIONARIO_BASE_URL = 'http://localhost:3001/api/funcionarios';

// ========================
// INICIALIZAÇÃO
// ========================
document.addEventListener('DOMContentLoaded', async () => {
    await carregarUsuariosDoBanco();
    bloquearAtributos(true);
    mostrarAviso('Sistema carregado. Digite um ID e clique em "Procurar"');
    
    // Adiciona máscara de telefone
    document.getElementById('telefone').addEventListener('input', function(e) {
        aplicarMascaraTelefone(e.target);
        validarTelefone(e.target);
    });
});

// ========================
// FUNÇÕES DE INTERFACE
// ========================

/**
 * Mostra campos adicionais baseado no tipo selecionado
 */
function mostrarCamposAdicionais() {
    const tipo = document.getElementById("tipo").value;
    const camposCliente = document.getElementById("campos-cliente");
    const camposFuncionario = document.getElementById("campos-funcionario");
    
    camposCliente.style.display = 'none';
    camposFuncionario.style.display = 'none';
    
    if (tipo === 'cliente') {
        camposCliente.style.display = 'block';
    } else if (tipo === 'funcionario') {
        camposFuncionario.style.display = 'block';
    }
}

/**
 * Aplica máscara de telefone
 */
function aplicarMascaraTelefone(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length <= 11) {
        if (value.length <= 2) {
            value = value.replace(/^(\d{0,2})/, '($1');
        } else if (value.length <= 6) {
            value = value.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
        } else if (value.length <= 10) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        } else {
            value = value.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
        }
    }
    
    input.value = value;
}

/**
 * Valida formato do telefone
 */
function validarTelefone(input) {
    const telefone = input.value.replace(/\D/g, '');
    const isValid = telefone.length >= 10 && telefone.length <= 11;
    
    input.classList.remove('telefone-valido', 'telefone-invalido');
    
    if (telefone === '') {
        return true;
    }
    
    if (isValid) {
        input.classList.add('telefone-valido');
        return true;
    } else {
        input.classList.add('telefone-invalido');
        return false;
    }
}

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
        
        // Carrega dados adicionais de cada usuário
        for (let usuario of listaUsuario) {
            usuario.detalhes = await carregarDetalhesUsuario(usuario.id);
        }
        
        listar();
        mostrarAviso(`${listaUsuario.length} usuários carregados do banco`);
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        mostrarAviso(`Erro ao carregar usuários: ${error.message}`);
        listaUsuario = [];
    }
}

/**
 * Carrega detalhes adicionais do usuário (cliente ou funcionário)
 */
async function carregarDetalhesUsuario(idUsuario) {
    try {
        // Tenta carregar como cliente
        const responseCliente = await fetch(`${CLIENTE_BASE_URL}/usuario/${idUsuario}`);
        if (responseCliente.ok) {
            const cliente = await responseCliente.json();
            return { tipo: 'cliente', ...cliente };
        }
        
        // Tenta carregar como funcionário
        const responseFuncionario = await fetch(`${FUNCIONARIO_BASE_URL}/usuario/${idUsuario}`);
        if (responseFuncionario.ok) {
            const funcionario = await responseFuncionario.json();
            return { tipo: 'funcionario', ...funcionario };
        }
        
        return { tipo: 'indefinido' };
        
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        return { tipo: 'erro' };
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
 * Salva dados adicionais do usuário (CORRIGIDO)
 */
async function salvarDadosAdicionais(idUsuario, tipo, dados) {
    try {
        const url = tipo === 'cliente' ? CLIENTE_BASE_URL : FUNCIONARIO_BASE_URL;
        
        // CORREÇÃO: Verifica se já existe registro antes de decidir o método
        let method = 'POST'; // Padrão para criar
        
        if (oQueEstaFazendo === 'alterando') {
            // Verifica se já existe o registro específico
            const checkUrl = `${url}/usuario/${idUsuario}`;
            const checkResponse = await fetch(checkUrl);
            
            if (checkResponse.ok) {
                method = 'PUT'; // Já existe, atualiza
            }
            // Se não existe (404), mantém POST para criar
        }
        
        const dadosCompletos = {
            ...dados,
            id_usuario: idUsuario
        };
        
        console.log(`Salvando dados adicionais - Método: ${method}, Tipo: ${tipo}`, dadosCompletos);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dadosCompletos)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro na resposta:', errorData);
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erro ao salvar dados adicionais:', error);
        throw error;
    }
}

/**
 * Remove dados adicionais antigos se mudou de tipo
 */
async function removerTipoAnterior(idUsuario, tipoNovo, tipoAtual) {
    try {
        if (tipoAtual && tipoAtual !== 'indefinido' && tipoAtual !== tipoNovo) {
            console.log(`Removendo tipo anterior: ${tipoAtual} -> ${tipoNovo}`);
            
            // Remove registro do tipo anterior
            if (tipoAtual === 'cliente') {
                const deleteUrl = `${CLIENTE_BASE_URL}/usuario/${idUsuario}`;
                await fetch(deleteUrl, { method: 'DELETE' });
            } else if (tipoAtual === 'funcionario') {
                const deleteUrl = `${FUNCIONARIO_BASE_URL}/usuario/${idUsuario}`;
                await fetch(deleteUrl, { method: 'DELETE' });
            }
        }
    } catch (error) {
        console.warn('Erro ao remover tipo anterior (não crítico):', error);
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
 * Salva as alterações no banco (CORRIGIDO)
 */
async function salvar() {
    try {
        // Coleta dados do formulário
        const id = usuario ? usuario.id : parseInt(document.getElementById("id").value);
        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;
        const tipo = document.getElementById("tipo").value;

        // Validação básica
        if (!id || !nome || !email || !senha || !tipo) {
            mostrarAviso("⚠️ Preencha todos os campos corretamente!");
            return;
        }

        // Validação específica para cliente
        if (tipo === 'cliente') {
            const telefone = document.getElementById("telefone").value;
            if (telefone && !validarTelefone(document.getElementById("telefone"))) {
                mostrarAviso("⚠️ Telefone inválido! Use o formato (11) 99999-9999");
                return;
            }
        }

        mostrarAviso("Salvando no banco de dados...");

        // Executa operação conforme o que está fazendo
        switch (oQueEstaFazendo) {
            case 'inserindo':
                await inserirNoBanco(id, nome, email, senha, tipo);
                break;
                
            case 'alterando':
                await alterarNoBanco(id, nome, email, senha, tipo);
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
async function inserirNoBanco(id, nome, email, senha, tipo) {
    // Salva usuário básico
    const usuarioData = { id, nome, email, senha };
    await salvarUsuarioNoBanco(usuarioData);
    
    // Salva dados adicionais
    const dadosAdicionais = obterDadosAdicionais(tipo);
    await salvarDadosAdicionais(id, tipo, dadosAdicionais);
    
    mostrarAviso("✅ Usuário inserido com sucesso!");
}

/**
 * Alterar usuário no banco (CORRIGIDO)
 */
async function alterarNoBanco(id, nome, email, senha, tipo) {
    // Atualiza usuário básico
    const usuarioData = { id, nome, email, senha };
    await salvarUsuarioNoBanco(usuarioData);
    
    // Verifica se mudou de tipo
    const tipoAtual = usuario && usuario.detalhes ? usuario.detalhes.tipo : 'indefinido';
    
    // Remove tipo anterior se mudou
    await removerTipoAnterior(id, tipo, tipoAtual);
    
    // Salva dados adicionais do novo tipo
    const dadosAdicionais = obterDadosAdicionais(tipo);
    await salvarDadosAdicionais(id, tipo, dadosAdicionais);
    
    mostrarAviso("✅ Usuário alterado com sucesso!");
}

/**
 * Obtém dados adicionais do formulário
 */
function obterDadosAdicionais(tipo) {
    if (tipo === 'cliente') {
        return {
            telefone: document.getElementById("telefone").value.replace(/\D/g, ''),
            endereco: document.getElementById("endereco").value.trim(),
            bairro: document.getElementById("bairro").value.trim()
        };
    } else if (tipo === 'funcionario') {
        return {
            cargo: document.getElementById("cargo").value
        };
    }
    return {};
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
    
    // Preenche tipo e dados adicionais
    if (usuario.detalhes && usuario.detalhes.tipo !== 'indefinido') {
        document.getElementById("tipo").value = usuario.detalhes.tipo;
        mostrarCamposAdicionais();
        
        if (usuario.detalhes.tipo === 'cliente') {
            document.getElementById("telefone").value = usuario.detalhes.telefone || '';
            document.getElementById("endereco").value = usuario.detalhes.endereco || '';
            document.getElementById("bairro").value = usuario.detalhes.bairro || '';
        } else if (usuario.detalhes.tipo === 'funcionario') {
            document.getElementById("cargo").value = usuario.detalhes.cargo || 'cozinheiro';
        }
    } else {
        // Se não tem tipo definido, define como cliente por padrão
        document.getElementById("tipo").value = "cliente";
        mostrarCamposAdicionais();
    }
    
    bloquearAtributos(true);
}

/**
 * Limpa todos os campos
 */
function limparAtributos() {
    document.getElementById("nome").value = "";
    document.getElementById("email").value = "";
    document.getElementById("senha").value = "";
    document.getElementById("tipo").value = "cliente";
    document.getElementById("telefone").value = "";
    document.getElementById("endereco").value = "";
    document.getElementById("bairro").value = "";
    document.getElementById("cargo").value = "cozinheiro";
    
    // Limpa classes de validação
    document.getElementById("telefone").classList.remove('telefone-valido', 'telefone-invalido');
    
    // Esconde campos adicionais
    document.getElementById("campos-cliente").style.display = 'none';
    document.getElementById("campos-funcionario").style.display = 'none';
    
    bloquearAtributos(true);
}

/**
 * Controla se os campos estão bloqueados
 */
function bloquearAtributos(soLeitura) {
    document.getElementById("nome").readOnly = soLeitura;
    document.getElementById("email").readOnly = soLeitura;
    document.getElementById("senha").readOnly = soLeitura;
    document.getElementById("tipo").disabled = soLeitura;
    document.getElementById("telefone").readOnly = soLeitura;
    document.getElementById("endereco").readOnly = soLeitura;
    document.getElementById("bairro").readOnly = soLeitura;
    document.getElementById("cargo").disabled = soLeitura;
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
                ${usuario.detalhes && usuario.detalhes.tipo !== 'indefinido' ? `
                    <div class="tipo">${usuario.detalhes.tipo.toUpperCase()}</div>
                    <div class="detalhes">
                        ${usuario.detalhes.tipo === 'cliente' ? 
                            `Telefone: ${usuario.detalhes.telefone || 'Não informado'}<br>
                             Endereço: ${usuario.detalhes.endereco || 'Não informado'}<br>
                             Bairro: ${usuario.detalhes.bairro || 'Não informado'}`
                        : usuario.detalhes.tipo === 'funcionario' ?
                            `Cargo: ${usuario.detalhes.cargo || 'Não definido'}`
                        : 'Dados não carregados'}
                    </div>
                ` : `
                    <div class="tipo-indefinido">TIPO NÃO DEFINIDO</div>
                `}
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
window.mostrarCamposAdicionais = mostrarCamposAdicionais;