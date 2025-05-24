// database/funcionariosDB.js
import { executeQuery } from './dbUtils.js';
import pool from './dbConfig.js'; // Necessário para transações explícitas

console.log("[funcionariosDB.js] Script carregado. vTransacaoFuncUser_CompletoFinal");

export async function getAllFuncionarios() {
  console.log("[funcionariosDB.js] getAllFuncionarios: Buscando todos os funcionários...");
  // A trigger no 'funcionarios' já cuida do updated_at
  const sql = `
    SELECT f.id_funcionario, f.matricula, f.nome_completo_funcionario, f.cargo, f.setor, f.status,
           f.user_id, u.username as login_associado,
           TO_CHAR(f.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at_fmt,
           TO_CHAR(f.updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at_fmt
    FROM funcionarios f 
    LEFT JOIN users u ON f.user_id = u.id 
    /* WHERE f.status = TRUE -- Descomente se quiser filtrar apenas ativos por padrão na listagem geral */
    ORDER BY f.nome_completo_funcionario ASC;`;
  const result = await executeQuery(sql);
  console.log("[funcionariosDB.js] getAllFuncionarios: Encontrados", result.rowCount, "funcionários.");
  return (result.rows || []).map(row => ({ 
      ...row, 
      created_at: row.created_at_fmt, // Usa a string formatada
      updated_at: row.updated_at_fmt  // Usa a string formatada
    }));
}

// Função para inserir um funcionário e, opcionalmente, um usuário associado
// A senha (passwordHash) já deve vir hasheada do main.js
export async function insertFuncionarioAndOrUser(data, creatorUserId) {
  const { 
    matricula, nome_completo_funcionario, cargo, setor, status = true, 
    // Dados do usuário (opcionais, se for criar login)
    username, password_hash, role, can_approve_purchase_orders 
  } = data;

  if (!matricula || !String(matricula).trim() || !nome_completo_funcionario || !String(nome_completo_funcionario).trim()) {
    throw new Error("Matrícula e Nome Completo do Funcionário são obrigatórios.");
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let newUserId = null;
    let createdUser = null;

    // 1. Se dados de usuário foram fornecidos, tenta criar o usuário primeiro
    if (username && password_hash && role) {
      console.log("[funcionariosDB.js] Tentando criar usuário associado:", {username, role});
      const userSql = `
        INSERT INTO users (username, nome_completo, password_hash, role, can_approve_purchase_orders, created_by_user_id, updated_by_user_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $6) 
        RETURNING id, username, nome_completo, role, can_approve_purchase_orders;`;
      const userParams = [
        String(username).trim(), 
        String(nome_completo_funcionario).trim(), // Usa o nome do funcionário para o user
        password_hash, // Senha já hasheada vinda do main.js
        role, 
        can_approve_purchase_orders ? true : false, 
        creatorUserId 
      ];
      try {
        const userResult = await client.query(userSql, userParams);
        if (userResult.rows.length > 0) {
            createdUser = userResult.rows[0];
            newUserId = createdUser.id;
            console.log("[funcionariosDB.js] Usuário associado criado ID:", newUserId, "Detalhes:", createdUser);
        } else {
            throw new Error("Falha ao criar registro de usuário associado, RETURNING não retornou dados.");
        }
      } catch (userError) {
        if (userError.code === '23505' && (userError.constraint === 'users_username_key' || userError.constraint === 'users_username_idx')) {
          throw new Error(`Login (username) '${username}' já existe para outro usuário.`);
        }
        console.error("[funcionariosDB.js] Erro ao criar usuário associado:", userError);
        throw userError; 
      }
    }

    // 2. Insere o funcionário, linkando o user_id se foi criado
    const funcSql = `
      INSERT INTO funcionarios (matricula, nome_completo_funcionario, cargo, setor, status, user_id, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;`;
    const funcParams = [
      String(matricula).trim(), 
      String(nome_completo_funcionario).trim(), 
      cargo || null, 
      setor || null, 
      status, 
      newUserId // Pode ser null se não criou usuário
    ];
    
    const funcResult = await client.query(funcSql, funcParams);
    const createdFuncionario = funcResult.rows[0];
    console.log("[funcionariosDB.js] Funcionário inserido:", createdFuncionario);
    
    await client.query('COMMIT');
    return { ...createdFuncionario, usuario_associado: createdUser }; // Retorna os dados do funcionário e do usuário criado (se houver)

  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
        if (error.constraint === 'funcionarios_matricula_key') {
             throw new Error(`Matrícula de funcionário '${matricula}' já existe.`);
        }
        if (error.constraint === 'funcionarios_user_id_key' && newUserId !== null) {
             throw new Error(`O usuário ID ${newUserId} já está associado a outro funcionário (conflito inesperado).`);
        }
    }
    console.error("[funcionariosDB.js] Erro em insertFuncionarioAndOrUser:", error.message, error.stack);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateFuncionario(id_funcionario, funcionarioData, updatorUserId = null) {
  const { matricula, nome_completo_funcionario, cargo, setor, status = true } = funcionarioData;
  // user_id não é atualizado diretamente aqui. Se precisar linkar/deslinkar, será uma operação diferente.
  console.log("[funcionariosDB.js] updateFuncionario: Atualizando funcionário ID:", id_funcionario, "Dados:", {matricula, nome_completo_funcionario, cargo, setor, status, updatorUserId});
  
   if (!id_funcionario) throw new Error ("ID do funcionário é obrigatório para atualização.");
   if (!matricula || !String(matricula).trim() || !nome_completo_funcionario || !String(nome_completo_funcionario).trim()) {
    throw new Error("Matrícula e Nome Completo do Funcionário são obrigatórios.");
  }
  
  // A trigger "trigger_set_timestamp_geral" cuidará do updated_at
  // Se a tabela funcionarios tivesse updated_by_user_id:
  // const sql = `
  //   UPDATE funcionarios 
  //   SET matricula = $1, nome_completo_funcionario = $2, cargo = $3, setor = $4, status = $5, updated_by_user_id = $6
  //   WHERE id_funcionario = $7
  //   RETURNING *;`;
  // const params = [String(matricula).trim(), String(nome_completo_funcionario).trim(), cargo || null, setor || null, status, updatorUserId, id_funcionario];
  
  const sql = `
    UPDATE funcionarios 
    SET matricula = $1, nome_completo_funcionario = $2, cargo = $3, setor = $4, status = $5
    WHERE id_funcionario = $6
    RETURNING *;`;
  const params = [
    String(matricula).trim(), 
    String(nome_completo_funcionario).trim(), 
    cargo || null, 
    setor || null, 
    status, 
    id_funcionario
  ];

   try {
    const result = await executeQuery(sql, params);
    if (result.rowCount === 0) throw new Error(`Funcionário com ID ${id_funcionario} não encontrado para atualização.`);
    console.log("[funcionariosDB.js] updateFuncionario: Funcionário atualizado:", result.rows[0]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'funcionarios_matricula_key') {
      throw new Error(`Matrícula '${matricula}' já existe para outro funcionário.`);
    }
    console.error("[funcionariosDB.js] Erro em updateFuncionario:", error.message);
    throw error;
  }
}

export async function deleteFuncionario(id_funcionario, adminUserId = null) { // Soft delete (muda status)
  console.log(`[funcionariosDB.js] deleteFuncionario: Usuário ${adminUserId || '(sistema)'} inativando funcionário ID ${id_funcionario}.`);
  // A trigger "trigger_set_timestamp_geral" cuidará do updated_at
  // Se a tabela funcionarios tivesse updated_by_user_id:
  // const sql = `UPDATE funcionarios SET status = FALSE, updated_by_user_id = $1 WHERE id_funcionario = $2 AND status = TRUE RETURNING id_funcionario;`;
  // const params = [adminUserId, id_funcionario];
  const sql = `UPDATE funcionarios SET status = FALSE WHERE id_funcionario = $1 AND status = TRUE RETURNING id_funcionario;`;
  const params = [id_funcionario];
  
  const result = await executeQuery(sql, params);
  if (result.rowCount === 0) {
    const checkExists = await executeQuery("SELECT status FROM funcionarios WHERE id_funcionario = $1", [id_funcionario]);
    if(checkExists.rowCount === 0) throw new Error(`Funcionário com ID ${id_funcionario} não encontrado.`);
    if(checkExists.rows[0].status === false) {
        console.log(`[funcionariosDB.js] deleteFuncionario: Funcionário ID ${id_funcionario} já estava inativo.`);
        return { changes: 0, message: "Funcionário já estava inativo." };
    }
  }
  console.log(`[funcionariosDB.js] deleteFuncionario: Funcionário ID ${id_funcionario} marcado como inativo.`);
  return { changes: result.rowCount };
}

console.log("[funcionariosDB.js] Funções CRUD de funcionários exportadas.");