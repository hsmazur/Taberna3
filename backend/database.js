const { Pool } = require('pg');

// Configuração da conexão com o banco de dados PostgreSQL
const dbConfig = {
  host: 'localhost',
  port: 5432, // Porta padrão do PostgreSQL
  
  user: 'postgres', // Usuário padrão do PostgreSQL (ajuste conforme necessário)
  password: 'hugo1611?',

  database: 'hugoMazurTaberna',
  // Configurações específicas do PostgreSQL
  ssl: false, // Defina como true se usar SSL
  idleTimeoutMillis: 30000, // Timeout para conexões ociosas
  connectionTimeoutMillis: 2000, // Timeout para estabelecer conexão
};

const schema = 'public'; // Defina o schema padrão


// Pool de conexões para melhor performance
const pool = new Pool({
  ...dbConfig,
  max: 10, // Máximo de conexões no pool (equivalente ao connectionLimit do MySQL)
  min: 0,  // Mínimo de conexões no pool
  idle: 10000, // Tempo em ms antes de fechar uma conexão ociosa
  acquire: 30000, // Tempo máximo em ms para tentar obter uma conexão
  evict: 1000 // Intervalo em ms para verificar conexões que devem ser removidas
});

// Tratamento de erros do pool
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões:', err);
  process.exit(-1);
});

// Função para testar a conexão
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Conectado ao PostgreSQL com sucesso!');

    // Definir o search_path para o schema peer
    await client.query('SET search_path TO ' + schema);

    client.release();
    return true;
  } catch (err) {
    console.error('Erro ao conectar com o PostgreSQL:', err);
    return false;
  }
};

// Função para executar queries com tratamento de erro
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    // Definir o search_path antes de executar a query
    await client.query('SET search_path TO peer, public');
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Erro ao executar query:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Função para transações
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET search_path TO peer, public');

    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro na transação:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};