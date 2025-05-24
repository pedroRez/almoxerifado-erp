// main.js (Electron - Processo Principal)
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`--- MAIN.JS INICIADO (vAbsolutamenteCompleto_SemPlaceholders) --- [${new Date().toLocaleTimeString()}]`);

// Importando da nova estrutura em database/
import { testConnection } from './database/dbUtils.js';
import { initializeDatabaseSchema } from './database/dbSchema.js';

import {
    getAllPecas, insertPeca, updatePeca, deletePeca, getRequestedPecas
} from './database/estoqueDB.js';

import {
    findUserByUsername, insertUser, getAllUsers, getUsersByRole,
    updateUserPassword, updateUserFullDetails, adminResetUserPassword, deleteUser
} from './database/usuariosDB.js';

import {
    getAllFuncionarios, insertFuncionarioAndOrUser, updateFuncionario, deleteFuncionario
} from './database/funcionariosDB.js';

import {
    getAllOrdensServico, insertOrdemServico
    // Adicionar outras funções de OS de ordensServicoDB.js quando prontas
} from './database/ordensServicoDB.js';

let currentUserSession = null;

// Função para criar hash da senha
function hashPassword(password) {
    if (!password) {
        console.error("[MAIN PROCESS] hashPassword: Tentativa de hashear senha vazia ou nula.");
        throw new Error("Senha não pode ser vazia para hashing.");
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

// Função para verificar a senha
function verifyPassword(storedPasswordHash, providedPassword) {
    if (!storedPasswordHash || !providedPassword) {
        // console.warn("[MAIN PROCESS] verifyPassword: hash armazenado ou senha fornecida ausentes.");
        return false;
    }
    const parts = storedPasswordHash.split(':');
    if (parts.length !== 2) {
        // console.warn("[MAIN PROCESS] verifyPassword: formato do hash armazenado inválido.");
        return false;
    }
    const [salt, key] = parts;
    try {
        const hash = crypto.pbkdf2Sync(providedPassword, salt, 1000, 64, 'sha512').toString('hex');
        return key === hash;
    } catch (e) {
        console.error("[MAIN PROCESS] verifyPassword: erro durante pbkdf2Sync:", e.message);
        return false;
    }
}

// Função para inicializar DB (apenas tabelas IF NOT EXISTS) e criar usuário master
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
            const masterUsername = 'admin';
            const masterPassword = 'admin'; // MUDE EM PRODUÇÃO!
            const masterFullName = 'Administrador Master';
            const masterRole = 'administrador';
            const hashedPassword = hashPassword(masterPassword);
            // Admin master pode aprovar pedidos por padrão e não tem um 'creator'
            await insertUser(masterUsername, masterFullName, hashedPassword, masterRole, true, null); 
            console.log(`[MAIN] Usuário master '${masterUsername}' criado. ATENÇÃO: SENHA PADRÃO!`);
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
                console.log("[MAIN] Atualizando detalhes do admin master (ID 1):", detailsToUpdate);
                await updateUserFullDetails(adminUser.id, {...detailsToUpdate, updated_by_user_id: adminUser.id });
            }
        }
    } catch (error) { 
        console.error("[MAIN] Erro ao verificar/criar usuário master:", error); 
        throw error; 
    }
}

// Função para criar a janela principal
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280, 
        height: 820,
        show: false, // Inicia invisível para maximizar antes de mostrar
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    console.log("[MAIN PROCESS] Janela principal criada (invisível).");

    mainWindow.maximize(); 
    mainWindow.show();      
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

// Quando o Electron estiver pronto
app.whenReady().then(async () => {
    console.log("[MAIN] App pronto. Inicializando...");
    try {
        await initializeApp();
        console.log("[MAIN] Inicialização completa. Criando janela...");
        createWindow();
    } catch (error) {
        console.error("[MAIN] ERRO CRÍTICO INICIALIZAÇÃO:", error);
        dialog.showErrorBox("Erro Crítico", "Falha na inicialização: " + (error.message || "Erro desconhecido"));
        app.quit(); 
        return;
    }

    // --- IPC Handlers para Peças (Estoque) ---
    ipcMain.handle('pecas:fetch-all', async () => { 
        console.log("[IPC:pecas:fetch-all] Recebido.");
        try { return await getAllPecas(); } 
        catch (e) {console.error("[IPC:pecas:fetch-all] Erro:", e.message); throw e;} 
    });
    ipcMain.handle('pecas:insert', async (event, pecaData) => { 
        console.log("[IPC:pecas:insert] Recebido:", pecaData);
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado."); 
        const payload = { ...pecaData, usuario_id: currentUserSession.id }; 
        try { return await insertPeca(payload); } 
        catch (e) {console.error("[IPC:pecas:insert] Erro:", e.message); throw e;} 
    });
    ipcMain.handle('pecas:update', async (event, id_sync, pecaData) => { 
        console.log("[IPC:pecas:update] ID_SYNC:", id_sync, "Dados:", pecaData);
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado."); 
        const payload = { ...pecaData, usuario_id: currentUserSession.id }; 
        try { return await updatePeca(id_sync, payload); } 
        catch (e) {console.error("[IPC:pecas:update] Erro:", e.message); throw e;} 
    });
    ipcMain.handle('pecas:delete', async (event, id_sync) => { 
        console.log("[IPC:pecas:delete] ID_SYNC:", id_sync);
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado."); 
        try { return await deletePeca(id_sync, currentUserSession.id); } 
        catch (e) {console.error("[IPC:pecas:delete] Erro:", e.message); throw e;} 
    });
    ipcMain.handle('pecas:fetch-requested', async () => { 
        console.log("[IPC:pecas:fetch-requested] Recebido.");
        try { return await getRequestedPecas(); } 
        catch (e) {console.error("[IPC:pecas:fetch-requested] Erro:", e.message); throw e;} 
    });

    // --- IPC Handlers para Autenticação ---
    ipcMain.handle('auth:login', async (event, { username, password }) => {
        console.log(`[IPC:auth:login] Tentativa para usuário: ${username}`);
        try {
            const user = await findUserByUsername(username);
            if (!user || !verifyPassword(user.password_hash, password)) throw new Error("Usuário/senha inválida.");
            currentUserSession = { id: user.id, username: user.username, nome_completo: user.nome_completo, role: user.role, can_approve_purchase_orders: Boolean(user.can_approve_purchase_orders) };
            console.log(`[MAIN] Usuário ${username} logado. Sessão:`, currentUserSession);
            return currentUserSession;
        } catch (error) { currentUserSession = null; console.error(`[IPC:auth:login] Erro para ${username}: ${error.message}`); throw error; }
    });
    ipcMain.handle('auth:logout', async () => { 
        const username = currentUserSession?.username;
        currentUserSession = null; 
        console.log(`[MAIN] Usuário ${username || '(nenhum)'} deslogado.`); 
        return { success: true }; 
    });
    ipcMain.handle('auth:get-session', async () => { 
        // console.log("[IPC:auth:get-session] Sessão atual:", currentUserSession); // Log muito frequente
        return currentUserSession; 
    });
    ipcMain.handle('auth:change-password', async (event, { currentPassword, newPassword }) => {
        console.log(`[IPC:auth:change-password] Usuário ${currentUserSession?.username} tentando alterar senha.`);
        if (!currentUserSession?.id) throw new Error("Nenhum usuário logado.");
        if (!currentPassword || !newPassword || newPassword.length < 6) throw new Error("Dados inválidos.");
        try {
            const userFromDb = await findUserByUsername(currentUserSession.username);
            if (!userFromDb || !verifyPassword(userFromDb.password_hash, currentPassword)) throw new Error("Senha atual incorreta.");
            const newPasswordHash = hashPassword(newPassword);
            await updateUserPassword(currentUserSession.id, newPasswordHash);
            return { success: true, message: "Senha alterada!" };
        } catch (error) { console.error(`[IPC:auth:change-password] Erro:`, error); throw error; }
    });

    // --- IPC Handlers para GERENCIAMENTO DE USUÁRIOS ---
    ipcMain.handle('users:create', async (event, { username, nome_completo, password, role, can_approve_purchase_orders }) => {
        console.log("[IPC:users:create] Dados:", {username, nome_completo, role, can_approve_purchase_orders});
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
        } catch (error) { console.error("[IPC:users:create] Erro:", error.message); throw error; }
    });
    ipcMain.handle('users:fetch-all', async () => {
        console.log("[IPC:users:fetch-all] Solicitado por:", currentUserSession?.username);
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) throw new Error("Acesso negado.");
        try {
            if (currentUserSession.role === 'administrador') return await getAllUsers();
            else return await getUsersByRole('funcionario');
        } catch (error) { console.error("[IPC:users:fetch-all] Erro:", error.message); throw error; }
    });
    ipcMain.handle('users:update-details', async (event, { userId, username, nome_completo, role, can_approve_purchase_orders }) => {
        console.log("[IPC:users:update-details] UserID:", userId, "Dados:", {username, nome_completo, role, can_approve_purchase_orders});
        if (currentUserSession?.role !== 'administrador') throw new Error("Acesso negado.");
        if (Number(userId) === 1 && ((role && role !== 'administrador') || can_approve_purchase_orders === false)) throw new Error("Admin master não pode ser rebaixado/perder permissão.");
        try {
            if (username) { const targetUser = await findUserByUsername(username); if (targetUser && targetUser.id !== Number(userId)) throw new Error(`Usuário '${username}' já em uso.`); }
            return await updateUserFullDetails(Number(userId), { username, nome_completo, role, can_approve_purchase_orders, updated_by_user_id: currentUserSession.id });
        } catch (error) { console.error("[IPC:users:update-details] Erro:", error.message); throw error; }
    });
    ipcMain.handle('users:admin-reset-password', async (event, { userId, newPassword }) => {
        console.log(`[IPC:users:admin-reset-password] UserID: ${userId}`);
        if (currentUserSession?.role !== 'administrador') throw new Error("Acesso negado.");
        if (!newPassword || newPassword.length < 6) throw new Error("Nova senha inválida.");
        try {
            const newPasswordHash = hashPassword(newPassword);
            return await adminResetUserPassword(Number(userId), newPasswordHash, currentUserSession.id);
        } catch (error) { console.error("[IPC:users:admin-reset-password] Erro:", error.message); throw error; }
    });
    ipcMain.handle('users:delete', async (event, userIdToDelete) => {
        console.log(`[IPC:users:delete] UserID: ${userIdToDelete}`);
        if (currentUserSession?.role !== 'administrador') throw new Error("Acesso negado.");
        if (Number(userIdToDelete) === 1 || currentUserSession.id === Number(userIdToDelete)) throw new Error("Operação não permitida.");
        try { return await deleteUser(Number(userIdToDelete), currentUserSession.id); } 
        catch (error) { console.error("[IPC:users:delete] Erro:", error.message); throw error; }
    });

    // --- Handlers IPC para FUNCIONARIOS ---
    ipcMain.handle('funcionarios:fetch-all', async () => {
        console.log("[IPC:funcionarios:fetch-all] Solicitado por:", currentUserSession?.username);
        if (!currentUserSession) throw new Error("Acesso negado: Usuário não logado.");
        try { return await getAllFuncionarios(); } 
        catch (error) { console.error("[IPC:funcionarios:fetch-all] Erro:", error.message); throw error;}
    });
    ipcMain.handle('funcionarios:create-full', async (event, funcionarioUserData) => {
        console.log("[IPC:funcionarios:create-full] Dados recebidos:", funcionarioUserData);
        if (!currentUserSession) throw new Error("Acesso negado: Sessão não encontrada.");
        if (!['administrador', 'gerente', 'funcionario'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Permissão insuficiente para esta ação.");
        }
        let { password: password_plain, ...restOfFuncionarioUserData } = funcionarioUserData;
        let password_hash_for_db = null;
        let attemptUserCreation = funcionarioUserData.createOrUpdateUser === true && funcionarioUserData.username && password_plain;
        let finalUserRole = restOfFuncionarioUserData.role;
        let finalUserCanApprove = restOfFuncionarioUserData.can_approve_purchase_orders;

        if (attemptUserCreation) {
            if (currentUserSession.role === 'funcionario') {
                console.warn(`[MAIN] Usuário '${currentUserSession.username}' (funcionário) tentou criar login. Apenas registro de funcionário será criado.`);
                attemptUserCreation = false;
            } else if (currentUserSession.role === 'gerente') {
                if (restOfFuncionarioUserData.role && restOfFuncionarioUserData.role !== 'funcionario') {
                    throw new Error("Gerentes podem apenas associar/criar logins para funcionários com o papel 'funcionário'.");
                }
                finalUserRole = 'funcionario';
                finalUserCanApprove = false;
            }
            if (attemptUserCreation) {
                 if (password_plain.length < 6) throw new Error("Senha para novo login deve ter no mínimo 6 caracteres.");
                password_hash_for_db = hashPassword(password_plain);
            }
        }
        const dbPayload = {
            ...restOfFuncionarioUserData,
            username: attemptUserCreation ? restOfFuncionarioUserData.username : null,
            password_hash: password_hash_for_db,
            role: attemptUserCreation ? finalUserRole : null,
            can_approve_purchase_orders: attemptUserCreation ? finalUserCanApprove : false,
        };
        if (!attemptUserCreation) {
            delete dbPayload.username; delete dbPayload.password_hash;
            delete dbPayload.role; delete dbPayload.can_approve_purchase_orders;
        }
        try { return await insertFuncionarioAndOrUser(dbPayload, currentUserSession.id); } 
        catch (error) { console.error("[IPC:funcionarios:create-full] Erro:", error.message); throw error;}
    });
    ipcMain.handle('funcionarios:update', async (event, { id_funcionario, funcionarioData }) => {
        console.log("[IPC:funcionarios:update] ID:", id_funcionario, "Dados:", funcionarioData);
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Apenas Admin ou Gerente podem atualizar funcionários.");
        }
        try { return await updateFuncionario(id_funcionario, funcionarioData, currentUserSession.id); } // Passa updatorId
        catch (error) { console.error("[IPC:funcionarios:update] Erro:", error.message); throw error;}
    });
    ipcMain.handle('funcionarios:delete', async (event, id_funcionario) => { // Inativa o funcionário
        console.log("[IPC:funcionarios:delete] ID:", id_funcionario);
        if (!currentUserSession || currentUserSession.role !== 'administrador') { // Apenas admin pode inativar
            throw new Error("Acesso negado: Apenas Administradores podem inativar funcionários.");
        }
        try { return await deleteFuncionario(id_funcionario, currentUserSession.id); }
        catch (error) { console.error("[IPC:funcionarios:delete] Erro:", error.message); throw error;}
    });

    // --- Handlers IPC para ORDENS DE SERVIÇO ---
    ipcMain.handle('os:fetch-all', async () => {
        console.log("[IPC:os:fetch-all] Solicitado por:", currentUserSession?.username);
        if (!currentUserSession) throw new Error("Acesso negado.");
        try { return await getAllOrdensServico(); } 
        catch (error) { console.error("[IPC:os:fetch-all] Erro:", error.message); throw error;}
    });
    ipcMain.handle('os:create', async (event, osData) => {
        console.log("[IPC:os:create] Dados:", osData);
        if (!currentUserSession || !['administrador', 'gerente', 'funcionario'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Necessário estar logado para criar OS.");
        }
        const payload = {...osData, created_by_user_id: currentUserSession.id, updated_by_user_id: currentUserSession.id };
        try { return await insertOrdemServico(payload); } 
        catch (error) { console.error("[IPC:os:create] Erro:", error.message); throw error;}
    });
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

console.log("[MAIN PROCESS] Fim da configuração do script main.js.");