// database/estoqueDB.js
import { executeQuery } from './dbUtils.js';

console.log("[estoqueDB.js] Script carregado.");

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
    nome, // Vem do form, será 'descricao' na tabela
    tipo, // Vem do form, será 'classificacao' na tabela
    fabricante, 
    estoque_atual, // Usado para a movimentação de saldo inicial
    estoque_minimo,
    codigo_peca, // Código secundário, opcional
    aplicacao,
    data_lancamento,
    valor_medio_unitario, // Custo do saldo inicial
    usuario_id 
   } = itemEstoque;

  const descricaoItem = nome; 
  const classificacaoItem = tipo; 

  if (!String(descricaoItem).trim()) throw new Error("Descrição (Nome da Peça) é obrigatória.");

  const client = await executeQuery('SELECT pg_advisory_xact_lock(1);'); // Obtém um lock de sessão para a geração do código
  // NOTA: pg_advisory_xact_lock requer que o pool de conexão seja configurado para um único cliente por transação
  // ou que esta lógica seja encapsulada de forma que o mesmo client seja usado para todas as queries da transação.
  // A função executeQuery já pega e libera um cliente do pool para cada query. Para transações,
  // precisamos de um cliente persistente. Vou ajustar executeQuery ou esta função.

  // Ajuste para transação:
  const transactionClient = await pool.connect(); // 'pool' precisa ser importado de dbConfig.js
                                                 // ou dbUtils.js precisa exportar uma função para transações.
                                                 // Por agora, vou assumir que dbUtils.js tem uma função para transação.
                                                 // CORREÇÃO: executeQuery já pega e libera. Para transações, precisamos de outra abordagem.
                                                 // Vou reescrever esta função para usar um cliente único para a transação.

  const localClient = await pool.connect(); // 'pool' importado de './dbConfig.js'
  try {
    await localClient.query('BEGIN');

    const seqRes = await localClient.query("SELECT nextval('codigo_fixo_estoque_seq') as next_code;");
    const nextNum = seqRes.rows[0].next_code;
    const codigoFixoGerado = String(nextNum).padStart(5, '0');
    // console.log("[estoqueDB.js] insertPeca: Gerado novo codigo_fixo da sequência:", codigoFixoGerado);

    const checkExisting = await localClient.query("SELECT 1 FROM estoque WHERE codigo_fixo = $1", [codigoFixoGerado]);
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
    const resultEstoque = await localClient.query(sqlEstoque, paramsEstoque);
    const novoItemDb = resultEstoque.rows[0];
    let novoItem = {...novoItemDb, data_lancamento: novoItemDb.data_lancamento_formatada};
    // console.log("[estoqueDB.js] insertPeca: Item inserido na tabela 'estoque':", novoItem);

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
        const resMov = await localClient.query(sqlMovimentacao, paramsMovimentacao);
        // console.log("[estoqueDB.js] insertPeca: Movimentação de saldo inicial registrada ID:", resMov.rows[0].id_movimentacao);
    }

    await localClient.query('COMMIT');
    const finalItemResult = await localClient.query("SELECT *, id_sync as id, TO_CHAR(data_lancamento, 'YYYY-MM-DD') as data_lancamento_formatada FROM estoque WHERE id_sync = $1 AND is_deleted = FALSE", [novoItem.id_sync]);
    if (finalItemResult.rows.length === 0) {
        throw new Error("Falha ao buscar o item recém-inserido após a movimentação inicial (pós-commit).");
    }
    novoItem = {...finalItemResult.rows[0], data_lancamento: finalItemResult.rows[0].data_lancamento_formatada};
    return novoItem;

  } catch (error) {
    await localClient.query('ROLLBACK');
    // console.error("[estoqueDB.js] Erro em insertPeca (transação):", error.message, error.stack);
    if (error.code === '23505') { 
        if (error.constraint === 'estoque_pkey') throw new Error(`Código Fixo '${codigoFixoGerado}' gerado automaticamente já existe (erro raro).`); // codigoFixoGerado não está no escopo aqui
        if (error.constraint === 'uq_peca_identificacao') throw new Error(`A combinação de Código Peça ('${codigo_peca}'), Descrição ('${descricaoItem}') e Fabricante ('${fabricante}') já existe.`);
    }
    throw error;
  } finally {
    localClient.release();
  }
}

export async function updatePeca(id_sync_param, itemEstoque) {
  // console.log("[estoqueDB.js] updatePeca: Atualizando item ID_SYNC:", id_sync_param, "Dados:", itemEstoque);
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
    // console.log("[estoqueDB.js] updatePeca: Item atualizado:", itemAtualizado);
    return itemAtualizado;
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'uq_peca_identificacao') {
      throw new Error(`A combinação de Código Peça, Descrição e Fabricante já existe para outro item.`);
    }
    // console.error("[estoqueDB.js] Erro em updatePeca:", error.message);
    throw error;
  }
}

export async function deletePeca(id_sync_param, usuario_id_delecao) {
  // console.log("[estoqueDB.js] deletePeca: Marcando item ID_SYNC como deletado:", id_sync_param);
  const sql = `
    UPDATE estoque 
    SET is_deleted = TRUE, deleted_at = NOW(), deleted_by_user_id = $1
    WHERE id_sync = $2 AND is_deleted = FALSE 
    RETURNING id_sync;`;
  const params = [ usuario_id_delecao, id_sync_param ];
  const result = await executeQuery(sql, params);
  if (result.rowCount === 0) throw new Error(`Item com ID ${id_sync_param} não encontrado ou já marcado como deletado.`);
  // console.log("[estoqueDB.js] deletePeca: Item ID_SYNC", id_sync_param, "marcado como deletado.");
  return { changes: result.rowCount };
}

export async function getRequestedPecas() {
  // console.log("[estoqueDB.js] getRequestedPecas: Buscando peças para gráfico...");
  const sql = `SELECT descricao as nome, estoque_atual, estoque_minimo, TO_CHAR(data_lancamento, 'YYYY-MM-DD') as data_lancamento_formatada FROM estoque WHERE is_deleted = FALSE ORDER BY nome ASC`;
  const result = await executeQuery(sql);
  const formattedRows = (result.rows || []).map(r => ({
      nome: r.nome,
      quantidade: r.estoque_atual,
      estoque_atual: r.estoque_atual,
      estoque_minimo: r.estoque_minimo,
      data_lancamento: r.data_lancamento_formatada
  }));
  // console.log("[estoqueDB.js] getRequestedPecas: Encontradas", formattedRows.length, "peças.");
  return formattedRows;
}
// Importar o pool para a função insertPeca transacional
import pool from './dbConfig.js';

console.log("[estoqueDB.js] Funções CRUD de estoque exportadas.");