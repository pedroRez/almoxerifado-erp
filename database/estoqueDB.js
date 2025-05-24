// database/estoqueDB.js
import { executeQuery } from './dbUtils.js';
import pool from './dbConfig.js'; // Para transações explícitas

console.log("[estoqueDB.js] Script carregado. vFinalCompleta");

// --- Funções para 'estoque' (Peças) ---
export async function getAllPecas() {
  // console.log("[estoqueDB.js] getAllPecas: Buscando todos os itens do estoque...");
  const result = await executeQuery("SELECT *, id_sync as id, TO_CHAR(data_lancamento, 'YYYY-MM-DD') as data_lancamento_formatada FROM estoque WHERE is_deleted = FALSE ORDER BY descricao ASC;");
  // console.log("[estoqueDB.js] getAllPecas: Encontrados", result.rowCount, "itens.");
  return (result.rows || []).map(row => ({...row, data_lancamento: row.data_lancamento_formatada}));
}

export async function insertPeca(itemEstoque) {
  // console.log("[estoqueDB.js] insertPeca: Inserindo novo item no estoque (codigo_fixo será gerado):", itemEstoque);
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
    // console.log("[estoqueDB.js] insertPeca: Gerado novo codigo_fixo da sequência:", codigoFixoGerado);

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
        await client.query(sqlMovimentacao, paramsMovimentacao);
    }

    await client.query('COMMIT');
    const finalItemResult = await client.query("SELECT *, id_sync as id, TO_CHAR(data_lancamento, 'YYYY-MM-DD') as data_lancamento_formatada FROM estoque WHERE id_sync = $1 AND is_deleted = FALSE", [novoItem.id_sync]);
    if (finalItemResult.rows.length === 0) {
        throw new Error("Falha ao buscar o item recém-inserido após a movimentação inicial.");
    }
    novoItem = {...finalItemResult.rows[0], data_lancamento: finalItemResult.rows[0].data_lancamento_formatada};
    return novoItem;

  } catch (error) {
    await client.query('ROLLBACK');
    // console.error("[estoqueDB.js] Erro em insertPeca (transação):", error.message, error.stack);
    if (error.code === '23505') { 
        // codigoFixoGerado não está disponível neste escopo de catch se o erro for antes dele
        if (error.constraint === 'estoque_pkey') throw new Error(`Conflito de Chave Primária (Código Fixo) ao inserir item.`);
        if (error.constraint === 'uq_peca_identificacao') throw new Error(`A combinação de Código Peça, Descrição e Fabricante já existe.`);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePeca(id_sync_param, itemEstoque) {
  const { 
    nome, tipo, fabricante, estoque_minimo,
    codigo_peca, aplicacao, data_lancamento, 
    usuario_id 
  } = itemEstoque;

  const descricaoItem = nome;
  const classificacaoItem = tipo;
  if (!String(descricaoItem).trim()) throw new Error("Descrição é obrigatória.");
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
    dataLancamentoFinal, usuario_id, id_sync_param
  ];
  try {
    const result = await executeQuery(sql, params);
    if (result.rowCount === 0) throw new Error(`Item com ID ${id_sync_param} não encontrado ou deletado.`);
    const itemAtualizado = {...result.rows[0], data_lancamento: result.rows[0].data_lancamento_formatada};
    return itemAtualizado;
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'uq_peca_identificacao') {
      throw new Error(`A combinação de Código Peça, Descrição e Fabricante já existe para outro item.`);
    }
    throw error;
  }
}

export async function deletePeca(id_sync_param, usuario_id_delecao) {
  const sql = `
    UPDATE estoque 
    SET is_deleted = TRUE, deleted_at = NOW(), deleted_by_user_id = $1
    WHERE id_sync = $2 AND is_deleted = FALSE 
    RETURNING id_sync;`;
  const params = [ usuario_id_delecao, id_sync_param ];
  const result = await executeQuery(sql, params);
  if (result.rowCount === 0) throw new Error(`Item com ID ${id_sync_param} não encontrado ou já deletado.`);
  return { changes: result.rowCount };
}

export async function getRequestedPecas() {
  const sql = `SELECT descricao as nome, estoque_atual, estoque_minimo, TO_CHAR(data_lancamento, 'YYYY-MM-DD') as data_lancamento FROM estoque WHERE is_deleted = FALSE ORDER BY nome ASC`;
  const result = await executeQuery(sql);
  // A query já renomeia data_lancamento_formatada para data_lancamento para o frontend
  return (result.rows || []).map(r => ({
      nome: r.nome, quantidade: r.estoque_atual, estoque_atual: r.estoque_atual,
      estoque_minimo: r.estoque_minimo, data_lancamento: r.data_lancamento
  }));
}

console.log("[estoqueDB.js] Funções CRUD de estoque exportadas.");