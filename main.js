// main.js (Electron - Processo Principal)
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("--- MAIN.JS INICIADO (vComUserManagementTotal) ---");

import {
    connectDatabase, createTables, getAllPecas,
    insertPeca as dbModuleInsertPeca, updatePeca as dbModuleUpdatePeca,
    deletePeca as dbModuleDeletePeca, getRequestedPecas,
    findUserByUsername, insertUser as dbModuleInsertUser,
    getAllUsers as dbModuleGetAllUsers, getUsersByRole as dbModuleGetUsersByRole,
    updateUserPassword as dbModuleUpdateUserPassword,
    updateUserFullDetails as dbModuleUpdateUserFullDetails,
    adminResetUserPassword as dbModuleAdminResetUserPassword,
    deleteUser as dbModuleDeleteUser
} from './localDatabase.js';

let currentUserSession = null;

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(storedPasswordHash, providedPassword) {
    if (!storedPasswordHash || !providedPassword) return false;
    const parts = storedPasswordHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    try {
        const hash = crypto.pbkdf2Sync(providedPassword, salt, 1000, 64, 'sha512').toString('hex');
        return key === hash;
    } catch (e) {
        console.error("[MAIN PROCESS] verifyPassword: erro durante pbkdf2Sync:", e.message);
        return false;
    }
}

async function initializeAppDatabaseAndUser() {
    console.log("[MAIN PROCESS] Iniciando conexão com DB e criação de tabelas...");
    await connectDatabase();
    await createTables();
    console.log("[MAIN PROCESS] DB conectado e tabelas verificadas/criadas.");

    console.log("[MAIN PROCESS] Verificando/Criando usuário master 'admin'...");
    try {
        const adminUser = await findUserByUsername('admin');
        if (!adminUser) {
            console.log("[MAIN PROCESS] Usuário 'admin' não encontrado. Criando...");
            const masterUsername = 'admin';
            const masterPassword = 'admin'; // MUDE EM PRODUÇÃO!
            const masterRole = 'administrador';
            const hashedPassword = hashPassword(masterPassword);
            await dbModuleInsertUser(masterUsername, hashedPassword, masterRole, 1); // Admin master pode aprovar pedidos
            console.log(`[MAIN PROCESS] Usuário master '${masterUsername}' criado com can_approve_purchase_orders=true. ATENÇÃO: SENHA PADRÃO!`);
        } else {
            console.log("[MAIN PROCESS] Usuário 'admin' já existe.");
            if (adminUser.can_approve_purchase_orders !== 1 && adminUser.id === 1) { // Garante que o admin master ID 1 tenha a permissão
                console.log("[MAIN PROCESS] Atualizando admin master (ID 1) para poder aprovar pedidos.");
                await dbModuleUpdateUserFullDetails(adminUser.id, { can_approve_purchase_orders: 1 });
            }
        }
    } catch (error) {
        console.error("[MAIN PROCESS] Erro severo ao verificar/criar usuário master:", error);
        throw error; 
    }
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200, height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, contextIsolation: true,
        },
    });
    console.log("[MAIN PROCESS] Janela principal criada.");
    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        mainWindow.loadURL('http://localhost:5173/');
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(async () => {
    console.log("[MAIN PROCESS] App pronto. Inicializando DB...");
    try {
        await initializeAppDatabaseAndUser();
        console.log("[MAIN PROCESS] Inicialização do banco de dados e usuário master concluída. Criando janela...");
        createWindow();
    } catch (error) {
        console.error("[MAIN PROCESS] ERRO CRÍTICO DURANTE A INICIALIZAÇÃO DO APP:", error);
        dialog.showErrorBox("Erro Crítico de Inicialização", "Não foi possível iniciar a aplicação: " + (error.message || "Erro desconhecido"));
        app.quit();
        return;
    }

    // --- IPC Handlers para Peças ---
    ipcMain.handle('pecas:fetch-all', async () => { try { return await getAllPecas(); } catch (e) {console.error("[IPC:pecas:fetch-all] Erro:", e.message); throw e;} });
    ipcMain.handle('pecas:insert', async (event, peca) => { if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado."); try { return await dbModuleInsertPeca(peca); } catch (e) {console.error("[IPC:pecas:insert] Erro:", e.message); throw e;} });
    ipcMain.handle('pecas:update', async (event, id, peca) => { if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado."); try { return await dbModuleUpdatePeca(id, peca); } catch (e) {console.error("[IPC:pecas:update] Erro:", e.message); throw e;} });
    ipcMain.handle('pecas:delete', async (event, id) => { if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado."); try { return await dbModuleDeletePeca(id); } catch (e) {console.error("[IPC:pecas:delete] Erro:", e.message); throw e;} });
    ipcMain.handle('pecas:fetch-requested', async () => { try { return await getRequestedPecas(); } catch (e) {console.error("[IPC:pecas:fetch-requested] Erro:", e.message); throw e;} });

    // --- IPC Handlers para Autenticação ---
    ipcMain.handle('auth:login', async (event, { username, password }) => {
        try {
            const user = await findUserByUsername(username);
            if (!user || !verifyPassword(user.password_hash, password)) throw new Error("Usuário/senha inválida.");
            currentUserSession = { id: user.id, username: user.username, role: user.role, can_approve_purchase_orders: Boolean(user.can_approve_purchase_orders) };
            console.log(`[MAIN PROCESS] Usuário ${username} logado. Sessão:`, currentUserSession);
            return currentUserSession;
        } catch (error) { currentUserSession = null; console.error(`[IPC:auth:login] Erro para ${username}: ${error.message}`); throw error; }
    });
    ipcMain.handle('auth:logout', async () => { const username = currentUserSession?.username; currentUserSession = null; console.log(`[MAIN PROCESS] Usuário ${username || '(nenhum)'} deslogado.`); return { success: true }; });
    ipcMain.handle('auth:get-session', async () => { return currentUserSession; });
    ipcMain.handle('auth:change-password', async (event, { currentPassword, newPassword }) => {
        if (!currentUserSession?.id) throw new Error("Nenhum usuário logado.");
        if (!currentPassword || !newPassword || newPassword.length < 6) throw new Error("Dados inválidos.");
        try {
            const userFromDb = await findUserByUsername(currentUserSession.username);
            if (!userFromDb || !verifyPassword(userFromDb.password_hash, currentPassword)) throw new Error("Senha atual incorreta.");
            const newPasswordHash = hashPassword(newPassword);
            await dbModuleUpdateUserPassword(currentUserSession.id, newPasswordHash);
            return { success: true, message: "Senha alterada!" };
        } catch (error) { console.error(`[IPC:auth:change-password] Erro para ${currentUserSession.username}:`, error); throw error; }
    });

    // --- IPC Handlers para GERENCIAMENTO DE USUÁRIOS ---
    ipcMain.handle('users:create', async (event, { username, password, role, can_approve_purchase_orders }) => {
        console.log("[MAIN PROCESS] IPC 'users:create' - Dados:", {username, role, can_approve_purchase_orders});
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Criar usuários é permitido apenas para Administradores ou Gerentes.");
        }

        let finalRole = role;
        let finalCanApprove = can_approve_purchase_orders ? 1 : 0;

        if (currentUserSession.role === 'gerente') {
            if (role === 'administrador' || role === 'gerente') {
                throw new Error("Acesso negado: Gerentes podem criar apenas usuários 'funcionário'.");
            }
            finalRole = 'funcionario'; // Garante que gerente só crie funcionário
            finalCanApprove = 0; // Gerente não pode dar permissão de aprovar financeiro
            console.log("[MAIN PROCESS] 'users:create' - Gerente criando. Forçando papel para 'funcionario' e can_approve_purchase_orders para false.");
        }
        // Admin pode criar qualquer papel e definir can_approve_purchase_orders
        
        try {
            const existingUser = await findUserByUsername(username);
            if (existingUser) throw new Error(`Nome de usuário '${username}' já existe.`);
            
            const hashedPassword = hashPassword(password);
            return await dbModuleInsertUser(username, hashedPassword, finalRole, finalCanApprove);
        } catch (error) {
            console.error("[IPC:users:create] Erro:", error.message);
            throw error;
        }
    });

    ipcMain.handle('users:fetch-all', async () => {
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado.");
        }
        try {
            let users;
            if (currentUserSession.role === 'administrador') {
                users = await dbModuleGetAllUsers();
            } else { // Gerente só vê funcionários
                users = await dbModuleGetUsersByRole('funcionario');
            }
            return users;
        } catch (error) { console.error("[IPC:users:fetch-all] Erro:", error.message); throw error; }
    });

    ipcMain.handle('users:update-details', async (event, { userId, username, role, can_approve_purchase_orders }) => {
        console.log("[MAIN PROCESS] IPC 'users:update-details' para UserID:", userId, "Dados:", {username, role, can_approve_purchase_orders});
        if (currentUserSession?.role !== 'administrador') {
            throw new Error("Acesso negado: Apenas administradores podem atualizar detalhes.");
        }
        if (Number(userId) === 1 && role && role !== 'administrador') {
             throw new Error("O administrador principal não pode ter seu papel alterado para não-administrador.");
        }
        if (Number(userId) === 1 && (can_approve_purchase_orders === false || can_approve_purchase_orders === 0) ) {
             throw new Error("O administrador principal deve manter a permissão de aprovar pedidos.");
        }
        try {
            if (username) {
                const targetUser = await findUserByUsername(username);
                if (targetUser && targetUser.id !== Number(userId)) {
                    throw new Error(`O nome de usuário '${username}' já está em uso.`);
                }
            }
            return await dbModuleUpdateUserFullDetails(Number(userId), { username, role, can_approve_purchase_orders });
        } catch (error) { console.error("[IPC:users:update-details] Erro:", error.message); throw error; }
    });

    ipcMain.handle('users:admin-reset-password', async (event, { userId, newPassword }) => {
        if (currentUserSession?.role !== 'administrador') throw new Error("Acesso negado.");
        if (!newPassword || newPassword.length < 6) throw new Error("Nova senha inválida.");
        try {
            const newPasswordHash = hashPassword(newPassword);
            return await dbModuleAdminResetUserPassword(Number(userId), newPasswordHash);
        } catch (error) { console.error("[IPC:users:admin-reset-password] Erro:", error.message); throw error; }
    });
    
    ipcMain.handle('users:delete', async (event, userIdToDelete) => {
        if (currentUserSession?.role !== 'administrador') throw new Error("Acesso negado.");
        if (Number(userIdToDelete) === 1) throw new Error("Admin master não pode ser excluído.");
        if (currentUserSession.id === Number(userIdToDelete)) throw new Error("Admin não pode excluir a si mesmo.");
        try { return await dbModuleDeleteUser(Number(userIdToDelete)); } 
        catch (error) { console.error("[IPC:users:delete] Erro:", error.message); throw error; }
    });
    
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
console.log("[MAIN PROCESS] Fim da configuração do script main.js.");