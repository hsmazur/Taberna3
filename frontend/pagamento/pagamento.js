// frontend/pagamento.js - Versão SEM LOGIN
// Configurações globais
const API_URL = 'http://localhost:3001';

// Elementos principais
let valorTotalElement, areaFormularios;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    valorTotalElement = document.getElementById('valor-total');
    areaFormularios = document.getElementById('area-formularios');
    
    // Carrega o valor total do carrinho
    await carregarTotalCarrinho();
    
    // Configura os listeners dos radios
    document.querySelectorAll('input[name="pagamento"]').forEach(radio => {
        radio.addEventListener('change', (e) => mostrarFormularioPagamento(e.target.value));
    });
    
    // Mostra o formulário inicial (dinheiro por padrão)
    mostrarFormularioPagamento('dinheiro');
});

// Carrega o total do carrinho do banco de dados
async function carregarTotalCarrinho() {
    try {
        // Busca o carrinho atual no banco
        const response = await fetch(`${API_URL}/carrinho`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar carrinho');
        }
        
        const itens = await response.json();
        
        // Calcula o total
        let total = 0;
        itens.forEach(item => {
            total += parseFloat(item.preco) * parseInt(item.quantidade);
        });
        
        // Recupera dados de entrega do localStorage (se houver)
        const dadosEntrega = JSON.parse(localStorage.getItem('dadosEntrega') || '{"taxaEntrega": 0}');
        
        if (dadosEntrega.taxaEntrega > 0) {
            const subtotal = total;
            total += dadosEntrega.taxaEntrega;
            
            valorTotalElement.innerHTML = `
                <p>Subtotal: R$ ${subtotal.toFixed(2)}</p>
                <p>Taxa de entrega: R$ ${dadosEntrega.taxaEntrega.toFixed(2)}</p>
                <p><strong>Total: R$ ${total.toFixed(2)}</strong></p>
            `;
        } else {
            valorTotalElement.innerHTML = `<p><strong>Total: R$ ${total.toFixed(2)}</strong></p>`;
        }
        
        // Salva o total calculado no localStorage para usar na finalização
        localStorage.setItem('totalPedido', total.toFixed(2));
        
    } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
        valorTotalElement.textContent = 'Erro ao carregar valor total';
    }
}

// Mostra o formulário correspondente ao tipo de pagamento
function mostrarFormularioPagamento(tipo) {
    const templates = {
        dinheiro: `
            <div class="formulario-pagamento">
                <h3>Pagamento em Dinheiro</h3>
                <p>Você selecionou pagamento em dinheiro.</p>
                <button type="button" id="botao-preciso-troco" class="botao-troco">Preciso de troco</button>
                <div id="grupo-troco" class="grupo-troco">
                    <label for="valor-recebido">Valor recebido:</label>
                    <input type="number" id="valor-recebido" placeholder="R$ 0,00" min="0" step="0.01">
                    <div id="mensagem-troco" class="mensagem-troco"></div>
                </div>
                <button id="confirmar-pagamento" class="botao-confirmar">Confirmar Pedido</button> 
            </div>
        `,
        pix: `
            <div class="formulario-pagamento">
                <h3>Pagamento via PIX</h3>
                <p>Chave PIX: <strong>tabernadragao@email.com</strong></p>
                <div class="qr-code-container">
                    <button id="gerar-qrcode">Mostrar QR Code</button>
                    <img id="qr-code-image" src="../img/qrcode.png" alt="QR Code PIX" style="display: none; max-width: 200px; margin: 1rem auto;">
                </div>
                <p>Após o pagamento, clique em confirmar.</p>
                <button id="confirmar-pagamento" class="botao-confirmar">Confirmar Pedido</button>
            </div>
        `,
        debito: `
            <div class="formulario-pagamento">
                <h3>Pagamento com Cartão de Débito</h3>
                <div class="grupo-cartao">
                    <input type="text" id="numero-cartao" placeholder="Número do Cartão" maxlength="19">
                    <span id="erro-numero" class="mensagem-erro"></span>
                    
                    <div class="linha-cartao">
                        <input type="text" id="validade-cartao" placeholder="MM/AA" maxlength="5">
                        <input type="text" id="cvv-cartao" placeholder="CVV" maxlength="3">
                    </div>
                    <span id="erro-validade" class="mensagem-erro"></span>
                    <span id="erro-cvv" class="mensagem-erro"></span>
                    
                    <input type="text" id="nome-cartao" placeholder="Nome no Cartão">
                    <span id="erro-nome" class="mensagem-erro"></span>
                </div>
                <button id="confirmar-pagamento" class="botao-confirmar">Confirmar Pedido</button>
            </div>
        `
    };

    areaFormularios.innerHTML = templates[tipo];
    configurarEventosFormulario(tipo);
}

// Configura os eventos específicos de cada formulário
function configurarEventosFormulario(tipo) {
    switch (tipo) {
        case 'dinheiro':
            const botaoTroco = document.getElementById('botao-preciso-troco');
            const grupoTroco = document.getElementById('grupo-troco');
            const valorRecebido = document.getElementById('valor-recebido');
            const mensagemTroco = document.getElementById('mensagem-troco');
    
            botaoTroco.addEventListener('click', () => {
                grupoTroco.classList.toggle('visivel');
        
                // Alterar texto do botão
                if (grupoTroco.classList.contains('visivel')) {
                    botaoTroco.textContent = 'Não preciso de troco';
                } else {
                    botaoTroco.textContent = 'Preciso de troco';
                    mensagemTroco.classList.remove('visivel');
                }
            });
    
            valorRecebido.addEventListener('input', () => {
                const total = parseFloat(localStorage.getItem('totalPedido') || '0');
                const recebido = parseFloat(valorRecebido.value) || 0;
        
                if (recebido > 0) {
                    if (recebido < total) {
                        mensagemTroco.textContent = `Valor insuficiente. Faltam R$ ${(total - recebido).toFixed(2)}`;
                        mensagemTroco.style.color = '#8b0000';
                        mensagemTroco.classList.add('visivel');
                    } else {
                        const troco = recebido - total;
                        mensagemTroco.textContent = `Troco: R$ ${troco.toFixed(2)}`;
                        mensagemTroco.style.color = '#1a120b';
                        mensagemTroco.classList.add('visivel');
                    }
                } else {
                    mensagemTroco.classList.remove('visivel');
                }
            });
        break;
            
        case 'pix':
            document.getElementById('gerar-qrcode').addEventListener('click', () => {
                const qrCode = document.getElementById('qr-code-image');
                qrCode.style.display = qrCode.style.display === 'none' ? 'block' : 'none';
            });
            break;
            
        case 'debito':
            // Máscara para número do cartão
            document.getElementById('numero-cartao').addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
                if (value.length > 0) {
                    value = value.match(new RegExp('.{1,4}', 'g')).join(' ');
                }
                e.target.value = value;
                
                // Validação com algoritmo de Luhn
                const erro = document.getElementById('erro-numero');
                if (!validarNumeroCartaoLuhn(value)) {
                    erro.textContent = 'Número do cartão inválido';
                    erro.style.display = 'block';
                } else {
                    erro.style.display = 'none';
                }
            });
            
            // Máscara para validade (MM/AA)
            document.getElementById('validade-cartao').addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
                
                // Validação básica
                const erro = document.getElementById('erro-validade');
                if (value.length !== 5 || !validarDataCartao(value)) {
                    erro.textContent = 'Data inválida (MM/AA)';
                    erro.style.display = 'block';
                } else {
                    erro.style.display = 'none';
                }
            });
            
            // Máscara para CVV
            document.getElementById('cvv-cartao').addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 3);
                
                const erro = document.getElementById('erro-cvv');
                if (e.target.value.length !== 3) {
                    erro.textContent = 'CVV inválido (3 dígitos)';
                    erro.style.display = 'block';
                } else {
                    erro.style.display = 'none';
                }
            });
            
            // Validação do nome no cartão
            document.getElementById('nome-cartao').addEventListener('input', (e) => {
                const erro = document.getElementById('erro-nome');
                if (e.target.value.trim().length < 3) {
                    erro.textContent = 'Nome muito curto';
                    erro.style.display = 'block';
                } else {
                    erro.style.display = 'none';
                }
            });
            break;
    }
    
    // Configura o botão de confirmar pedido
    document.getElementById('confirmar-pagamento').addEventListener('click', () => {
        if (validarFormulario(tipo)) {
            finalizarPedido(tipo);
        }
    });
}

// Algoritmo de Luhn para validar número do cartão
function validarNumeroCartaoLuhn(numero) {
    const numeroLimpo = numero.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    
    if (numeroLimpo.length < 13 || numeroLimpo.length > 19) {
        return false;
    }

    let soma = 0;
    let deveDobrar = false;

    for (let i = numeroLimpo.length - 1; i >= 0; i--) {
        let digito = parseInt(numeroLimpo.charAt(i), 10);

        if (deveDobrar) {
            digito *= 2;
            if (digito > 9) {
                digito = (digito % 10) + 1;
            }
        }

        soma += digito;
        deveDobrar = !deveDobrar;
    }

    return soma % 10 === 0;
}

// Valida o formulário antes de enviar
function validarFormulario(tipo) {
    switch (tipo) {
        case 'debito':
            const numero = document.getElementById('numero-cartao').value.replace(/\s/g, '');
            const validade = document.getElementById('validade-cartao').value;
            const cvv = document.getElementById('cvv-cartao').value;
            const nome = document.getElementById('nome-cartao').value.trim();
            
            if (!validarNumeroCartaoLuhn(numero)) {
                alert('Número do cartão inválido!');
                return false;
            }
            
            if (!validarDataCartao(validade)) {
                alert('Data de validade inválida!');
                return false;
            }
            
            if (cvv.length !== 3) {
                alert('CVV inválido!');
                return false;
            }
            
            if (nome.length < 3) {
                alert('Nome no cartão inválido!');
                return false;
            }
            break;
            
        case 'dinheiro':
            const grupoTrocoVisivel = document.getElementById('grupo-troco').classList.contains('visivel');
    
            if (grupoTrocoVisivel) {
                const total = parseFloat(localStorage.getItem('totalPedido') || '0');
                const recebido = parseFloat(document.getElementById('valor-recebido').value) || 0;
        
                if (recebido <= 0) {
                    alert('Informe o valor recebido!');
                    return false;
                }
        
                if (recebido < total) {
                    alert(`Valor insuficiente! Faltam R$ ${(total - recebido).toFixed(2)}`);
                    return false;
                }
            }
            break;

    }
    return true;
}

// Valida a data do cartão (MM/AA)
function validarDataCartao(data) {
    if (data.length !== 5) return false;
    
    const [mes, ano] = data.split('/').map(Number);
    const agora = new Date();
    const anoAtual = agora.getFullYear() % 100;
    const mesAtual = agora.getMonth() + 1;
    
    if (mes < 1 || mes > 12) return false;
    if (ano < anoAtual || (ano === anoAtual && mes < mesAtual)) return false;
    
    return true;
}

// Finaliza o pedido via API
async function finalizarPedido(metodo) {
    try {
        // Recupera dados de entrega do localStorage
        const dadosEntrega = JSON.parse(localStorage.getItem('dadosEntrega') || '{}');
        const total = localStorage.getItem('totalPedido') || '0';

        // Dados do pagamento para enviar
        const dadosPagamento = {
            metodoPagamento: metodo,
            total: parseFloat(total),
            dadosEntrega: dadosEntrega.taxaEntrega > 0 ? dadosEntrega : null
        };

        // Adiciona dados específicos do método de pagamento
        if (metodo === 'dinheiro') {
            const grupoTrocoVisivel = document.getElementById('grupo-troco').classList.contains('visivel');
    
            if (grupoTrocoVisivel) {
                const recebido = parseFloat(document.getElementById('valor-recebido').value) || 0;
                const total = parseFloat(localStorage.getItem('totalPedido') || '0');
        
                dadosPagamento.valorRecebido = recebido;
                dadosPagamento.troco = recebido - total;
            }
            
        } else if (metodo === 'debito') {
            dadosPagamento.dadosCartao = {
                numero: document.getElementById('numero-cartao').value.replace(/\s/g, '').slice(-4), // Apenas últimos 4 dígitos
                nome: document.getElementById('nome-cartao').value.trim()
            };
        }

        // Envia o pedido para o servidor
        const response = await fetch(`${API_URL}/pagamento/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPagamento)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao processar pagamento');
        }
        
        const resultado = await response.json();
        
        // Limpa dados temporários
        localStorage.removeItem('totalPedido');
        localStorage.removeItem('dadosEntrega');
        
        // Redireciona para confirmação
        window.location.href = `../menu.html?pedido=${resultado.pedidoId}`;
        
    } catch (error) {
        console.error('Erro ao finalizar pedido:', error);
        alert(`Erro ao processar pagamento: ${error.message}`);
    }
}