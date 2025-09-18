document.addEventListener('DOMContentLoaded', () => {
    // Elementos das etapas
    const etapaEmail = document.getElementById('etapa-email');
    const etapaToken = document.getElementById('etapa-token');
    const etapaSenha = document.getElementById('etapa-senha');

    // Formulários
    const formSolicitarToken = document.getElementById('form-solicitar-token');
    const formVerificarToken = document.getElementById('form-verificar-token');
    const formNovaSenha = document.getElementById('form-nova-senha');

    // Botões
    const btnReenviarToken = document.getElementById('btn-reenviar-token');

    // Variáveis de controle
    let emailUsuario = '';
    let tokenValido = '';
    let countdownInterval;

    // Visualização de senha
    document.querySelectorAll('.botao-visualizar').forEach(botao => {
        botao.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            const inputSenha = document.getElementById(targetId);
            const img = e.currentTarget.querySelector('img');
    
            if (inputSenha.type === 'password') {
                inputSenha.type = 'text';
                img.src = 'https://cdn-icons-png.flaticon.com/128/709/709612.png';
                img.alt = 'Ocultar senha';
            } else {
                inputSenha.type = 'password';
                img.src = 'https://cdn-icons-png.flaticon.com/128/2767/2767146.png';
                img.alt = 'Visualizar senha';
            }
        });
    });

    // Função para mostrar etapa
    function mostrarEtapa(etapa) {
        document.querySelectorAll('.etapa').forEach(el => el.classList.remove('active'));
        etapa.classList.add('active');
    }

    // Função para validar email
    function validarEmail(email) {
        const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
        return regex.test(email);
    }

    // Função para validar força da senha
    function validarForcaSenha(senha) {
        let forca = 0;
        if (senha.length >= 8) forca++;
        if (/[a-z]/.test(senha)) forca++;
        if (/[A-Z]/.test(senha)) forca++;
        if (/[0-9]/.test(senha)) forca++;
        if (/[^a-zA-Z0-9]/.test(senha)) forca++;
        
        return {
            pontuacao: forca,
            nivel: forca < 3 ? 'fraca' : forca < 4 ? 'media' : 'forte'
        };
    }

    // Função para iniciar countdown de reenvio
    function iniciarCountdown(segundos = 60) {
        let tempo = segundos;
        btnReenviarToken.disabled = true;
        
        const atualizarCountdown = () => {
            btnReenviarToken.textContent = `Reenviar Código (${tempo}s)`;
            tempo--;
            
            if (tempo < 0) {
                clearInterval(countdownInterval);
                btnReenviarToken.disabled = false;
                btnReenviarToken.textContent = 'Reenviar Código';
            }
        };
        
        atualizarCountdown();
        countdownInterval = setInterval(atualizarCountdown, 1000);
    }

    // Etapa 1: Solicitar Token
    formSolicitarToken.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email-recuperacao').value;
        const erroEmail = document.getElementById('erro-email-recuperacao');
        
        // Limpar erros
        erroEmail.textContent = '';
        
        // Validar email
        if (!validarEmail(email)) {
            erroEmail.textContent = 'Por favor, insira um e-mail válido';
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/recuperar-senha/solicitar-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            
            if (response.ok) {
                emailUsuario = email;
                alert('Código de recuperação enviado para seu e-mail!');
                mostrarEtapa(etapaToken);
                iniciarCountdown();
            } else {
                erroEmail.textContent = data.message;
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao solicitar código de recuperação. Tente novamente.');
        }
    });

    // Etapa 2: Verificar Token
    formVerificarToken.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = document.getElementById('token-recuperacao').value;
        const erroToken = document.getElementById('erro-token');
        
        // Limpar erros
        erroToken.textContent = '';
        
        if (!token || token.length !== 6) {
            erroToken.textContent = 'Por favor, insira o código de 6 dígitos';
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/recuperar-senha/verificar-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: emailUsuario, token })
            });

            const data = await response.json();
            
            if (response.ok) {
                tokenValido = token;
                alert('Código verificado com sucesso!');
                mostrarEtapa(etapaSenha);
            } else {
                erroToken.textContent = data.message;
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao verificar código. Tente novamente.');
        }
    });

    // Reenviar token
    btnReenviarToken.addEventListener('click', async () => {
        if (btnReenviarToken.disabled) return;
        
        try {
            const response = await fetch('http://localhost:3001/api/recuperar-senha/solicitar-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: emailUsuario })
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('Novo código enviado para seu e-mail!');
                iniciarCountdown();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao reenviar código. Tente novamente.');
        }
    });

    // Etapa 3: Nova Senha
    formNovaSenha.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const novaSenha = document.getElementById('nova-senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;
        const erroNovaSenha = document.getElementById('erro-nova-senha');
        const erroConfirmarSenha = document.getElementById('erro-confirmar-senha');
        
        // Limpar erros
        erroNovaSenha.textContent = '';
        erroConfirmarSenha.textContent = '';
        
        // Validações
        if (novaSenha.length < 8) {
            erroNovaSenha.textContent = 'A senha deve ter no mínimo 8 caracteres';
            return;
        }
        
        if (novaSenha !== confirmarSenha) {
            erroConfirmarSenha.textContent = 'As senhas não coincidem';
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/recuperar-senha/alterar-senha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: emailUsuario, 
                    token: tokenValido, 
                    novaSenha 
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('Senha alterada com sucesso! Redirecionando para o login...');
                setTimeout(() => {
                    window.location.href = '../login/login.html';
                }, 2000);
            } else {
                if (data.field === 'token') {
                    alert('Token expirado. Solicitando novo código...');
                    mostrarEtapa(etapaToken);
                } else {
                    erroNovaSenha.textContent = data.message;
                }
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao alterar senha. Tente novamente.');
        }
    });

    // Validação em tempo real das senhas
    const novaSenhaInput = document.getElementById('nova-senha');
    const confirmarSenhaInput = document.getElementById('confirmar-senha');
    
    novaSenhaInput.addEventListener('input', () => {
        const senha = novaSenhaInput.value;
        const erroNovaSenha = document.getElementById('erro-nova-senha');
        
        if (senha.length > 0 && senha.length < 8) {
            erroNovaSenha.textContent = 'A senha deve ter no mínimo 8 caracteres';
        } else {
            erroNovaSenha.textContent = '';
        }
        
        // Verificar se as senhas coincidem
        if (confirmarSenhaInput.value && senha !== confirmarSenhaInput.value) {
            document.getElementById('erro-confirmar-senha').textContent = 'As senhas não coincidem';
        } else {
            document.getElementById('erro-confirmar-senha').textContent = '';
        }
    });
    
    confirmarSenhaInput.addEventListener('input', () => {
        const novaSenha = novaSenhaInput.value;
        const confirmarSenha = confirmarSenhaInput.value;
        const erroConfirmarSenha = document.getElementById('erro-confirmar-senha');
        
        if (confirmarSenha && novaSenha !== confirmarSenha) {
            erroConfirmarSenha.textContent = 'As senhas não coincidem';
        } else {
            erroConfirmarSenha.textContent = '';
        }
    });
});