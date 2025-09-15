document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-login');
    const erroEmail = document.getElementById('erro-email');
    const erroSenha = document.getElementById('erro-senha');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        erroEmail.textContent = '';
        erroSenha.textContent = '';

        if (!email) {
            erroEmail.textContent = 'Por favor, insira seu e-mail';
            return;
        }

        if (!senha) {
            erroSenha.textContent = 'Por favor, insira sua senha';
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha }),
                credentials: 'include'
            });

            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('usuario', JSON.stringify({
                    id: data.usuario.id,
                    nome: data.usuario.nome,
                    email: data.usuario.email,
                    tipo: data.usuario.tipo
                }));

                // Verifica se há redirecionamento
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');

                alert(`${data.message}\nBem-vindo de volta, ${data.usuario.nome}!`);
                window.location.href = redirect ? `${redirect}.html` : '../menu.html';
            } else {
                if (response.status === 404) {
                    erroEmail.textContent = data.message;
                } else if (response.status === 401) {
                    erroSenha.textContent = data.message;
                } else {
                    throw new Error(data.message || 'Erro no login');
                }
            }

        } catch (error) {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.');
        }
    });
});