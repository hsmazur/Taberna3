-- ===========================================
-- SCRIPT DE CRIAÇÃO - TABERNA DO DRAGÃO
-- ===========================================

SET search_path TO public;

-- ========================
-- Usuário (base de autenticação)
-- ========================
CREATE TABLE usuario (
  id_usuario SERIAL PRIMARY KEY,
  nome_completo VARCHAR(150) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL
);

-- ========================
-- Perfil (dados adicionais do usuário) - 1:1
-- ========================
CREATE TABLE cliente (
  id_cliente SERIAL PRIMARY KEY,
  id_usuario INT UNIQUE, -- UNIQUE garante 1:1
  telefone VARCHAR(20),
  endereco VARCHAR(200),
  bairro VARCHAR(100)
);

-- ========================
-- Perfil (dados adicionais do usuário) - 1:1
-- ========================
CREATE TABLE funcionario (
  id_funcionario SERIAL PRIMARY KEY,
  id_usuario INT UNIQUE, -- UNIQUE garante 1:1
  cargo VARCHAR(100)
);

-- ========================
-- Produto (tabela isolada)
-- ========================
CREATE TABLE produto (
  id_produto SERIAL PRIMARY KEY,
  nome_produto VARCHAR(100) NOT NULL,
  descricao TEXT,
  preco_produto DECIMAL(10,2) NOT NULL
);

-- ========================
-- Avaliação (1:N -> Produto)
-- ========================
CREATE TABLE avaliacao (
  id_avaliacao SERIAL PRIMARY KEY,
  id_produto INT NOT NULL,
  id_usuario INT NOT NULL,
  nota INT CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- Pedido (1:N -> Usuário)
-- ========================
CREATE TABLE pedido (
  id_pedido SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL,
  data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  pagamento VARCHAR(50) DEFAULT 'Pendente',
  valor_total DECIMAL(10,2) DEFAULT 0
);

-- ========================
-- Pedido_Produto (N:M)
-- ========================
CREATE TABLE pedido_produto (
  id_pedido INT NOT NULL,
  id_produto INT NOT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id_pedido, id_produto)
);

-- ========================
-- CONSTRAINTS (adicionadas no final)
-- ========================

-- Cliente ↔ Usuario (1:1)
ALTER TABLE cliente ADD CONSTRAINT fk_cliente_usuario
  FOREIGN KEY (id_usuario)
  REFERENCES usuario (id_usuario)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Funcionario ↔ Usuario (1:1)
ALTER TABLE funcionario ADD CONSTRAINT fk_funcionario_usuario
  FOREIGN KEY (id_usuario)
  REFERENCES usuario (id_usuario)
  ON DELETE CASCADE ON UPDATE CASCADE;  

-- Avaliacao ↔ Produto (1:N)
ALTER TABLE avaliacao ADD CONSTRAINT fk_avaliacao_produto
  FOREIGN KEY (id_produto)
  REFERENCES produto (id_produto)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Avaliacao ↔ Usuario (quem avaliou)
ALTER TABLE avaliacao ADD CONSTRAINT fk_avaliacao_usuario
  FOREIGN KEY (id_usuario)
  REFERENCES usuario (id_usuario)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Pedido ↔ Usuario (1:N)
ALTER TABLE pedido ADD CONSTRAINT fk_pedido_usuario
  FOREIGN KEY (id_usuario)
  REFERENCES usuario (id_usuario)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Pedido_Produto ↔ Pedido
ALTER TABLE pedido_produto ADD CONSTRAINT fk_pedidoproduto_pedido
  FOREIGN KEY (id_pedido)
  REFERENCES pedido (id_pedido)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Pedido_Produto ↔ Produto
ALTER TABLE pedido_produto ADD CONSTRAINT fk_pedidoproduto_produto
  FOREIGN KEY (id_produto)
  REFERENCES produto (id_produto)
  ON DELETE CASCADE ON UPDATE CASCADE;
