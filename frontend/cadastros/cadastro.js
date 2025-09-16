document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-cadastro');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;

        if (senha !== confirmarSenha) {
            alert('As senhas não coincidem!');
            return;
        }

        if (senha.length < 8) {
            alert('A senha deve ter no mínimo 8 caracteres');
            return;
        }

        try {
            console.log('Enviando dados:', { nome, email, senha: '***' });
            
            // 1. Faz o cadastro (apenas com dados básicos)
            const cadastroResponse = await fetch('http://localhost:3001/cadastrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nome, 
                    email, 
                    senha 
                    // Os outros campos (telefone, endereco, bairro, tipo) serão null/undefined
                    // O backend vai tratar como padrão 'cliente' e campos opcionais
                }),
                credentials: 'include'
            });

            console.log('Status da resposta:', cadastroResponse.status);
            
            const cadastroData = await cadastroResponse.json();
            console.log('Dados da resposta:', cadastroData);

            if (!cadastroResponse.ok) {
                throw new Error(cadastroData.message || `Erro HTTP: ${cadastroResponse.status}`);
            }

            // Salva os dados do usuário no localStorage para manter a sessão
            localStorage.setItem('usuario', JSON.stringify({
                id: cadastroData.usuario.id,
                nome: cadastroData.usuario.nome,
                email: cadastroData.usuario.email,
                tipo: cadastroData.usuario.tipo
            }));

            alert(`Cadastro realizado com sucesso!\nBem-vindo, ${cadastroData.usuario.nome}!`);

            // Redireciona para a página principal já logado
            window.location.href = '../menu.html';

        } catch (error) {
            console.error('Erro completo:', error);
            alert(`Erro no cadastro: ${error.message}`);
        }
    });
});