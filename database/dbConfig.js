// database/dbConfig.js
import pg from 'pg';

console.log("[dbConfig.js] Configurando pool de conexão PostgreSQL.");

const dbConfig = {
  user: 'xerife_user',        // Seu usuário do PostgreSQL
  host: 'localhost',          // Host do seu servidor PostgreSQL
  database: 'Xerife',         // Nome do banco de dados
  password: 'root',           // Senha do seu usuário 'xerife_user'
  port: 5432,                 // Porta padrão do PostgreSQL
  // ssl: { rejectUnauthorized: false } // Descomente/ajuste se precisar de SSL
};

const pool = new pg.Pool(dbConfig);

pool.on('connect', (client) => {
  // console.log('[dbConfig.js] Cliente conectado ao pool do PostgreSQL.'); // Log opcional
});

pool.on('error', (err, client) => {
  console.error('[dbConfig.js] ERRO INESPERADO no cliente do pool PostgreSQL:', err);
  // Em um ambiente de produção, você pode querer tratar isso de forma mais robusta
});

console.log("[dbConfig.js] Pool de conexão PostgreSQL configurado e exportado.");

export default pool;