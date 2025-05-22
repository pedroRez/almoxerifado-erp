// postgresService.js
import pg from 'pg';

console.log("[postgresService.js] Script carregado. vComOS_Func_CRUD_Completo");

const dbConfig = {
  user: 'xerife_user',
  host: 'localhost',
  database: 'Xerife',
  password: 'root',
  port: 5432,
};

const pool = new pg.Pool(dbConfig);
pool.on('connect', () => console.log('[postgresService.js] Conectado ao pool do PostgreSQL.'));
pool.on('error', (err) => console.error('[postgresService.js] ERRO INESPERADO no pool PostgreSQL:', err));

export async function connectPostgresDatabase() {
  console.log("[postgresService.js] Tentando conectar ao PostgreSQL...");
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW() AS data_hora_atual;');
    console.log('[postgresService.js] Conexão com PostgreSQL bem-sucedida:', res.rows[0]);
    return true;
  } catch (error) {
    console.error('[postgresService.js] ERRO ao conectar ao PostgreSQL:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function createPostgresTables() {
  console.log("[postgresService.js] Verificando existência das tabelas (APENAS TABELAS)...");
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // As tabelas, funções e triggers principais são criadas pelo script setup_xerife_db.sql
    // Aqui apenas garantimos que as tabelas existam com IF NOT EXISTS como uma salvaguarda
    // ou para ambientes onde o script de setup não foi rodado.
    // No entanto, o script de setup é o método preferencial para criar funções e triggers.

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, nome_completo TEXT, password_hash TEXT NOT NULL,
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
      CREATE TABLE IF NOT EXISTS funcionarios (
        id_funcionario SERIAL PRIMARY KEY, matricula TEXT UNIQUE NOT NULL, nome_completo_funcionario TEXT NOT NULL,
        cargo TEXT, setor TEXT, status BOOLEAN DEFAULT TRUE NOT NULL, 
        user_id INTEGER REFERENCES users(id) UNIQUE NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log("[postgresService.js] Tabela 'funcionarios' verificada.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS estoque (
        codigo_fixo TEXT PRIMARY KEY NOT NULL, id_sync UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
        codigo_peca TEXT, classificacao TEXT, descricao TEXT NOT NULL, aplicacao TEXT, fabricante TEXT,
        estoque_atual INTEGER DEFAULT 0 NOT NULL, estoque_minimo INTEGER DEFAULT 0 NOT NULL,
        estoque_inicial INTEGER DEFAULT 0, data_lancamento DATE,
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
        tipo_movimentacao TEXT NOT NULL CHECK(tipo_movimentacao IN ('entrada_compra', 'saida_requisicao', 'saida_os', 'ajuste_entrada', 'ajuste_saida', 'saldo_inicial')),
        quantidade INTEGER NOT NULL, data_movimentacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        usuario_id INTEGER REFERENCES users(id) ON DELETE SET NULL, observacao TEXT, documento_referencia TEXT, 
        custo_unitario_movimentacao NUMERIC(12, 4) DEFAULT 0.0000, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );`);
    console.log("[postgresService.js] Tabela 'movimentacoes_estoque' verificada.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS tipos_caracteristica_manutencao (
        id_tipo_caracteristica SERIAL PRIMARY KEY, nome_caracteristica TEXT NOT NULL UNIQUE,
        descricao TEXT NULL, ativo BOOLEAN DEFAULT TRUE NOT NULL
      );`);
    console.log("[postgresService.js] Tabela 'tipos_caracteristica_manutencao' verificada.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS ordens_servico (
        id_os SERIAL PRIMARY KEY, numero_os_manual INTEGER UNIQUE NOT NULL, prefixo_veiculo TEXT,
        placa_veiculo VARCHAR(10) NULL, km_veiculo INTEGER NULL, horimetro_veiculo NUMERIC(10,2) NULL,
        local_servico TEXT NULL, data_abertura TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        data_fechamento TIMESTAMPTZ NULL, 
        responsavel_abertura_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        motivos_entrada TEXT[] NULL, 
        solicitante_servico_id INTEGER REFERENCES funcionarios(id_funcionario) ON DELETE SET NULL,
        descricao_problema TEXT NOT NULL, servicos_realizados_sumario TEXT NULL,
        status_os TEXT NOT NULL DEFAULT 'aberta' CHECK(status_os IN ('aberta', 'em_andamento', 'aguardando_pecas', 'pendente_aprovacao_final', 'concluida', 'cancelada')),
        supervisor_manutencao_aprov_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        data_aprov_supervisor TIMESTAMPTZ NULL,
        lider_manutencao_aprov_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        data_aprov_lider TIMESTAMPTZ NULL, observacoes_gerais TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      );`);
    console.log("[postgresService.js] Tabela 'ordens_servico' verificada.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_caracteristicas_selecionadas (
        id_os_caracteristica SERIAL PRIMARY KEY,
        id_os INTEGER NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
        id_tipo_caracteristica INTEGER NOT NULL REFERENCES tipos_caracteristica_manutencao(id_tipo_caracteristica) ON DELETE RESTRICT,
        UNIQUE (id_os, id_tipo_caracteristica)
      );`);
    console.log("[postgresService.js] Tabela 'os_caracteristicas_selecionadas' verificada.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_mao_de_obra (
        id_apontamento_mo SERIAL PRIMARY KEY,
        id_os INTEGER NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
        data_apontamento DATE NOT NULL DEFAULT CURRENT_DATE,
        funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id_funcionario) ON DELETE RESTRICT,
        hora_inicio TIME NOT NULL, hora_fim TIME NULL, motivo_parada TEXT NULL, observacoes TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      );`);
    console.log("[postgresService.js] Tabela 'os_mao_de_obra' verificada.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS os_materiais (
        id_os_material SERIAL PRIMARY KEY,
        id_os INTEGER NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
        id_item_estoque_sync UUID NOT NULL REFERENCES estoque(id_sync) ON DELETE RESTRICT,
        quantidade_solicitada INTEGER NOT NULL,
        quantidade_fornecida INTEGER DEFAULT 0,
        status_material TEXT NOT NULL DEFAULT 'solicitado' CHECK(status_material IN ('solicitado', 'aprovado_retirada', 'retirado_do_estoque', 'compra_necessaria', 'item_cancelado', 'atendido_parcialmente')),
        data_solicitacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        solicitante_material_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        aprovador_retirada_id INTEGER REFERENCES users(id) ON DELETE SET NULL, 
        data_aprovacao_retirada TIMESTAMPTZ NULL,
        observacao_material TEXT NULL,
        id_movimentacao_saida INTEGER REFERENCES movimentacoes_estoque(id_movimentacao) NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      );`);
    console.log("[postgresService.js] Tabela 'os_materiais' verificada.");
    
    await client.query('COMMIT');
    console.log("[postgresService.js] Verificação de todas as tabelas (IF NOT EXISTS) concluída.");

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[postgresService.js] ERRO ao verificar/criar tabelas:', error);
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

// --- Funções para 'estoque' (Peças) ---
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
    codigo_peca, aplicacao, data_lancamento,
    valor_medio_unitario, 
    usuario_id 
   } = itemEstoque;

  const descricaoItem = nome; 
  const classificacaoItem = tipo; 

  if (!String(descricaoItem).trim()) throw new Error("Descrição (Nome da Peça) é obrigatória.");

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const seqRes = await client.query("SELECT nextval('codigo_fixo_estoque_seq') as next_code;");
    const nextNum = seqRes.rows[0].next_code;
    const codigoFixoGerado = String(nextNum).padStart(5, '0');
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
    if (result.rowCount === 0) throw new Error(`Item com ID ${id_sync_param} não encontrado ou já deletado.`);
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
  const sql = `SELECT id, username, nome_completo, password_hash, role, can_approve_purchase_orders FROM users WHERE username = $1 AND is_deleted = FALSE;`;
  const result = await executeQuery(sql, [username]);
  return result.rows[0];
}

export async function insertUser(username, nome_completo, passwordHash, role, canApproveOrders = 0, creatorUserId = null) {
  console.log("[postgresService.js] insertUser: Inserindo usuário:", {username, nome_completo, role, canApproveOrders, creatorUserId});
  const sql = `
    INSERT INTO users (username, nome_completo, password_hash, role, can_approve_purchase_orders, created_by_user_id, updated_by_user_id) 
    VALUES ($1, $2, $3, $4, $5, $6, $6) 
    RETURNING id, username, nome_completo, role, can_approve_purchase_orders;`;
  const params = [ username, nome_completo || null, passwordHash, role, canApproveOrders ? true : false, creatorUserId ];
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
  const sql = `SELECT id, username, nome_completo, role, can_approve_purchase_orders FROM users WHERE is_deleted = FALSE ORDER BY nome_completo ASC;`;
  const result = await executeQuery(sql);
  console.log("[postgresService.js] getAllUsers: Encontrados", result.rowCount, "usuários.");
  return result.rows || [];
}

export async function getUsersByRole(role) {
  console.log("[postgresService.js] getUsersByRole: Buscando usuários com papel:", role);
  const sql = `
    SELECT id, username, nome_completo, role, can_approve_purchase_orders 
    FROM users WHERE role = $1 AND is_deleted = FALSE ORDER BY nome_completo ASC;`;
  const result = await executeQuery(sql, [role]);
  console.log("[postgresService.js] getUsersByRole: Encontrados", result.rowCount, "usuários com papel", role);
  return result.rows || [];
}

export async function updateUserPassword(userId, newPasswordHash) {
  console.log("[postgresService.js] updateUserPassword: Atualizando senha para UserID:", userId);
  const sql = `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = FALSE;`;
  const result = await executeQuery(sql, [newPasswordHash, userId]);
  if (result.rowCount === 0) throw new Error(`Usuário com ID ${userId} não encontrado ou já deletado.`);
  console.log("[postgresService.js] updateUserPassword: Senha atualizada para UserID:", userId);
  return { changes: result.rowCount };
}

export async function updateUserFullDetails(userId, { username, nome_completo, role, can_approve_purchase_orders, updated_by_user_id }) {
  console.log(`[postgresService.js] updateUserFullDetails para UserID: ${userId}. Dados:`, { username, nome_completo, role, can_approve_purchase_orders, updated_by_user_id });
  
  let updateFields = [];
  let params = [];
  let paramCount = 1;

  if (username !== undefined) {
    const trimmedUsername = String(username).trim();
    if (!trimmedUsername) throw new Error("Nome de usuário não pode ser vazio.");
    updateFields.push(`username = $${paramCount++}`);
    params.push(trimmedUsername);
  }
  if (nome_completo !== undefined) {
    updateFields.push(`nome_completo = $${paramCount++}`);
    params.push(String(nome_completo || '').trim());
  }
  if (role !== undefined) {
    if (!['administrador', 'gerente', 'funcionario'].includes(role)) throw new Error("Papel inválido.");
    updateFields.push(`role = $${paramCount++}`);
    params.push(role);
  }
  if (can_approve_purchase_orders !== undefined) {
    updateFields.push(`can_approve_purchase_orders = $${paramCount++}`);
    params.push(can_approve_purchase_orders ? true : false);
  }
  if (updated_by_user_id !== undefined) {
    updateFields.push(`updated_by_user_id = $${paramCount++}`);
    params.push(updated_by_user_id);
  }

  if (updateFields.length === 0) {
    return { changes: 0, message: "Nenhum dado para atualizar." };
  }
  // updated_at é pela trigger

  params.push(userId);
  const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${paramCount} AND is_deleted = FALSE RETURNING *;`;
  
  try {
    const result = await executeQuery(sql, params);
    if (result.rowCount === 0) throw new Error(`Usuário ID ${userId} não encontrado ou já deletado.`);
    const user = result.rows[0];
    return {...user, can_approve_purchase_orders: Boolean(user.can_approve_purchase_orders)};
  } catch (error) {
    if (error.code === '23505' && (error.constraint === 'users_username_key' || error.constraint === 'users_username_idx')) {
      throw new Error(`Nome de usuário '${username}' já está em uso.`);
    }
    throw error;
  }
}

export async function adminResetUserPassword(targetUserId, newPasswordHash, admin_user_id) {
  console.log(`[postgresService.js] adminResetUserPassword: Admin ${admin_user_id} resetando senha para UserID: ${targetUserId}`);
  const sql = `UPDATE users SET password_hash = $1, updated_by_user_id = $2 WHERE id = $3 AND is_deleted = FALSE;`;
  const result = await executeQuery(sql, [newPasswordHash, admin_user_id, targetUserId]);
  if (result.rowCount === 0) throw new Error(`Usuário alvo com ID ${targetUserId} não encontrado ou já deletado.`);
  console.log(`[postgresService.js] adminResetUserPassword: Senha resetada para UserID: ${targetUserId}.`);
  return { changes: result.rowCount };
}

export async function deleteUser(id_to_delete, admin_user_id) {
  console.log(`[postgresService.js] deleteUser: Usuário ID ${admin_user_id} marcando usuário ID ${id_to_delete} como deletado.`);
  const sql = `UPDATE users SET is_deleted = TRUE, deleted_at = NOW(), deleted_by_user_id = $1 WHERE id = $2 AND is_deleted = FALSE RETURNING id;`;
  const result = await executeQuery(sql, [admin_user_id, id_to_delete]);
  if (result.rowCount === 0) throw new Error(`Usuário com ID ${id_to_delete} não encontrado ou já deletado.`);
  console.log(`[postgresService.js] deleteUser: Usuário ID ${id_to_delete} marcado como deletado.`);
  return { changes: result.rowCount };
}

// --- NOVAS FUNÇÕES CRUD para FUNCIONARIOS ---
export async function getAllFuncionarios() {
  console.log("[postgresService.js] getAllFuncionarios: Buscando todos os funcionários ativos...");
  const result = await executeQuery("SELECT f.*, u.username as login_associado FROM funcionarios f LEFT JOIN users u ON f.user_id = u.id WHERE f.status = TRUE ORDER BY f.nome_completo_funcionario ASC;");
  console.log("[postgresService.js] getAllFuncionarios: Encontrados", result.rowCount, "funcionários.");
  return result.rows || [];
}

export async function insertFuncionario(funcionarioData) { // creatorUserId é opcional, se for rastrear
  const { matricula, nome_completo_funcionario, cargo, setor, status = true, user_id = null } = funcionarioData; 
  console.log("[postgresService.js] insertFuncionario: Inserindo funcionário:", {matricula, nome_completo_funcionario, cargo, setor, status, user_id});
  if (!matricula || !nome_completo_funcionario) {
    throw new Error("Matrícula e Nome Completo do Funcionário são obrigatórios.");
  }
  const sql = `
    INSERT INTO funcionarios (matricula, nome_completo_funcionario, cargo, setor, status, user_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;`;
  const params = [matricula, nome_completo_funcionario, cargo || null, setor || null, status, user_id];
  try {
    const result = await executeQuery(sql, params);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
        if (error.constraint === 'funcionarios_matricula_key') {
             throw new Error(`Matrícula de funcionário '${matricula}' já existe.`);
        }
        if (error.constraint === 'funcionarios_user_id_key' && user_id !== null) {
             throw new Error(`Este usuário do sistema já está associado a outro funcionário.`);
        }
    }
    throw error;
  }
}

export async function updateFuncionario(id_funcionario, funcionarioData) { // updatorUserId opcional
  const { matricula, nome_completo_funcionario, cargo, setor, status = true /* user_id não é atualizado aqui */ } = funcionarioData;
  console.log("[postgresService.js] updateFuncionario: Atualizando funcionário ID:", id_funcionario, "Dados:", {matricula, nome_completo_funcionario, cargo, setor, status});
   if (!matricula || !nome_completo_funcionario) {
    throw new Error("Matrícula e Nome Completo do Funcionário são obrigatórios.");
  }
  const sql = `
    UPDATE funcionarios 
    SET matricula = $1, nome_completo_funcionario = $2, cargo = $3, setor = $4, status = $5
    WHERE id_funcionario = $6
    RETURNING *;`;
  const params = [matricula, nome_completo_funcionario, cargo || null, setor || null, status, id_funcionario];
   try {
    const result = await executeQuery(sql, params);
    if (result.rowCount === 0) throw new Error(`Funcionário com ID ${id_funcionario} não encontrado.`);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'funcionarios_matricula_key') {
      throw new Error(`Matrícula '${matricula}' já existe para outro funcionário.`);
    }
    throw error;
  }
}

export async function deleteFuncionario(id_funcionario, adminUserId) { // Soft delete
  console.log(`[postgresService.js] deleteFuncionario: Admin ${adminUserId} inativando funcionário ID ${id_funcionario}.`);
  const sql = `UPDATE funcionarios SET status = FALSE, updated_at = NOW() WHERE id_funcionario = $1 AND status = TRUE RETURNING id_funcionario;`;
  const result = await executeQuery(sql, [id_funcionario]);
  if (result.rowCount === 0) throw new Error(`Funcionário com ID ${id_funcionario} não encontrado ou já inativo.`);
  return { changes: result.rowCount };
}


// --- NOVAS FUNÇÕES CRUD para ORDENS DE SERVIÇO (Iniciais) ---
export async function getAllOrdensServico() {
    console.log("[postgresService.js] getAllOrdensServico: Buscando todas as OS...");
    const sql = `
        SELECT 
            os.*, 
            u_resp.username as username_responsavel_abertura,
            u_resp.nome_completo as nome_completo_responsavel_abertura,
            f_solic.nome_completo_funcionario as nome_solicitante_funcionario,
            u_sup_aprov.username as username_supervisor_aprov,
            u_lid_aprov.username as username_lider_aprov,
            TO_CHAR(os.data_abertura, 'DD/MM/YYYY HH24:MI') as data_abertura_formatada, -- Formatado
            TO_CHAR(os.data_fechamento, 'DD/MM/YYYY HH24:MI') as data_fechamento_formatada -- Formatado
        FROM ordens_servico os
        JOIN users u_resp ON os.responsavel_abertura_id = u_resp.id
        LEFT JOIN funcionarios f_solic ON os.solicitante_servico_id = f_solic.id_funcionario
        LEFT JOIN users u_sup_aprov ON os.supervisor_manutencao_aprov_id = u_sup_aprov.id
        LEFT JOIN users u_lid_aprov ON os.lider_manutencao_aprov_id = u_lid_aprov.id
        ORDER BY os.data_abertura DESC;
    `;
    const result = await executeQuery(sql);
    // Substituir o objeto Date pela string formatada para o frontend
    return (result.rows || []).map(row => ({
        ...row,
        data_abertura: row.data_abertura_formatada, 
        data_fechamento: row.data_fechamento_formatada,
        motivos_entrada: row.motivos_entrada || [] 
    }));
}

export async function insertOrdemServico(osData) {
    console.log("[postgresService.js] insertOrdemServico: Inserindo OS:", osData);
    const { 
        numero_os_manual, prefixo_veiculo, placa_veiculo, km_veiculo, horimetro_veiculo,
        local_servico, responsavel_abertura_id, motivos_entrada, solicitante_servico_id,
        descricao_problema, created_by_user_id 
    } = osData;

    if (!numero_os_manual || !String(numero_os_manual).trim() || !descricao_problema || !responsavel_abertura_id) {
        throw new Error("Número da OS Manual, Descrição do Problema e Responsável pela Abertura são obrigatórios.");
    }

    const sql = `
        INSERT INTO ordens_servico (
            numero_os_manual, prefixo_veiculo, placa_veiculo, km_veiculo, horimetro_veiculo,
            local_servico, responsavel_abertura_id, motivos_entrada, solicitante_servico_id,
            descricao_problema, created_by_user_id, updated_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
        RETURNING *, TO_CHAR(data_abertura, 'YYYY-MM-DD HH24:MI:SS') as data_abertura_formatada; 
    `;
    const params = [
        parseInt(numero_os_manual), prefixo_veiculo || null, placa_veiculo || null, 
        Number.isFinite(parseInt(km_veiculo)) ? parseInt(km_veiculo) : null, 
        Number.isFinite(parseFloat(horimetro_veiculo)) ? parseFloat(horimetro_veiculo) : null,
        local_servico || null, responsavel_abertura_id, 
        motivos_entrada && Array.isArray(motivos_entrada) && motivos_entrada.length > 0 ? motivos_entrada : null,
        Number.isFinite(parseInt(solicitante_servico_id)) ? parseInt(solicitante_servico_id) : null,
        descricao_problema, created_by_user_id
    ];
    try {
        const result = await executeQuery(sql, params);
        const newOS = {...result.rows[0], data_abertura: result.rows[0].data_abertura_formatada };
        return newOS;
    } catch (error) {
        if (error.code === '23505' && error.constraint === 'ordens_servico_numero_os_manual_key') {
            throw new Error(`Ordem de Serviço manual número '${numero_os_manual}' já existe.`);
        }
        throw error;
    }
}
// TODO: Implementar updateOrdemServico, getOrdemServicoById, e funções para os_materiais, os_mao_de_obra, os_caracteristicas

console.log("[postgresService.js] Fim do script.");