// postgresService.js
import pg from 'pg';

console.log("[postgresService.js] Script carregado. vComQueriesPostgreSQL_Completo");

// CONFIGURAÇÕES DE CONEXÃO
const dbConfig = {
  user: 'xerife_user',        // Seu usuário dedicado
  host: 'localhost',          // Se o PostgreSQL estiver rodando na sua máquina local
  database: 'Xerife',         // O nome do banco de dados
  password: 'root',           // A SENHA QUE VOCÊ DEFINIU ("root")
  port: 5432,                 // Porta padrão do PostgreSQL
};

const pool = new pg.Pool(dbConfig);

pool.on('connect', () => {
  console.log('[postgresService.js] Conectado ao pool do PostgreSQL.');
});
pool.on('error', (err) => {
  console.error('[postgresService.js] ERRO INESPERADO no pool PostgreSQL:', err);
});

export async function connectPostgresDatabase() {
  console.log("[postgresService.js] Tentando conectar ao PostgreSQL...");
  try {
    const client = await pool.connect();
    console.log('[postgresService.js] Conectado com sucesso ao PostgreSQL!');
    const res = await client.query('SELECT NOW()');
    console.log('[postgresService.js] Query de teste (SELECT NOW()) bem-sucedida:', res.rows[0]);
    client.release();
    return true;
  } catch (error) {
    console.error('[postgresService.js] ERRO ao conectar ou testar query no PostgreSQL:', error);
    throw error;
  }
}

export async function createPostgresTables() {
  console.log("[postgresService.js] Verificando/Criando tabelas no PostgreSQL...");
  const client = await pool.connect();
  try {
    // Tabela Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('administrador', 'gerente', 'funcionario')),
        can_approve_purchase_orders BOOLEAN DEFAULT FALSE NOT NULL
      );
    `);
    console.log("[postgresService.js] Tabela 'users' verificada/criada.");

    // Tabela Pecas
    await client.query(`
      CREATE TABLE IF NOT EXISTS pecas (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        tipo TEXT,
        fabricante TEXT,
        estoque_atual INTEGER DEFAULT 0,
        estoque_minimo INTEGER DEFAULT 0
        -- Se você tiver chaves estrangeiras, adicione-as aqui. Ex:
        -- id_fornecedor INTEGER REFERENCES fornecedores(id)
      );
    `);
    console.log("[postgresService.js] Tabela 'pecas' verificada/criada.");

    // Adicione aqui CREATE TABLE para outras tabelas do seu modelo (Fornecedores, etc.)
    // que virão das suas planilhas.

  } catch (error) {
    console.error('[postgresService.js] ERRO ao criar tabelas no PostgreSQL:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Função genérica para executar queries (útil, mas usaremos mais específicas)
async function executeQuery(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } catch (error) {
    console.error(`[postgresService.js] ERRO SQL: ${sql} | PARAMS: ${params} | MSG: ${error.message}`, error);
    throw error;
  } finally {
    client.release();
  }
}

// --- Funções para 'pecas' ---
export async function getAllPecas() {
  console.log("[postgresService.js] getAllPecas: Buscando todas as peças...");
  const result = await executeQuery("SELECT * FROM pecas ORDER BY nome ASC;");
  console.log("[postgresService.js] getAllPecas: Encontradas", result.rowCount, "peças.");
  return result.rows || [];
}

export async function insertPeca(peca) {
  console.log("[postgresService.js] insertPeca: Inserindo peça:", peca);
  const { nome, tipo, fabricante, estoque_atual, estoque_minimo } = peca;
  const qNome = nome ? String(nome).trim() : '';
  if (!qNome) throw new Error("Nome da peça é obrigatório.");
  
  const sql = `
    INSERT INTO pecas (nome, tipo, fabricante, estoque_atual, estoque_minimo) 
    VALUES ($1, $2, $3, $4, $5) 
    RETURNING *;`; // RETURNING * retorna a linha inserida
  const params = [
    qNome,
    tipo || null, // Permite nulo se não fornecido
    fabricante || null,
    Number.isFinite(parseInt(estoque_atual)) ? parseInt(estoque_atual) : 0,
    Number.isFinite(parseInt(estoque_minimo)) ? parseInt(estoque_minimo) : 0
  ];
  try {
    const result = await executeQuery(sql, params);
    console.log("[postgresService.js] insertPeca: Peça inserida:", result.rows[0]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'pecas_nome_key') { // Código de erro do PostgreSQL para violação de UNIQUE
      throw new Error(`Já existe uma peça com o nome '${qNome}'.`);
    }
    throw error;
  }
}

export async function updatePeca(id, peca) {
  console.log("[postgresService.js] updatePeca: Atualizando peça ID:", id, "Dados:", peca);
  const { nome, tipo, fabricante, estoque_atual, estoque_minimo } = peca;
  const qNome = nome ? String(nome).trim() : '';
  if (!qNome) throw new Error("Nome da peça é obrigatório.");

  const sql = `
    UPDATE pecas 
    SET nome = $1, tipo = $2, fabricante = $3, estoque_atual = $4, estoque_minimo = $5 
    WHERE id = $6 
    RETURNING *;`;
  const params = [
    qNome,
    tipo || null,
    fabricante || null,
    Number.isFinite(parseInt(estoque_atual)) ? parseInt(estoque_atual) : 0,
    Number.isFinite(parseInt(estoque_minimo)) ? parseInt(estoque_minimo) : 0,
    id
  ];
  try {
    const result = await executeQuery(sql, params);
    if (result.rowCount === 0) throw new Error(`Peça com ID ${id} não encontrada para atualização.`);
    console.log("[postgresService.js] updatePeca: Peça atualizada:", result.rows[0]);
    return result.rows[0]; // Ou { changes: result.rowCount } se preferir
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'pecas_nome_key') {
      throw new Error(`Já existe outra peça com o nome '${qNome}'.`);
    }
    throw error;
  }
}

export async function deletePeca(id) {
  console.log("[postgresService.js] deletePeca: Deletando peça ID:", id);
  const sql = "DELETE FROM pecas WHERE id = $1 RETURNING id;";
  const result = await executeQuery(sql, [id]);
  if (result.rowCount === 0) throw new Error(`Peça com ID ${id} não encontrada para exclusão.`);
  console.log("[postgresService.js] deletePeca: Peça ID", id, "deletada.");
  return { changes: result.rowCount };
}

export async function getRequestedPecas() {
  console.log("[postgresService.js] getRequestedPecas: Buscando peças para gráfico...");
  const sql = `SELECT nome, estoque_atual, estoque_minimo FROM pecas ORDER BY nome ASC`;
  const result = await executeQuery(sql);
  const formattedRows = (result.rows || []).map(r => ({
      nome: r.nome,
      quantidade: r.estoque_atual,
      estoque_atual: r.estoque_atual,
      estoque_minimo: r.estoque_minimo
  }));
  console.log("[postgresService.js] getRequestedPecas: Encontradas", formattedRows.length, "peças.");
  return formattedRows;
}

// --- Funções para USUÁRIOS ---
export async function findUserByUsername(username) {
  console.log("[postgresService.js] findUserByUsername: Buscando usuário:", username);
  const sql = `
    SELECT id, username, password_hash, role, can_approve_purchase_orders 
    FROM users WHERE username = $1;`;
  const result = await executeQuery(sql, [username]);
  return result.rows[0]; // Retorna o usuário ou undefined
}

export async function insertUser(username, passwordHash, role, canApproveOrders = 0) {
  console.log("[postgresService.js] insertUser: Inserindo usuário:", {username, role, canApproveOrders});
  const sql = `
    INSERT INTO users (username, password_hash, role, can_approve_purchase_orders) 
    VALUES ($1, $2, $3, $4) 
    RETURNING id, username, role, can_approve_purchase_orders;`;
  const params = [
    username, 
    passwordHash, 
    role, 
    canApproveOrders ? true : false // Converte para boolean para PostgreSQL
  ];
  try {
    const result = await executeQuery(sql, params);
    console.log("[postgresService.js] insertUser: Usuário inserido:", result.rows[0]);
    return result.rows[0];
  } catch (error) {
     if (error.code === '23505' && error.constraint === 'users_username_key') { // 'users_username_key' é o nome padrão da constraint UNIQUE no PostgreSQL
      throw new Error(`Nome de usuário '${username}' já existe.`);
    }
    throw error;
  }
}

export async function getAllUsers() {
  console.log("[postgresService.js] getAllUsers: Buscando todos os usuários...");
  const sql = `SELECT id, username, role, can_approve_purchase_orders FROM users ORDER BY username ASC;`;
  const result = await executeQuery(sql);
  console.log("[postgresService.js] getAllUsers: Encontrados", result.rowCount, "usuários.");
  return result.rows || [];
}

export async function getUsersByRole(role) {
  console.log("[postgresService.js] getUsersByRole: Buscando usuários com papel:", role);
  const sql = `
    SELECT id, username, role, can_approve_purchase_orders 
    FROM users WHERE role = $1 ORDER BY username ASC;`;
  const result = await executeQuery(sql, [role]);
  console.log("[postgresService.js] getUsersByRole: Encontrados", result.rowCount, "usuários com papel", role);
  return result.rows || [];
}

export async function updateUserPassword(userId, newPasswordHash) {
  console.log("[postgresService.js] updateUserPassword: Atualizando senha para UserID:", userId);
  const sql = `UPDATE users SET password_hash = $1 WHERE id = $2;`;
  const result = await executeQuery(sql, [newPasswordHash, userId]);
  if (result.rowCount === 0) throw new Error(`Usuário com ID ${userId} não encontrado para atualização de senha.`);
  console.log("[postgresService.js] updateUserPassword: Senha atualizada para UserID:", userId);
  return { changes: result.rowCount };
}

export async function updateUserFullDetails(userId, { username, role, can_approve_purchase_orders }) {
  console.log("[postgresService.js] updateUserFullDetails: Atualizando UserID:", userId, "Dados:", { username, role, can_approve_purchase_orders });
  
  let updateFields = [];
  let params = [];
  let paramCount = 1;

  if (username !== undefined) {
    updateFields.push(`username = $${paramCount++}`);
    params.push(String(username).trim());
  }
  if (role !== undefined) {
    updateFields.push(`role = $${paramCount++}`);
    params.push(role);
  }
  if (can_approve_purchase_orders !== undefined) {
    updateFields.push(`can_approve_purchase_orders = $${paramCount++}`);
    params.push(can_approve_purchase_orders ? true : false);
  }

  if (updateFields.length === 0) {
    console.warn("[postgresService.js] updateUserFullDetails: Nenhum campo para atualizar.");
    return { changes: 0, message: "Nenhum dado para atualizar." };
  }

  params.push(userId); // Adiciona o ID do usuário ao final para o WHERE
  const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${paramCount} RETURNING *;`;
  
  console.log("[postgresService.js] updateUserFullDetails - SQL:", sql, "Params:", params);
  try {
    const result = await executeQuery(sql, params);
    if (result.rowCount === 0) throw new Error(`Usuário com ID ${userId} não encontrado.`);
    console.log("[postgresService.js] updateUserFullDetails: Usuário atualizado:", result.rows[0]);
    return result.rows[0]; // Ou { changes: result.rowCount }
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'users_username_key') {
      throw new Error(`Nome de usuário '${username}' já está em uso.`);
    }
    throw error;
  }
}

export async function adminResetUserPassword(targetUserId, newPasswordHash) {
  console.log("[postgresService.js] adminResetUserPassword: Resetando senha para UserID:", targetUserId);
  const sql = `UPDATE users SET password_hash = $1 WHERE id = $2;`;
  const result = await executeQuery(sql, [newPasswordHash, targetUserId]);
  if (result.rowCount === 0) throw new Error(`Usuário alvo com ID ${targetUserId} não encontrado.`);
  console.log("[postgresService.js] adminResetUserPassword: Senha resetada para UserID:", targetUserId);
  return { changes: result.rowCount };
}

export async function deleteUser(id) {
  console.log("[postgresService.js] deleteUser: Deletando UserID:", id);
  const sql = "DELETE FROM users WHERE id = $1 RETURNING id;";
  const result = await executeQuery(sql, [id]);
  if (result.rowCount === 0) throw new Error(`Usuário com ID ${id} não encontrado para exclusão.`);
  console.log("[postgresService.js] deleteUser: Usuário ID", id, "deletado.");
  return { changes: result.rowCount };
}

console.log("[postgresService.js] Fim do script. Funções exportadas para PostgreSQL.");