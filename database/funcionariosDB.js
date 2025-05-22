// database/funcionariosDB.js
import { executeQuery } from './dbUtils.js';

console.log("[funcionariosDB.js] Script carregado.");

export async function getAllFuncionarios() {
  // console.log("[funcionariosDB.js] getAllFuncionarios: Buscando todos os funcionários ativos...");
  // A trigger no 'funcionarios' já cuida do updated_at
  const sql = `
    SELECT f.id_funcionario, f.matricula, f.nome_completo_funcionario, f.cargo, f.setor, f.status,
           f.user_id, u.username as login_associado,
           TO_CHAR(f.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at_formatado,
           TO_CHAR(f.updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at_formatado
    FROM funcionarios f 
    LEFT JOIN users u ON f.user_id = u.id 
    /* WHERE f.status = TRUE -- Se quiser listar apenas os ativos por padrão */
    ORDER BY f.nome_completo_funcionario ASC;`;
  const result = await executeQuery(sql);
  // console.log("[funcionariosDB.js] getAllFuncionarios: Encontrados", result.rowCount, "funcionários.");
  return (result.rows || []).map(row => ({ 
      ...row, 
      created_at: row.created_at_formatado, // Substitui o objeto Date pela string
      updated_at: row.updated_at_formatado  // Substitui o objeto Date pela string
    }));
}

export async function insertFuncionario(funcionarioData, creatorUserId = null) {
  const { matricula, nome_completo_funcionario, cargo, setor, status = true, user_id = null } = funcionarioData; 
  console.log("[funcionariosDB.js] insertFuncionario: Inserindo funcionário:", {matricula, nome_completo_funcionario, cargo, setor, status, user_id, creatorUserId});
  
  if (!matricula || !String(matricula).trim() || !nome_completo_funcionario || !String(nome_completo_funcionario).trim()) {
    throw new Error("Matrícula e Nome Completo do Funcionário são obrigatórios.");
  }
  // Não precisamos mais de created_by_user_id ou updated_by_user_id na tabela funcionarios,
  // pois a auditoria principal estará na tabela users se o funcionário for um usuário.
  // Se precisar de auditoria na tabela funcionarios em si, adicione as colunas no CREATE TABLE.
  const sql = `
    INSERT INTO funcionarios (matricula, nome_completo_funcionario, cargo, setor, status, user_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;`; // Retorna a linha completa inserida
  const params = [
    String(matricula).trim(), 
    String(nome_completo_funcionario).trim(), 
    cargo || null, 
    setor || null, 
    status, 
    user_id ? parseInt(user_id) : null // Garante que user_id seja número ou null
  ];
  try {
    const result = await executeQuery(sql, params);
    console.log("[funcionariosDB.js] insertFuncionario: Funcionário inserido:", result.rows[0]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // Violação de constraint UNIQUE
        if (error.constraint === 'funcionarios_matricula_key') { // Nome padrão da constraint UNIQUE em 'matricula'
             throw new Error(`Matrícula de funcionário '${matricula}' já existe.`);
        }
        if (error.constraint === 'funcionarios_user_id_key' && user_id !== null) { // Nome padrão da constraint UNIQUE em 'user_id'
             throw new Error(`Este usuário do sistema (ID: ${user_id}) já está associado a outro funcionário.`);
        }
    }
    console.error("[funcionariosDB.js] Erro em insertFuncionario:", error.message);
    throw error;
  }
}

export async function updateFuncionario(id_funcionario, funcionarioData, updatorUserId = null) {
  const { matricula, nome_completo_funcionario, cargo, setor, status = true /* user_id não é atualizado aqui */ } = funcionarioData;
  console.log("[funcionariosDB.js] updateFuncionario: Atualizando funcionário ID:", id_funcionario, "Dados:", {matricula, nome_completo_funcionario, cargo, setor, status, updatorUserId});
  
  if (!matricula || !String(matricula).trim() || !nome_completo_funcionario || !String(nome_completo_funcionario).trim()) {
    throw new Error("Matrícula e Nome Completo do Funcionário são obrigatórios.");
  }
  // A trigger "trigger_set_timestamp_geral" cuidará do updated_at na tabela funcionarios
  const sql = `
    UPDATE funcionarios 
    SET matricula = $1, nome_completo_funcionario = $2, cargo = $3, setor = $4, status = $5
    /* , updated_by_user_id = $7 -- se a tabela funcionarios tivesse essa coluna */
    WHERE id_funcionario = $6
    RETURNING *;`;
  const params = [
    String(matricula).trim(), 
    String(nome_completo_funcionario).trim(), 
    cargo || null, 
    setor || null, 
    status, 
    id_funcionario
    /* , updatorUserId */
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

// Implementando o soft delete (mudando status para FALSE)
export async function deleteFuncionario(id_funcionario, adminUserId = null) {
  console.log(`[funcionariosDB.js] deleteFuncionario: Usuário ${adminUserId || '(sistema)'} inativando funcionário ID ${id_funcionario}.`);
  const sql = `UPDATE funcionarios SET status = FALSE, updated_at = NOW() WHERE id_funcionario = $1 AND status = TRUE RETURNING id_funcionario;`;
  const params = [id_funcionario];
  const result = await executeQuery(sql, params);
  if (result.rowCount === 0) {
    const checkExists = await executeQuery("SELECT status FROM funcionarios WHERE id_funcionario = $1", [id_funcionario]);
    if(checkExists.rowCount === 0) throw new Error(`Funcionário com ID ${id_funcionario} não encontrado.`);
    if(checkExists.rows[0].status === false) {
        return { changes: 0, message: "Funcionário já estava inativo." };
    }
  }
  return { changes: result.rowCount };
}

console.log("[funcionariosDB.js] Funções CRUD de funcionários exportadas.");