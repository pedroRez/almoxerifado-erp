// main.js (Electron - Processo Principal)
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`--- MAIN.JS INICIADO (vComDatabaseDir_CorrigidoImportDBUtils) --- [${new Date().toLocaleTimeString()}]`);

// Importando da nova estrutura em database/
import { testConnection } from './database/dbUtils.js'; // Agora deve encontrar a função exportada
import { initializeDatabaseSchema } from './database/dbSchema.js';

import {
    getAllPecas, insertPeca, updatePeca, deletePeca, getRequestedPecas
} from './database/estoqueDB.js';

import {
    findUserByUsername, insertUser, getAllUsers, getUsersByRole,
    updateUserPassword, updateUserFullDetails, adminResetUserPassword, deleteUser
} from './database/usuariosDB.js';

import {
    getAllFuncionarios, insertFuncionario, updateFuncionario, deleteFuncionario
} from './database/funcionariosDB.js';

import {
    getAllOrdensServico, insertOrdemServico
} from './database/ordensServicoDB.js';

let currentUserSession = null;

function hashPassword(password) {
    if (!password) throw new Error("Senha não pode ser vazia para hashing.");
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
    } catch (e) { console.error("[MAIN] verifyPassword erro:", e.message); return false; }
}

async function initializeApp() {
    console.log("[MAIN] Testando conexão com PostgreSQL...");
    await testConnection();
    console.log("[MAIN] Verificando/Criando schema do banco (tabelas IF NOT EXISTS)...");
    await initializeDatabaseSchema();
    console.log("[MAIN] Schema do banco verificado/criado.");

    console.log("[MAIN] Verificando/Criando usuário master 'admin'...");
    try {
        const adminUser = await findUserByUsername('admin');
        if (!adminUser) {
            console.log("[MAIN] Usuário 'admin' não encontrado. Criando...");
            const hashedPassword = hashPassword('admin');
            await insertUser('admin', 'Administrador Master', hashedPassword, 'administrador', true, null); 
            console.log("[MAIN] Usuário master 'admin' criado.");
        } else {
            console.log("[MAIN] Usuário 'admin' já existe.");
            let detailsToUpdate = {};
            if (adminUser.id === 1 && adminUser.can_approve_purchase_orders !== true) {
                detailsToUpdate.can_approve_purchase_orders = true;
            }
            if (adminUser.id === 1 && !adminUser.nome_completo) {
                 detailsToUpdate.nome_completo = 'Administrador Master';
            }
            if (Object.keys(detailsToUpdate).length > 0) {
                await updateUserFullDetails(adminUser.id, {...detailsToUpdate, updated_by_user_id: adminUser.id });
            }
        }
    } catch (error) { console.error("[MAIN] Erro ao verificar/criar usuário master:", error); throw error; }
}

// main.js (Electron - Processo Principal)

// ... outros imports e código ...

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280, // Define uma largura inicial razoável
        height: 820, // Define uma altura inicial razoável
        show: false, // <<< ADICIONE: Inicia a janela invisível
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    console.log("[MAIN PROCESS] Janela principal criada (invisível inicialmente).");

    // Maximiza a janela ANTES de mostrá-la
    mainWindow.maximize(); // <<< ADICIONE
    mainWindow.show();      // <<< ADICIONE: Mostra a janela já maximizada
    console.log("[MAIN PROCESS] Janela maximizada e exibida.");


    if (app.isPackaged) {
        console.log("[MAIN PROCESS] App empacotado. Carregando 'dist/index.html'.");
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        const viteDevServerUrl = 'http://localhost:5173/';
        console.log("[MAIN PROCESS] App em desenvolvimento. Carregando de:", viteDevServerUrl);
        mainWindow.loadURL(viteDevServerUrl);
        // mainWindow.webContents.openDevTools(); // Mantido comentado conforme seu pedido
    }
}

app.whenReady().then(async () => {
    console.log("[MAIN] App pronto. Inicializando...");
    try {
        await initializeApp();
        console.log("[MAIN] Inicialização completa. Criando janela...");
        createWindow();
    } catch (error) {
        console.error("[MAIN] ERRO CRÍTICO INICIALIZAÇÃO:", error);
        dialog.showErrorBox("Erro Crítico", "Falha na inicialização: " + (error.message || "Erro desconhecido"));
        app.quit(); return;
    }

    // --- IPC Handlers para Peças (Estoque) ---
    ipcMain.handle('pecas:fetch-all', async () => { try { return await getAllPecas(); } catch (e) {console.error("[IPC:pecas:fetch-all] Erro:", e.message); throw e;} });
    ipcMain.handle('pecas:insert', async (event, pecaData) => { if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado."); const payload = { ...pecaData, usuario_id: currentUserSession.id }; try { return await insertPeca(payload); } catch (e) {console.error("[IPC:pecas:insert] Erro:", e.message); throw e;} });
    ipcMain.handle('pecas:update', async (event, id_sync, pecaData) => { if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado."); const payload = { ...pecaData, usuario_id: currentUserSession.id }; try { return await updatePeca(id_sync, payload); } catch (e) {console.error("[IPC:pecas:update] Erro:", e.message); throw e;} });
    ipcMain.handle('pecas:delete', async (event, id_sync) => { if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado."); try { return await deletePeca(id_sync, currentUserSession.id); } catch (e) {console.error("[IPC:pecas:delete] Erro:", e.message); throw e;} });
    ipcMain.handle('pecas:fetch-requested', async () => { try { return await getRequestedPecas(); } catch (e) {console.error("[IPC:pecas:fetch-requested] Erro:", e.message); throw e;} });

    // --- IPC Handlers para Autenticação ---
    ipcMain.handle('auth:login', async (event, { username, password }) => {
        try {
            const user = await findUserByUsername(username);
            if (!user || !verifyPassword(user.password_hash, password)) throw new Error("Usuário/senha inválida.");
            currentUserSession = { id: user.id, username: user.username, nome_completo: user.nome_completo, role: user.role, can_approve_purchase_orders: Boolean(user.can_approve_purchase_orders) };
            return currentUserSession;
        } catch (error) { currentUserSession = null; throw error; }
    });
    ipcMain.handle('auth:logout', async () => { currentUserSession = null; return { success: true }; });
    ipcMain.handle('auth:get-session', async () => { return currentUserSession; });
    ipcMain.handle('auth:change-password', async (event, { currentPassword, newPassword }) => {
        if (!currentUserSession?.id) throw new Error("Nenhum usuário logado.");
        if (!currentPassword || !newPassword || newPassword.length < 6) throw new Error("Dados inválidos.");
        try {
            const userFromDb = await findUserByUsername(currentUserSession.username);
            if (!userFromDb || !verifyPassword(userFromDb.password_hash, currentPassword)) throw new Error("Senha atual incorreta.");
            const newPasswordHash = hashPassword(newPassword);
            await updateUserPassword(currentUserSession.id, newPasswordHash);
            return { success: true, message: "Senha alterada!" };
        } catch (error) { throw error; }
    });

    // --- IPC Handlers para GERENCIAMENTO DE USUÁRIOS ---
    ipcMain.handle('users:create', async (event, { username, nome_completo, password, role, can_approve_purchase_orders }) => {
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado.");
        let finalRole = role; let finalCanApprove = (can_approve_purchase_orders === true || can_approve_purchase_orders === 1);
        if (currentUserSession.role === 'gerente') {
            if (role === 'administrador' || role === 'gerente') throw new Error("Gerentes só podem criar 'funcionário'.");
            finalRole = 'funcionario'; finalCanApprove = false; 
        }
        try {
            const existingUser = await findUserByUsername(username);
            if (existingUser) throw new Error(`Usuário '${username}' já existe.`);
            const hashedPassword = hashPassword(password);
            return await insertUser(username, nome_completo, hashedPassword, finalRole, finalCanApprove, currentUserSession.id);
        } catch (error) { throw error; }
    });
    ipcMain.handle('users:fetch-all', async () => {
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado.");
        try {
            if (currentUserSession.role === 'administrador') return await getAllUsers();
            else return await getUsersByRole('funcionario');
        } catch (error) { throw error; }
    });
    ipcMain.handle('users:update-details', async (event, { userId, username, nome_completo, role, can_approve_purchase_orders }) => {
        if (currentUserSession?.role !== 'administrador') throw new Error("Acesso negado.");
        if (Number(userId) === 1 && ((role && role !== 'administrador') || can_approve_purchase_orders === false)) throw new Error("Admin master não pode ser rebaixado/perder permissão.");
        try {
            if (username) { const targetUser = await findUserByUsername(username); if (targetUser && targetUser.id !== Number(userId)) throw new Error(`Usuário '${username}' já em uso.`); }
            return await updateUserFullDetails(Number(userId), { username, nome_completo, role, can_approve_purchase_orders, updated_by_user_id: currentUserSession.id });
        } catch (error) { throw error; }
    });
    ipcMain.handle('users:admin-reset-password', async (event, { userId, newPassword }) => {
        if (currentUserSession?.role !== 'administrador') throw new Error("Acesso negado.");
        if (!newPassword || newPassword.length < 6) throw new Error("Nova senha inválida.");
        try {
            const newPasswordHash = hashPassword(newPassword);
            return await adminResetUserPassword(Number(userId), newPasswordHash, currentUserSession.id);
        } catch (error) { throw error; }
    });
    ipcMain.handle('users:delete', async (event, userIdToDelete) => {
        if (currentUserSession?.role !== 'administrador') throw new Error("Acesso negado.");
        if (Number(userIdToDelete) === 1 || currentUserSession.id === Number(userIdToDelete)) throw new Error("Operação não permitida.");
        try { return await deleteUser(Number(userIdToDelete), currentUserSession.id); } 
        catch (error) { throw error; }
    });

    // --- Handlers IPC para FUNCIONARIOS ---
    ipcMain.handle('funcionarios:fetch-all', async () => {
        if (!currentUserSession) throw new Error("Acesso negado.");
        try { return await getAllFuncionarios(); } catch (e) {console.error(e.message); throw e;}
    });
    ipcMain.handle('funcionarios:create', async (event, funcionarioData) => {
        if (!currentUserSession || !['administrador', 'gerente', 'funcionario'].includes(currentUserSession.role)) throw new Error("Acesso negado.");
        try { return await insertFuncionario(funcionarioData /*, currentUserSession.id - se for passar o criador */); } catch (e) {console.error(e.message); throw e;}
    });
    ipcMain.handle('funcionarios:update', async (event, { id_funcionario, funcionarioData }) => {
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado.");
        try { return await updateFuncionario(id_funcionario, funcionarioData /*, currentUserSession.id */); } catch (e) {console.error(e.message); throw e;}
    });
    // ipcMain.handle('funcionarios:delete', async (event, id_funcionario) => { ... });
    ipcMain.handle('funcionarios:delete', async (event, id_funcionario) => {
        if (!currentUserSession || currentUserSession.role !== 'administrador') { // Somente admin pode inativar/deletar
            throw new Error("Acesso negado: Apenas Administradores podem inativar funcionários.");
        }
        try { return await deleteFuncionario(id_funcionario, currentUserSession.id); }
        catch (error) { console.error("[IPC:funcionarios:delete] Erro:", error.message); throw error;}
    });
    // --- Handlers IPC para ORDENS DE SERVIÇO ---
    ipcMain.handle('os:fetch-all', async () => {
        if (!currentUserSession) throw new Error("Acesso negado.");
        try { return await getAllOrdensServico(); } catch (e) {console.error(e.message); throw e;}
    });
    ipcMain.handle('os:create', async (event, osData) => {
        if (!currentUserSession || !['administrador', 'gerente', 'funcionario'].includes(currentUserSession.role)) throw new Error("Acesso negado.");
        const payload = {...osData, created_by_user_id: currentUserSession.id, updated_by_user_id: currentUserSession.id };
        try { return await insertOrdemServico(payload); } catch (e) {console.error(e.message); throw e;}
    });
    
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
console.log("[MAIN PROCESS] Fim da configuração do script main.js.");