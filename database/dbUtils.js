// database/dbUtils.js
import pool from './dbConfig.js'; // Importa o pool configurado

console.log("[dbUtils.js] Script carregado, definindo executeQuery e testConnection.");

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
    throw error; 
  } finally {
    if (client) {
      client.release();
      // console.log("[dbUtils.js] Cliente de teste do pool liberado.");
    }
  }
}

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