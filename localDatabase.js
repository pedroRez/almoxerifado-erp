// localDatabase.js
import sqlite3_module from 'sqlite3';
import path from 'path';
import { app } from 'electron';

const sqlite3 = sqlite3_module.verbose();

console.log("[localDatabase.js] Script carregado. vComUserManagementCompleto_Final");

let dbPath = null;
let db;

export function connectDatabase() {
    if (!dbPath) {
        try {
            const userDataPath = app.getPath('userData');
            if (!userDataPath) {
                console.error("[localDatabase.js] ERRO CRÍTICO: app.getPath('userData') retornou indefinido ou vazio!");
                return Promise.reject(new Error("Não foi possível obter o caminho userData."));
            }
            dbPath = path.join(userDataPath, 'almoxarifado.db');
            console.log("[localDatabase.js] Caminho do banco de dados definido como:", dbPath);
        } catch (e) {
            console.error("[localDatabase.js] ERRO CRÍTICO ao tentar obter userData path:", e);
            return Promise.reject(e);
        }
    }

    console.log("[localDatabase.js] Tentando conectar/criar banco de dados em:", dbPath);
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error('[localDatabase.js] Erro ao conectar/criar banco SQLite:', err.message, err);
                reject(err);
            } else {
                console.log('[localDatabase.js] Conectado/criado banco de dados SQLite em:', dbPath);
                db.run("PRAGMA foreign_keys = ON;", (pragmaErrFk) => {
                    if (pragmaErrFk) console.warn("[localDatabase.js] Aviso: Falha ao definir PRAGMA foreign_keys = ON:", pragmaErrFk.message);
                    else console.log("[localDatabase.js] PRAGMA foreign_keys = ON definido.");
                });
                db.run("PRAGMA journal_mode = WAL;", (pragmaErrWal) => {
                    if (pragmaErrWal) console.warn("[localDatabase.js] Aviso: Falha ao definir PRAGMA journal_mode = WAL:", pragmaErrWal.message);
                    else console.log("[localDatabase.js] PRAGMA journal_mode = WAL definido.");
                    resolve();
                });
            }
        });
    });
}

export function createTables() {
    console.log("[localDatabase.js] Tentando criar/verificar tabelas...");
    const createPecasTable = `
        CREATE TABLE IF NOT EXISTS pecas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            tipo TEXT,
            fabricante TEXT,
            estoque_atual INTEGER DEFAULT 0,
            estoque_minimo INTEGER DEFAULT 0 
        );
    `;
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('administrador', 'gerente', 'funcionario')),
            can_approve_purchase_orders BOOLEAN DEFAULT 0 NOT NULL 
        );
    `;

    return new Promise((resolve, reject) => {
        if (!db) {
            const errMessage = "[localDatabase.js] ERRO: Banco de dados não conectado antes de chamar createTables.";
            console.error(errMessage);
            return reject(new Error(errMessage));
        }
        db.serialize(() => {
            console.log("[localDatabase.js] Executando CREATE TABLE para 'pecas'...");
            db.run(createPecasTable, (errPecas) => {
                if (errPecas) {
                    console.error('[localDatabase.js] Erro ao criar/verificar tabela "pecas":', errPecas.message);
                } else {
                    console.log('[localDatabase.js] Tabela "pecas" (com nome UNIQUE) verificada/criada.');
                }
                
                console.log("[localDatabase.js] Executando CREATE TABLE para 'users'...");
                db.run(createUsersTable, (errUsers) => {
                    if (errUsers) {
                        console.error('[localDatabase.js] Erro ao criar/verificar tabela "users":', errUsers.message);
                        return reject(errUsers); 
                    }
                    console.log('[localDatabase.js] Tabela "users" (com can_approve_purchase_orders) verificada/criada.');
                    
                    if(errPecas && !errUsers) {
                        // Se houve erro em pecas mas não em users, ainda podemos ter um problema.
                        // Considerar se deve rejeitar ou apenas logar e continuar.
                        // Por segurança, se uma tabela essencial como 'pecas' falhar na criação, pode ser melhor rejeitar.
                        console.warn("[localDatabase.js] Tabela 'pecas' pode não ter sido criada corretamente, mas 'users' foi.");
                        // return reject(new Error("Falha ao criar tabela pecas, mas users pode ter sido criada. Verifique os logs."));
                    }
                    if(errPecas && errUsers) return reject(new Error("Falha ao criar tabela pecas e users. Verifique os logs."));
                    resolve();
                });
            });
        });
    });
}

// --- Funções para 'pecas' ---
export function getAllPecas() {
    console.log("[localDatabase.js] FUNÇÃO getAllPecas INICIADA.");
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] getAllPecas: DB não conectado."); return reject(new Error("DB não conectado em getAllPecas")); }
        db.all("SELECT * FROM pecas ORDER BY nome ASC", [], (err, rows) => {
            if (err) { console.error("[localDatabase.js] ERRO SQLite em getAllPecas:", err.message); reject(err); } 
            else { console.log("[localDatabase.js] SUCESSO SQLite getAllPecas retornou:", rows ? rows.length : 0, "linhas."); resolve(rows || []); }
        });
    });
}

export function insertPeca(peca) {
    console.log("[localDatabase.js] FUNÇÃO insertPeca INICIADA. Dados recebidos:", peca);
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] insertPeca: DB não conectado."); return reject(new Error("DB não conectado em insertPeca")); }
        const { nome, tipo, fabricante, estoque_atual, estoque_minimo } = peca;
        const sql = "INSERT INTO pecas (nome, tipo, fabricante, estoque_atual, estoque_minimo) VALUES (?, ?, ?, ?, ?)";
        const qNome = nome ? String(nome).trim() : '';
        if (!qNome) { const errMsg = "Nome da peça é obrigatório."; console.error("[localDatabase.js] insertPeca:", errMsg); return reject(new Error(errMsg)); }
        const qTipo = tipo || '';
        const qFabricante = fabricante || '';
        const qEstoqueAtual = Number.isFinite(parseInt(estoque_atual)) ? parseInt(estoque_atual) : 0;
        const qEstoqueMinimo = Number.isFinite(parseInt(estoque_minimo)) ? parseInt(estoque_minimo) : 0;
        console.log("[localDatabase.js] insertPeca - Dados para SQL:", [qNome, qTipo, qFabricante, qEstoqueAtual, qEstoqueMinimo]);
        db.run(sql, [qNome, qTipo, qFabricante, qEstoqueAtual, qEstoqueMinimo], function(err) {
            if (err) { 
                console.error("[localDatabase.js] ERRO SQLite ao executar INSERT em 'pecas':", err.message);
                if (err.message.includes("UNIQUE constraint failed: pecas.nome")) { return reject(new Error(`Já existe uma peça com o nome '${qNome}'.`)); }
                reject(err); 
            } else { const insertedData = { id: this.lastID, nome: qNome, tipo: qTipo, fabricante: qFabricante, estoque_atual: qEstoqueAtual, estoque_minimo: qEstoqueMinimo }; console.log("[localDatabase.js] SUCESSO SQLite INSERT em 'pecas'. Nova linha:", insertedData); resolve(insertedData); }
        });
    });
}

export function updatePeca(id, peca) {
    console.log("[localDatabase.js] FUNÇÃO updatePeca INICIADA. ID:", id, "Dados:", peca);
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] updatePeca: DB não conectado."); return reject(new Error("DB não conectado em updatePeca")); }
        const { nome, tipo, fabricante, estoque_atual, estoque_minimo } = peca;
        const sql = "UPDATE pecas SET nome = ?, tipo = ?, fabricante = ?, estoque_atual = ?, estoque_minimo = ? WHERE id = ?";
        const qNome = nome ? String(nome).trim() : '';
        if (!qNome) { const errMsg = "Nome da peça é obrigatório."; console.error("[localDatabase.js] updatePeca:", errMsg); return reject(new Error(errMsg)); }
        const qTipo = tipo || '';
        const qFabricante = fabricante || '';
        const qEstoqueAtual = Number.isFinite(parseInt(estoque_atual)) ? parseInt(estoque_atual) : 0;
        const qEstoqueMinimo = Number.isFinite(parseInt(estoque_minimo)) ? parseInt(estoque_minimo) : 0;
        console.log("[localDatabase.js] updatePeca - Dados para SQL:", [qNome, qTipo, qFabricante, qEstoqueAtual, qEstoqueMinimo, id]);
        db.run(sql, [qNome, qTipo, qFabricante, qEstoqueAtual, qEstoqueMinimo, id], function(err) {
            if (err) { 
                console.error("[localDatabase.js] ERRO SQLite ao executar UPDATE em 'pecas':", err.message); 
                if (err.message.includes("UNIQUE constraint failed: pecas.nome")) { return reject(new Error(`Já existe outra peça com o nome '${qNome}'.`)); }
                reject(err); 
            } else { 
                if (this.changes === 0) console.warn(`[localDatabase.js] updatePeca: Nenhuma peça encontrada com ID ${id} para atualizar.`);
                console.log("[localDatabase.js] SUCESSO SQLite UPDATE em 'pecas'. Alterações:", this.changes); resolve({ changes: this.changes }); 
            }
        });
    });
}

export function deletePeca(id) {
    console.log("[localDatabase.js] FUNÇÃO deletePeca INICIADA. ID:", id);
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] deletePeca: DB não conectado."); return reject(new Error("DB não conectado em deletePeca")); }
        db.run("DELETE FROM pecas WHERE id = ?", [id], function(err) {
            if (err) { console.error("[localDatabase.js] ERRO SQLite em deletePeca:", err.message); reject(err); } 
            else { 
                if (this.changes === 0) console.warn(`[localDatabase.js] deletePeca: Nenhuma peça encontrada com ID ${id}.`);
                console.log("[localDatabase.js] SUCESSO SQLite deletePeca. Alterações:", this.changes); resolve({ changes: this.changes }); 
            }
        });
    });
}

export function getRequestedPecas() {
    console.log("[localDatabase.js] FUNÇÃO getRequestedPecas INICIADA (para gráfico App.jsx)...");
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] getRequestedPecas: DB não conectado."); return reject(new Error("DB não conectado em getRequestedPecas")); }
        const sql = `SELECT nome, estoque_atual, estoque_minimo FROM pecas ORDER BY nome ASC`;
        db.all(sql, (err, rows) => {
            if (err) { console.error("[localDatabase.js] ERRO SQLite em getRequestedPecas:", err.message); reject(err); } 
            else { const formattedRows = (rows || []).map(r => ({ nome: r.nome, quantidade: r.estoque_atual, estoque_atual: r.estoque_atual, estoque_minimo: r.estoque_minimo })); console.log("[localDatabase.js] SUCESSO SQLite getRequestedPecas retornou (formatado):", formattedRows.length, "linhas."); resolve(formattedRows); }
        });
    });
}

// --- Funções para USUÁRIOS ---
export function findUserByUsername(username) {
    console.log("[localDatabase.js] FUNÇÃO findUserByUsername. Usuário:", username);
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] findUserByUsername: DB não conectado."); return reject(new Error("DB não conectado")); }
        const sql = `SELECT id, username, password_hash, role, can_approve_purchase_orders FROM users WHERE username = ?`;
        db.get(sql, [username], (err, row) => {
            if (err) { console.error("[localDatabase.js] ERRO SQLite em findUserByUsername:", err.message); reject(err); } 
            else { resolve(row); }
        });
    });
}

export function insertUser(username, passwordHash, role, canApproveOrders = 0) {
    console.log("[localDatabase.js] FUNÇÃO insertUser. Dados:", {username, role, canApproveOrders});
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] insertUser: DB não conectado."); return reject(new Error("DB não conectado")); }
        const sql = `INSERT INTO users (username, password_hash, role, can_approve_purchase_orders) VALUES (?, ?, ?, ?)`;
        db.run(sql, [username, passwordHash, role, canApproveOrders ? 1 : 0], function(err) {
            if (err) { 
                console.error("[localDatabase.js] ERRO SQLite em insertUser:", err.message); 
                if (err.message.includes("UNIQUE constraint failed")) { return reject(new Error(`Nome de usuário '${username}' já existe.`));}
                reject(err); 
            } 
            else { const newUser = { id: this.lastID, username, role, can_approve_purchase_orders: canApproveOrders ? 1 : 0 }; console.log("[localDatabase.js] SUCESSO SQLite insertUser. ID:", this.lastID, "Novo usuário:", newUser); resolve(newUser); }
        });
    });
}

export function getAllUsers() {
    console.log("[localDatabase.js] FUNÇÃO getAllUsers INICIADA.");
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] getAllUsers: DB não conectado."); return reject(new Error("DB não conectado")); }
        const sql = `SELECT id, username, role, can_approve_purchase_orders FROM users ORDER BY username ASC`;
        db.all(sql, [], (err, rows) => {
            if (err) { console.error("[localDatabase.js] ERRO SQLite em getAllUsers:", err.message); reject(err); } 
            else { console.log("[localDatabase.js] SUCESSO SQLite getAllUsers retornou:", rows ? rows.length : 0, "linhas."); resolve(rows || []); }
        });
    });
}

export function getUsersByRole(role) {
    console.log(`[localDatabase.js] FUNÇÃO getUsersByRole. Buscando papel: ${role}`);
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] getUsersByRole: DB não conectado."); return reject(new Error("DB não conectado")); }
        const sql = `SELECT id, username, role, can_approve_purchase_orders FROM users WHERE role = ? ORDER BY username ASC`;
        db.all(sql, [role], (err, rows) => {
            if (err) { console.error(`[localDatabase.js] ERRO SQLite em getUsersByRole (${role}):`, err.message); reject(err); } 
            else { console.log(`[localDatabase.js] SUCESSO SQLite getUsersByRole (${role}) retornou:`, rows ? rows.length : 0, "linhas."); resolve(rows || []); }
        });
    });
}

export function updateUserPassword(userId, newPasswordHash) {
    console.log(`[localDatabase.js] FUNÇÃO updateUserPassword. UserID: ${userId}`);
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] updateUserPassword: DB não conectado."); return reject(new Error("DB não conectado")); }
        const sql = `UPDATE users SET password_hash = ? WHERE id = ?`;
        db.run(sql, [newPasswordHash, userId], function(err) {
            if (err) { console.error("[localDatabase.js] ERRO SQLite em updateUserPassword:", err.message); reject(err); } 
            else { 
                if (this.changes === 0) { console.warn(`[localDatabase.js] updateUserPassword: Nenhum usuário encontrado com ID ${userId}.`); return reject(new Error(`Usuário com ID ${userId} não encontrado.`)); }
                console.log(`[localDatabase.js] SUCESSO SQLite updateUserPassword para UserID: ${userId}. Alterações: ${this.changes}`); resolve({ changes: this.changes }); 
            }
        });
    });
}

export function updateUserFullDetails(userId, { username, role, can_approve_purchase_orders }) {
    console.log(`[localDatabase.js] FUNÇÃO updateUserFullDetails para UserID: ${userId}. Dados:`, { username, role, can_approve_purchase_orders });
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] updateUserFullDetails: DB não conectado."); return reject(new Error("DB não conectado")); }

        let sqlParts = [];
        let params = [];

        // Apenas adiciona ao UPDATE se o valor foi fornecido (não é undefined)
        if (username !== undefined) {
            const trimmedUsername = String(username).trim();
            if (!trimmedUsername) return reject(new Error("Nome de usuário não pode ser vazio ao atualizar."));
            sqlParts.push("username = ?");
            params.push(trimmedUsername);
        }
        if (role !== undefined) {
            if (!['administrador', 'gerente', 'funcionario'].includes(role)) return reject(new Error("Papel inválido fornecido."));
            sqlParts.push("role = ?");
            params.push(role);
        }
        if (can_approve_purchase_orders !== undefined) {
            sqlParts.push("can_approve_purchase_orders = ?");
            params.push(can_approve_purchase_orders ? 1 : 0);
        }

        if (sqlParts.length === 0) {
            console.warn("[localDatabase.js] updateUserFullDetails: Nenhum campo válido fornecido para atualização.");
            return resolve({ changes: 0, message: "Nenhum dado válido para atualizar." });
        }

        const sql = `UPDATE users SET ${sqlParts.join(", ")} WHERE id = ?`;
        params.push(userId);

        console.log("[localDatabase.js] updateUserFullDetails - SQL:", sql, "Params:", params);
        db.run(sql, params, function(err) {
            if (err) {
                console.error("[localDatabase.js] ERRO SQLite em updateUserFullDetails:", err.message);
                if (err.message.includes("UNIQUE constraint failed: users.username")) {
                    return reject(new Error(`Nome de usuário '${username}' já está em uso.`));
                }
                reject(err);
            } else {
                if (this.changes === 0) console.warn(`[localDatabase.js] updateUserFullDetails: Nenhum usuário encontrado com ID ${userId} ou nenhum dado alterado.`);
                console.log(`[localDatabase.js] SUCESSO SQLite updateUserFullDetails para UserID: ${userId}. Alterações: ${this.changes}`);
                resolve({ changes: this.changes, message: "Detalhes do usuário atualizados." });
            }
        });
    });
}

export function adminResetUserPassword(targetUserId, newPasswordHash) {
    console.log(`[localDatabase.js] FUNÇÃO adminResetUserPassword. Resetando senha para UserID: ${targetUserId}`);
     return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] adminResetUserPassword: DB não conectado."); return reject(new Error("DB não conectado")); }
        const sql = `UPDATE users SET password_hash = ? WHERE id = ?`;
        db.run(sql, [newPasswordHash, targetUserId], function(err) {
            if (err) { console.error("[localDatabase.js] ERRO SQLite em adminResetUserPassword:", err.message); reject(err); } 
            else { 
                if (this.changes === 0) return reject(new Error(`Usuário alvo com ID ${targetUserId} não encontrado para reset de senha.`));
                console.log(`[localDatabase.js] SUCESSO SQLite adminResetUserPassword para UserID: ${targetUserId}. Alterações: ${this.changes}`); resolve({ changes: this.changes }); 
            }
        });
    });
}

export function deleteUser(id) {
    console.log(`[localDatabase.js] FUNÇÃO deleteUser. ID: ${id}`);
    return new Promise((resolve, reject) => {
        if (!db) { console.error("[localDatabase.js] deleteUser: DB não conectado."); return reject(new Error("DB não conectado")); }
        const sql = `DELETE FROM users WHERE id = ?`;
        db.run(sql, [id], function(err) {
            if (err) { console.error("[localDatabase.js] ERRO SQLite em deleteUser:", err.message); reject(err); } 
            else { 
                if (this.changes === 0) console.warn(`[localDatabase.js] deleteUser: Nenhum usuário encontrado com ID ${id}.`);
                console.log("[localDatabase.js] SUCESSO SQLite deleteUser. Alterações:", this.changes); resolve({ changes: this.changes }); 
            }
        });
    });
}
console.log("[localDatabase.js] Fim do script.");