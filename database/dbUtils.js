// database/dbUtils.js
import pool from './dbConfig.js'; // Importa o pool configurado

console.log("[dbUtils.js] Script carregado, definindo executeQuery e testConnection.");

/**
 * Testa a conexão com o banco de dados PostgreSQL e executa um SELECT NOW().
 * @returns {Promise<boolean>} True se a conexão e a query de teste forem bem-sucedidas.
 * @throws Erro se a conexão ou a query de teste falharem.
 */
export async function testConnection() {
  console.log("[dbUtils.js] Tentando testar conexão com PostgreSQL...");
  let client;
  try {
    client = await pool.connect();
    console.log('[dbUtils.js] Conectado com sucesso para teste!');
    const res = await client.query('SELECT NOW() AS data_hora_atual;');
    console.log('[dbUtils.js] Query de teste (SELECT NOW()) bem-sucedida:', res.rows[0]);
    return true;
  } catch (error) {
    console.error('[dbUtils.js] ERRO ao testar conexão com PostgreSQL:', error);
    throw error; // Re-lança o erro para ser tratado pela função chamadora no main.js
  } finally {
    if (client) {
      client.release();
      console.log("[dbUtils.js] Cliente de teste do pool liberado.");
    }
  }
}

/**
 * Executa uma query SQL no banco de dados PostgreSQL usando um cliente do pool.
 * @param {string} sql A string da query SQL.
 * @param {Array<any>} [params=[]] Um array de parâmetros para a query.
 * @returns {Promise<pg.QueryResult<any>>} O resultado da query.
 * @throws Erro se a query falhar.
 */
export async function executeQuery(sql, params = []) {
  let client;
  try {
    client = await pool.connect();
    // console.log(`[dbUtils.js] EXECUTANDO: ${sql.substring(0, 150).replace(/\s+/g, ' ')}... PARAMS:`, params);
    const result = await client.query(sql, params);
    return result;
  } catch (error) {
    console.error(`[dbUtils.js] ERRO AO EXECUTAR SQL: ${sql.substring(0,150).replace(/\s+/g, ' ')}...`);
    console.error(`[dbUtils.js] PARAMS: ${JSON.stringify(params)}`);
    console.error(`[dbUtils.js] MENSAGEM DE ERRO: ${error.message}`);
    console.error("[dbUtils.js] STACK DO ERRO:", error.stack);
    throw error; 
  } finally {
    if (client) {
      client.release();
    }
  }
}

console.log("[dbUtils.js] Funções executeQuery e testConnection exportadas.");