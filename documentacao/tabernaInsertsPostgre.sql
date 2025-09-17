-- ===========================================
-- INSERTS PARA A TABELA USUARIO
-- ===========================================

INSERT INTO usuario (id_usuario, nome_completo, email, senha) VALUES
(1, 'Hugo Mazur', 'hugomazur16@gmail.com', 'hugo1611?'),
(2, 'Breno Souza', 'breno.souza@email.com', 'abc123'),
(3, 'Carla Mendes', 'carla.mendes@email.com', 'carla2024'),
(4, 'Daniel Rocha', 'daniel.rocha@email.com', '123456'),
(5, 'Elisa Ramos', 'elisa.ramos@email.com', 'elisa789'),
(6, 'Felipe Lima', 'felipe.lima@email.com', 'flima2024'),
(7, 'Gabriela Costa', 'gabriela.costa@email.com', 'gcosta321'),
(8, 'Hugo Martins', 'hugo.martins@email.com', 'hugom123'),
(9, 'Ivana Teixeira', 'ivana.teixeira@email.com', 'ivana456'),
(10, 'João Silva', 'joao.silva@email.com', 'joao2024'),
(11, 'Neguin', 'charuto@gmail.com', 'cracudogyduryu6r')
ON CONFLICT (id_usuario) DO NOTHING;

-- ===========================================
-- MIGRAÇÃO PARA TABELAS CLIENTE E FUNCIONARIO
-- ===========================================

-- Migrar Hugo Mazur (gerente) para funcionário
INSERT INTO funcionario (id_usuario, cargo) 
SELECT id_usuario, 'gerente' 
FROM usuario 
WHERE email = 'hugomazur16@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM funcionario WHERE id_usuario = usuario.id_usuario
);

-- Migrar outros usuários para clientes
INSERT INTO cliente (id_usuario, telefone, endereco, bairro)
SELECT id_usuario, NULL, NULL, NULL
FROM usuario 
WHERE email IN (
    'breno.souza@email.com',
    'carla.mendes@email.com',
    'daniel.rocha@email.com',
    'elisa.ramos@email.com',
    'felipe.lima@email.com',
    'gabriela.costa@email.com',
    'hugo.martins@email.com',
    'ivana.teixeira@email.com',
    'joao.silva@email.com',
    'charuto@gmail.com'
)
AND NOT EXISTS (
    SELECT 1 FROM cliente WHERE id_usuario = usuario.id_usuario
)
AND NOT EXISTS (
    SELECT 1 FROM funcionario WHERE id_usuario = usuario.id_usuario
);

-- ===========================================
-- POPULAÇÃO DA TABELA PRODUTO - TABERNA DO DRAGÃO
-- ===========================================

INSERT INTO produto (nome_produto, descricao, preco_produto) VALUES
('Burger do Camponês', 'Pão rústico, hambúrguer bovino, queijo curado', 21.90),
('Burger do Cavaleiro', 'Pão, hambúrguer duplo, bacon defumado, queijo cheddar', 28.50),
('Burger da Donzela', 'Pão, hambúrguer de frango grelhado, maionese de alho', 23.00),
('Burger do Bardo', 'Pão, hambúrguer de bovino, cebola caramelizada', 26.90),
('Burger do Ferreiro', 'Pão australiano, hambúrguer robusto, queijo fundido, molho de pimenta', 29.00),
('Burger do Alquimista', 'Pão de especiarias, hambúrguer vegetal, cogumelos mágicos, molho especial', 25.50),
('Burger do Rei', 'Pão dourado, hambúrguer de picanha, folhas nobres, queijo brie', 34.90),
('Burger do Dragão', 'Pão de carvão, hambúrguer picante, queijo defumado, pimenta vermelha', 31.00),
('Burger do Monge', 'Pão, hambúrguer bovino, alface romana, azeite sagrado', 22.00),
('Burger da Feiticeira', 'Pão roxo, hambúrguer bovino, molho de ervas místicas', 24.50),
('Burger do Arqueiro', 'Pão rústico, hambúrguer de frango grelhado, folhas frescas da floresta, queijo de cabra', 27.90),
('Burger do Necromante', 'Pão escuro, hambúrguer duplo, cebola roxa em conserva, molho escuro de alho', 26.40);

-- ===========================================
-- AJUSTE DA SEQUÊNCIA DE ID_USUARIO
-- ===========================================

-- Verifica o maior ID atual e ajusta a sequência para o próximo valor
SELECT setval('usuario_id_usuario_seq', (SELECT MAX(id_usuario) FROM usuario));