// postgresService.js
import pg from 'pg';
// path e app podem não ser estritamente necessários aqui se dbPath for fixo ou configurado de outra forma,
// mas mantê-los não prejudica e pode ser útil para futuras referências.
// import path from 'path'; 
// import { app } from 'electron'; 

console.log("[postgresService.js] Script carregado. vFinal_Completo_SemOmissao");

// CONFIGURAÇÕES DE CONEXÃO - AJUSTE PARA SEU AMBIENTE POSTGRESQL
const dbConfig = {
  user: 'xerife_user',
  host: 'localhost',
  database: 'Xerife',
  password: 'root', // Sua senha para xerife_user
  port: 5432,
};

const pool = new pg.Pool(dbConfig);

pool.on('connect', (client) => {
  console.log('[postgresService.js] Cliente conectado ao pool do PostgreSQL.');
});
pool.on('error', (err) => {
  console.error('[postgresService.js] ERRO INESPERADO no pool PostgreSQL:', err);
});

export async function connectPostgresDatabase() {
  console.log("[postgresService.js] Tentando conectar ao PostgreSQL...");
  let client;
  try {
    client = await pool.connect();
    console.log('[postgresService.js] Conectado com sucesso ao PostgreSQL!');
    const res = await client.query('SELECT NOW() AS data_hora_atual;');
    console.log('[postgresService.js] Query de teste (SELECT NOW()) bem-sucedida:', res.rows[0]);
    return true;
  } catch (error) {
    console.error('[postgresService.js] ERRO ao conectar ou testar query no PostgreSQL:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function createPostgresTables() {
  console.log("[postgresService.js] Verificando existência das tabelas (APENAS TABELAS)...");
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('administrador', 'gerente', 'funcionario')),
        can_approve_purchase_orders BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMPTZ,
        deleted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      );`);
    console.log("[postgresService.js] Tabela 'users' verificada.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS estoque (
        codigo_fixo TEXT PRIMARY KEY NOT NULL, id_sync UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
        codigo_peca TEXT, classificacao TEXT, descricao TEXT NOT NULL, aplicacao TEXT, fabricante TEXT,
        estoque_atual INTEGER DEFAULT 0 NOT NULL, estoque_minimo INTEGER DEFAULT 0 NOT NULL,
        estoque_inicial INTEGER DEFAULT 0, 
        data_lancamento DATE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL, created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
        deleted_at TIMESTAMPTZ, deleted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT uq_peca_identificacao UNIQUE (codigo_peca, descricao, fabricante)
      );`);
    console.log("[postgresService.js] Tabela 'estoque' verificada.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id_movimentacao SERIAL PRIMARY KEY, id_item_estoque_sync UUID NOT NULL REFERENCES estoque(id_sync) ON DELETE RESTRICT,
        tipo_movimentacao TEXT NOT NULL CHECK(tipo_movimentacao IN ('entrada_compra', 'saida_requisicao', 'ajuste_entrada', 'ajuste_saida', 'saldo_inicial')),
        quantidade INTEGER NOT NULL, data_movimentacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        usuario_id INTEGER REFERENCES users(id) ON DELETE SET NULL, observacao TEXT, documento_referencia TEXT, 
        custo_unitario_movimentacao NUMERIC(12, 4) DEFAULT 0.0000, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );`);
    console.log("[postgresService.js] Tabela 'movimentacoes_estoque' verificada.");
    
    await client.query('COMMIT');
    console.log("[postgresService.js] Verificação de tabelas concluída.");

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[postgresService.js] ERRO ao verificar/criar tabelas (versão simplificada):', error);
    throw error;
  } finally {
    client.release();
  }
}

async function executeQuery(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } catch (error) {
    console.error(`[postgresService.js] ERRO SQL: ${sql.substring(0,100)}... | PARAMS: ${params} | MSG: ${error.message}`, error.stack);
    throw error;
  } finally {
    client.release();
  }
}

// --- Funções para 'estoque' (anteriormente 'pecas') ---
export async function getAllPecas() {
  console.log("[postgresService.js] getAllPecas: Buscando todos os itens do estoque...");
  const result = await executeQuery("SELECT *, id_sync as id, TO_CHAR(data_lancamento, 'YYYY-MM-DD') as data_lancamento_formatada FROM estoque WHERE is_deleted = FALSE ORDER BY descricao ASC;");
  console.log("[postgresService.js] getAllPecas: Encontrados", result.rowCount, "itens.");
  return (result.rows || []).map(row => ({...row, data_lancamento: row.data_lancamento_formatada}));
}

export async function insertPeca(itemEstoque) {
  console.log("[postgresService.js] insertPeca: Inserindo novo item no estoque:", itemEstoque);
  const { 
    nome, tipo, fabricante, estoque_atual, estoque_minimo,
    // codigo_fixo não é mais esperado do frontend para novos itens
    codigo_peca, aplicacao, data_lancamento,
    valor_medio_unitario, // Custo do saldo inicial
    usuario_id 
   } = itemEstoque;

  const descricaoItem = nome; 
  const classificacaoItem = tipo; 

  if (!String(descricaoItem).trim()) throw new Error("Descrição (Nome da Peça) é obrigatória.");

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Gerar o codigo_fixo a partir da sequência SEMPRE para novos itens
    const seqRes = await client.query("SELECT nextval('codigo_fixo_estoque_seq') as next_code;");
    const nextNum = seqRes.rows[0].next_code;
    const codigoFixoGerado = String(nextNum).padStart(5, '0'); // Formata para 5 dígitos
    console.log("[postgresService.js] insertPeca: Gerado novo codigo_fixo da sequência:", codigoFixoGerado);

    const checkExisting = await client.query("SELECT 1 FROM estoque WHERE codigo_fixo = $1", [codigoFixoGerado]);
    if (checkExisting.rowCount > 0) {
      throw new Error(`Código Fixo '${codigoFixoGerado}' gerado automaticamente já existe. Conflito de sequência.`);
    }

    const sqlEstoque = `
      INSERT INTO estoque (
        codigo_fixo, codigo_peca, classificacao, descricao, aplicacao, fabricante, 
        estoque_atual, estoque_minimo, estoque_inicial, data_lancamento,
        created_by_user_id, updated_by_user_id
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11) 
      RETURNING *, id_sync as id, TO_CHAR(data_lancamento, 'YYYY-MM-DD') as data_lancamento_formatada;`;
    
    const estoqueInicialParaTabela = Number.isFinite(parseInt(estoque_atual)) ? parseInt(estoque_atual) : 0;
    const dataLancamentoFinal = data_lancamento ? data_lancamento : null;

    const paramsEstoque = [
      codigoFixoGerado, codigo_peca || null, classificacaoItem || null, String(descricaoItem).trim(),
      aplicacao || null, fabricante || null,
      0, 
      Number.isFinite(parseInt(estoque_minimo)) ? parseInt(estoque_minimo) : 0,
      estoqueInicialParaTabela, 
      dataLancamentoFinal,
      usuario_id 
    ];
    const resultEstoque = await client.query(sqlEstoque, paramsEstoque);
    const novoItemDb = resultEstoque.rows[0];
    let novoItem = {...novoItemDb, data_lancamento: novoItemDb.data_lancamento_formatada};
    console.log("[postgresService.js] insertPeca: Item inserido na tabela 'estoque':", novoItem);

    if (estoqueInicialParaTabela >= 0) {
        const sqlMovimentacao = `
            INSERT INTO movimentacoes_estoque 
              (id_item_estoque_sync, tipo_movimentacao, quantidade, custo_unitario_movimentacao, usuario_id, observacao, documento_referencia)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_movimentacao;
        `;
        const custoSaldoInicial = Number.isFinite(parseFloat(valor_medio_unitario)) ? parseFloat(valor_medio_unitario) : 0.0000;
        const paramsMovimentacao = [
            novoItem.id_sync, 'saldo_inicial', estoqueInicialParaTabela, custoSaldoInicial,
            usuario_id, 'Saldo inicial do cadastro da peça', `CAD-${codigoFixoGerado}`
        ];
        const resMov = await client.query(sqlMovimentacao, paramsMovimentacao);
        console.log("[postgresService.js] insertPeca: Movimentação de saldo inicial registrada ID:", resMov.rows[0].id_movimentacao);
    }

    await client.query('COMMIT');
    // Busca final para retornar com o estoque_atual atualizado pela trigger
    const finalItemResult = await client.query("SELECT *, id_sync as id, TO_CHAR(data_lancamento, 'YYYY-MM-DD') as data_lancamento_formatada FROM estoque WHERE id_sync = $1 AND is_deleted = FALSE", [novoItem.id_sync]);
    if (finalItemResult.rows.length === 0) {
        throw new Error("Falha ao buscar o item recém-inserido após a movimentação inicial (pós-commit).");
    }
    novoItem = {...finalItemResult.rows[0], data_lancamento: finalItemResult.rows[0].data_lancamento_formatada};
    return novoItem;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("[postgresService.js] Erro em insertPeca (transação):", error.message, error.stack);
    if (error.code === '23505') { 
        if (error.constraint === 'estoque_pkey') throw new Error(`Código Fixo '${codigoFixoGerado}' gerado automaticamente já existe (erro raro).`);
        if (error.constraint === 'uq_peca_identificacao') throw new Error(`A combinação de Código Peça ('${codigo_peca}'), Descrição ('${descricaoItem}') e Fabricante ('${fabricante}') já existe.`);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePeca(id_sync_param, itemEstoque) {
  console.log("[postgresService.js] updatePeca: Atualizando item ID_SYNC:", id_sync_param, "Dados:", itemEstoque);
  const { 
    nome, tipo, fabricante, estoque_minimo,
    codigo_peca, aplicacao, data_lancamento,
    usuario_id 
  } = itemEstoque;

  const descricaoItem = nome;
  const classificacaoItem = tipo;

  if (!String(descricaoItem).trim()) throw new Error("Descrição (Nome da Peça) é obrigatória.");
  const dataLancamentoFinal = data_lancamento ? data_lancamento : null;

  const sql = `
    UPDATE estoque 
    SET codigo_peca = $1, classificacao = $2, descricao = $3, aplicacao = $4, fabricante = $5, 
        estoque_minimo = $6, data_lancamento = $7, updated_by_user_id = $8
        /* updated_at é atualizado pela trigger trigger_set_timestamp_geral */
    WHERE id_sync = $9 AND is_deleted = FALSE
    RETURNING *, id_sync as id, TO_CHAR(data_lancamento, 'YYYY-MM-DD') as data_lancamento_formatada;`; 
  const params = [
    codigo_peca || null, classificacaoItem || null, String(descricaoItem).trim(), aplicacao || null, fabricante || null,
    Number.isFinite(parseInt(estoque_minimo)) ? parseInt(estoque_minimo) : 0,
    dataLancamentoFinal,
    usuario_id,
    id_sync_param
  ];
  try {
    const result = await executeQuery(sql, params);
    if (result.rowCount === 0) throw new Error(`Item com ID ${id_sync_param} não encontrado ou já deletado, para atualização.`);
    const itemAtualizado = {...result.rows[0], data_lancamento: result.rows[0].data_lancamento_formatada};
    console.log("[postgresService.js] updatePeca: Item atualizado:", itemAtualizado);
    return itemAtualizado;
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'uq_peca_identificacao') {
      throw new Error(`A combinação de Código Peça, Descrição e Fabricante já existe para outro item.`);
    }
    throw error;
  }
}

export async function deletePeca(id_sync_param, usuario_id_delecao) {
  console.log("[postgresService.js] deletePeca: Marcando item ID_SYNC como deletado:", id_sync_param);
  const sql = `
    UPDATE estoque 
    SET is_deleted = TRUE, deleted_at = NOW(), deleted_by_user_id = $1
        /* updated_at é atualizado pela trigger trigger_set_timestamp_geral */
    WHERE id_sync = $2 AND is_deleted = FALSE 
    RETURNING id_sync;`;
  const params = [ usuario_id_delecao, id_sync_param ];
  const result = await executeQuery(sql, params);
  if (result.rowCount === 0) throw new Error(`Item com ID ${id_sync_param} não encontrado ou já marcado como deletado.`);
  console.log("[postgresService.js] deletePeca: Item ID_SYNC", id_sync_param, "marcado como deletado.");
  return { changes: result.rowCount };
}

export async function getRequestedPecas() {
  console.log("[postgresService.js] getRequestedPecas: Buscando peças para gráfico...");
  const sql = `SELECT descricao as nome, estoque_atual, estoque_minimo, TO_CHAR(data_lancamento, 'YYYY-MM-DD') as data_lancamento_formatada FROM estoque WHERE is_deleted = FALSE ORDER BY nome ASC`;
  const result = await executeQuery(sql);
  const formattedRows = (result.rows || []).map(r => ({
      nome: r.nome,
      quantidade: r.estoque_atual,
      estoque_atual: r.estoque_atual,
      estoque_minimo: r.estoque_minimo,
      data_lancamento: r.data_lancamento_formatada
  }));
  console.log("[postgresService.js] getRequestedPecas: Encontradas", formattedRows.length, "peças.");
  return formattedRows;
}

// --- Funções para USUÁRIOS ---
export async function findUserByUsername(username) {
  console.log("[postgresService.js] findUserByUsername: Buscando usuário:", username);
  const sql = `SELECT id, username, password_hash, role, can_approve_purchase_orders FROM users WHERE username = $1 AND is_deleted = FALSE;`;
  const result = await executeQuery(sql, [username]);
  return result.rows[0];
}

export async function insertUser(username, passwordHash, role, canApproveOrders = 0, creatorUserId = null) {
  console.log("[postgresService.js] insertUser: Inserindo usuário:", {username, role, canApproveOrders, creatorUserId});
  const sql = `
    INSERT INTO users (username, password_hash, role, can_approve_purchase_orders, created_by_user_id, updated_by_user_id) 
    VALUES ($1, $2, $3, $4, $5, $5) 
    RETURNING id, username, role, can_approve_purchase_orders;`;
  const params = [ username, passwordHash, role, canApproveOrders ? true : false, creatorUserId ];
  try {
    const result = await executeQuery(sql, params);
    console.log("[postgresService.js] insertUser: Usuário inserido:", result.rows[0]);
    return result.rows[0];
  } catch (error) {
     if (error.code === '23505' && (error.constraint === 'users_username_key' || error.constraint === 'users_username_idx')) {
      throw new Error(`Nome de usuário '${username}' já existe.`);
    }
    throw error;
  }
}

export async function getAllUsers() {
  console.log("[postgresService.js] getAllUsers: Buscando todos os usuários não deletados...");
  const sql = `SELECT id, username, role, can_approve_purchase_orders FROM users WHERE is_deleted = FALSE ORDER BY username ASC;`;
  const result = await executeQuery(sql);
  console.log("[postgresService.js] getAllUsers: Encontrados", result.rowCount, "usuários.");
  return result.rows || [];
}

export async function getUsersByRole(role) {
  console.log("[postgresService.js] getUsersByRole: Buscando usuários com papel:", role);
  const sql = `
    SELECT id, username, role, can_approve_purchase_orders 
    FROM users WHERE role = $1 AND is_deleted = FALSE ORDER BY username ASC;`;
  const result = await executeQuery(sql, [role]);
  console.log("[postgresService.js] getUsersByRole: Encontrados", result.rowCount, "usuários com papel", role);
  return result.rows || [];
}

export async function updateUserPassword(userId, newPasswordHash) {
  console.log("[postgresService.js] updateUserPassword: Atualizando senha para UserID:", userId);
  const sql = `UPDATE users SET password_hash = $1 /* updated_at é pela trigger */ WHERE id = $2 AND is_deleted = FALSE;`;
  const result = await executeQuery(sql, [newPasswordHash, userId]);
  if (result.rowCount === 0) throw new Error(`Usuário com ID ${userId} não encontrado ou já deletado.`);
  console.log("[postgresService.js] updateUserPassword: Senha atualizada para UserID:", userId);
  return { changes: result.rowCount };
}

export async function updateUserFullDetails(userId, { username, role, can_approve_purchase_orders, updated_by_user_id }) {
  console.log(`[postgresService.js] updateUserFullDetails para UserID: ${userId}. Dados:`, { username, role, can_approve_purchase_orders, updated_by_user_id });
  
  let updateFields = [];
  let params = [];
  let paramCount = 1;

  if (username !== undefined) {
    const trimmedUsername = String(username).trim();
    if (!trimmedUsername) throw new Error("Nome de usuário não pode ser vazio ao atualizar.");
    updateFields.push(`username = $${paramCount++}`);
    params.push(trimmedUsername);
  }
  if (role !== undefined) {
    if (!['administrador', 'gerente', 'funcionario'].includes(role)) throw new Error("Papel inválido fornecido.");
    updateFields.push(`role = $${paramCount++}`);
    params.push(role);
  }
  if (can_approve_purchase_orders !== undefined) {
    updateFields.push(`can_approve_purchase_orders = $${paramCount++}`);
    params.push(can_approve_purchase_orders ? true : false);
  }
  if (updated_by_user_id !== undefined) { // Adicionado updated_by_user_id
    updateFields.push(`updated_by_user_id = $${paramCount++}`);
    params.push(updated_by_user_id);
  }

  if (updateFields.length === 0) {
    console.warn("[postgresService.js] updateUserFullDetails: Nenhum campo válido fornecido para atualização.");
    return { changes: 0, message: "Nenhum dado válido para atualizar." };
  }
  // A trigger "trigger_set_timestamp_geral" cuidará do updated_at

  params.push(userId);
  const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${paramCount} AND is_deleted = FALSE RETURNING *;`;
  
  console.log("[postgresService.js] updateUserFullDetails - SQL:", sql, "Params:", params);
  try {
    const result = await executeQuery(sql, params);
    if (result.rowCount === 0) throw new Error(`Usuário com ID ${userId} não encontrado ou já deletado.`);
    console.log(`[postgresService.js] SUCESSO PostgreSQL updateUserFullDetails para UserID: ${userId}. Usuário atualizado:`, result.rows[0]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505' && (error.constraint === 'users_username_key' || error.constraint === 'users_username_idx')) {
      throw new Error(`Nome de usuário '${username}' já está em uso.`);
    }
    throw error;
  }
}

export async function adminResetUserPassword(targetUserId, newPasswordHash, admin_user_id) {
  console.log(`[postgresService.js] adminResetUserPassword: Admin ${admin_user_id} resetando senha para UserID: ${targetUserId}`);
  const sql = `UPDATE users SET password_hash = $1, updated_by_user_id = $2 /* updated_at é pela trigger */ WHERE id = $3 AND is_deleted = FALSE;`;
  const result = await executeQuery(sql, [newPasswordHash, admin_user_id, targetUserId]);
  if (result.rowCount === 0) throw new Error(`Usuário alvo com ID ${targetUserId} não encontrado ou já deletado.`);
  console.log(`[postgresService.js] adminResetUserPassword: Senha resetada para UserID: ${targetUserId}.`);
  return { changes: result.rowCount };
}

export async function deleteUser(id_to_delete, admin_user_id) {
  console.log(`[postgresService.js] deleteUser: Usuário ID ${admin_user_id} marcando usuário ID ${id_to_delete} como deletado.`);
  const sql = `UPDATE users SET is_deleted = TRUE, deleted_at = NOW(), deleted_by_user_id = $1 /* updated_at é pela trigger */ WHERE id = $2 AND is_deleted = FALSE RETURNING id;`;
  const result = await executeQuery(sql, [admin_user_id, id_to_delete]);
  if (result.rowCount === 0) throw new Error(`Usuário com ID ${id_to_delete} não encontrado ou já deletado.`);
  console.log(`[postgresService.js] deleteUser: Usuário ID ${id_to_delete} marcado como deletado.`);
  return { changes: result.rowCount };
}

console.log("[postgresService.js] Fim do script.");