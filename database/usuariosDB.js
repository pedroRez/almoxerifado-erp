// database/usuariosDB.js
import { executeQuery } from './dbUtils.js';
import pool from './dbConfig.js'; // Import pool para transações se necessário

console.log("[usuariosDB.js] Script carregado. vFinalCompleta");

export async function findUserByUsername(username) {
  // console.log("[usuariosDB.js] findUserByUsername: Buscando usuário:", username);
  const sql = `
    SELECT id, username, nome_completo, password_hash, role, can_approve_purchase_orders 
    FROM users 
    WHERE username = $1 AND is_deleted = FALSE;`;
  const result = await executeQuery(sql, [username]);
  return result.rows[0];
}

export async function insertUser(username, nome_completo, passwordHash, role, canApproveOrders = false, creatorUserId = null) {
  // console.log("[usuariosDB.js] insertUser: Inserindo usuário:", {username, nome_completo, role, canApproveOrders, creatorUserId});
  const sql = `
    INSERT INTO users (username, nome_completo, password_hash, role, can_approve_purchase_orders, created_by_user_id, updated_by_user_id) 
    VALUES ($1, $2, $3, $4, $5, $6, $6) 
    RETURNING id, username, nome_completo, role, can_approve_purchase_orders;`;
  const params = [ 
    String(username).trim(), 
    String(nome_completo || '').trim(), 
    passwordHash, 
    role, 
    canApproveOrders ? true : false, 
    creatorUserId 
  ];
  try {
    const result = await executeQuery(sql, params);
    console.log("[usuariosDB.js] insertUser: Usuário inserido:", result.rows[0]);
    return result.rows[0];
  } catch (error) {
     if (error.code === '23505' && (error.constraint === 'users_username_key' || error.constraint === 'users_username_idx')) {
      throw new Error(`Nome de usuário '${username}' já existe.`);
    }
    console.error("[usuariosDB.js] Erro em insertUser:", error.message);
    throw error;
  }
}

export async function getAllUsers() {
  // console.log("[usuariosDB.js] getAllUsers: Buscando todos os usuários não deletados...");
  const sql = `SELECT id, username, nome_completo, role, can_approve_purchase_orders FROM users WHERE is_deleted = FALSE ORDER BY nome_completo ASC;`;
  const result = await executeQuery(sql);
  // console.log("[usuariosDB.js] getAllUsers: Encontrados", result.rowCount, "usuários.");
  return result.rows || [];
}

export async function getUsersByRole(role) {
  // console.log("[usuariosDB.js] getUsersByRole: Buscando usuários com papel:", role);
  const sql = `
    SELECT id, username, nome_completo, role, can_approve_purchase_orders 
    FROM users WHERE role = $1 AND is_deleted = FALSE ORDER BY nome_completo ASC;`;
  const result = await executeQuery(sql, [role]);
  // console.log("[usuariosDB.js] getUsersByRole: Encontrados", result.rowCount, "usuários com papel", role);
  return result.rows || [];
}

export async function updateUserPassword(userId, newPasswordHash) {
  // console.log("[usuariosDB.js] updateUserPassword: Atualizando senha para UserID:", userId);
  // updated_at é atualizado pela trigger trigger_set_timestamp_geral
  const sql = `UPDATE users SET password_hash = $1 WHERE id = $2 AND is_deleted = FALSE;`;
  const result = await executeQuery(sql, [newPasswordHash, userId]);
  if (result.rowCount === 0) {
    throw new Error(`Usuário com ID ${userId} não encontrado ou já deletado para atualização de senha.`);
  }
  return { changes: result.rowCount };
}

export async function updateUserFullDetails(userId, { username, nome_completo, role, can_approve_purchase_orders, updated_by_user_id }) {
  // console.log(`[usuariosDB.js] updateUserFullDetails para UserID: ${userId}. Dados:`, { username, nome_completo, role, can_approve_purchase_orders, updated_by_user_id });
  
  let updateFields = [];
  let params = [];
  let paramCount = 1;

  if (username !== undefined) {
    const trimmedUsername = String(username).trim();
    if (!trimmedUsername) throw new Error("Nome de usuário não pode ser vazio ao atualizar.");
    updateFields.push(`username = $${paramCount++}`);
    params.push(trimmedUsername);
  }
  if (nome_completo !== undefined) {
    updateFields.push(`nome_completo = $${paramCount++}`);
    params.push(String(nome_completo || '').trim());
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
  if (updated_by_user_id !== undefined) {
    updateFields.push(`updated_by_user_id = $${paramCount++}`);
    params.push(updated_by_user_id);
  }

  if (updateFields.length === 0) {
    return { changes: 0, message: "Nenhum dado válido para atualizar." };
  }
  // updated_at é atualizado pela trigger "trigger_set_timestamp_geral"

  params.push(userId);
  const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${paramCount} AND is_deleted = FALSE RETURNING *;`;
  
  try {
    const result = await executeQuery(sql, params);
    if (result.rowCount === 0) throw new Error(`Usuário com ID ${userId} não encontrado ou já deletado para atualização.`);
    const user = result.rows[0];
    const updatedUser = {...user, can_approve_purchase_orders: Boolean(user.can_approve_purchase_orders)};
    return updatedUser;
  } catch (error) {
    if (error.code === '23505' && (error.constraint === 'users_username_key' || error.constraint === 'users_username_idx')) {
      throw new Error(`Nome de usuário '${username}' já está em uso.`);
    }
    console.error("[usuariosDB.js] Erro em updateUserFullDetails:", error.message);
    throw error;
  }
}

export async function adminResetUserPassword(targetUserId, newPasswordHash, admin_user_id) {
  // console.log(`[usuariosDB.js] adminResetUserPassword: Admin ${admin_user_id} resetando senha para UserID: ${targetUserId}`);
  const sql = `UPDATE users SET password_hash = $1, updated_by_user_id = $2 /* updated_at é pela trigger */ WHERE id = $3 AND is_deleted = FALSE;`;
  const result = await executeQuery(sql, [newPasswordHash, admin_user_id, targetUserId]);
  if (result.rowCount === 0) throw new Error(`Usuário alvo com ID ${targetUserId} não encontrado ou já deletado.`);
  return { changes: result.rowCount };
}

export async function deleteUser(id_to_delete, admin_user_id) {
  // console.log(`[usuariosDB.js] deleteUser: Usuário ID ${admin_user_id} marcando usuário ID ${id_to_delete} como deletado.`);
  const sql = `UPDATE users SET is_deleted = TRUE, deleted_at = NOW(), deleted_by_user_id = $1 /* updated_at é pela trigger */ WHERE id = $2 AND is_deleted = FALSE RETURNING id;`;
  const result = await executeQuery(sql, [admin_user_id, id_to_delete]);
  if (result.rowCount === 0) throw new Error(`Usuário com ID ${id_to_delete} não encontrado ou já deletado.`);
  return { changes: result.rowCount };
}

console.log("[usuariosDB.js] Funções CRUD de usuários exportadas.");