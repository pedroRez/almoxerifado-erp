// database/dbConfig.js
import pg from 'pg';

console.log("[dbConfig.js] Configurando pool de conexão PostgreSQL.");

const dbCredentials = {
  user: 'xerife_user',        // Seu usuário do PostgreSQL
  host: 'localhost',          // Host do seu servidor PostgreSQL
  database: 'Xerife',         // Nome do banco de dados
  password: 'root',           // Senha do seu usuário 'xerife_user' (ATENÇÃO: Mude para produção)
  port: 5432,                 // Porta padrão do PostgreSQL
  // ssl: { rejectUnauthorized: false } // Descomente/ajuste se precisar de SSL para um servidor remoto
};

const pool = new pg.Pool(dbCredentials);

pool.on('connect', (client) => {
  // console.log('[dbConfig.js] Cliente conectado ao pool do PostgreSQL.'); 
});

pool.on('error', (err, client) => {
  console.error('[dbConfig.js] ERRO INESPERADO no cliente ocioso do pool PostgreSQL:', err);
});

console.log("[dbConfig.js] Pool de conexão PostgreSQL configurado e pronto para ser exportado.");

export default pool;