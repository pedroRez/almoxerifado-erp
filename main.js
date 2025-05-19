// main.js (Electron - Processo Principal)
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
console.log("--- MAIN.JS FOI RECARREGADO (vComPermissoesGerenteCorrigidas) --- ", new Date().toLocaleTimeString());
console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
let userDataPathForLog = 'não definido ainda no topo do main.js';
try {
    if (app && typeof app.getPath === 'function') {
        userDataPathForLog = app.getPath('userData');
    }
} catch (e) { console.error("Erro ao obter userData no topo do main.js (antes de app.ready):", e.message); }
console.log('Pasta de dados do usuário (userData) no início do script:', userDataPathForLog);


import {
    connectDatabase, createTables, getAllPecas,
    insertPeca as dbModuleInsertPeca, updatePeca as dbModuleUpdatePeca,
    deletePeca as dbModuleDeletePeca, getRequestedPecas,
    findUserByUsername, insertUser as dbModuleInsertUser,
    getAllUsers as dbModuleGetAllUsers,
    getUsersByRole as dbModuleGetUsersByRole, // Importando getUsersByRole
    updateUserPassword as dbModuleUpdateUserPassword
} from './localDatabase.js';

let currentUserSession = null;

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(storedPasswordHash, providedPassword) {
    if (!storedPasswordHash || !providedPassword) { console.warn("[MAIN PROCESS] verifyPassword: hash ou senha ausentes."); return false; }
    const parts = storedPasswordHash.split(':');
    if (parts.length !== 2) { console.warn("[MAIN PROCESS] verifyPassword: formato do hash inválido."); return false; }
    const [salt, key] = parts;
    try {
        const hash = crypto.pbkdf2Sync(providedPassword, salt, 1000, 64, 'sha512').toString('hex');
        return key === hash;
    } catch (e) {
        console.error("[MAIN PROCESS] verifyPassword: erro pbkdf2Sync:", e.message);
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
            await dbModuleInsertUser(masterUsername, hashedPassword, masterRole);
            console.log(`[MAIN PROCESS] Usuário master '${masterUsername}' criado. ATENÇÃO: SENHA PADRÃO!`);
        } else {
            console.log("[MAIN PROCESS] Usuário 'admin' já existe.");
        }
    } catch (error) {
        console.error("[MAIN PROCESS] Erro severo ao verificar/criar usuário master:", error);
        throw error; 
    }
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    console.log("[MAIN PROCESS] Janela principal criada.");

    if (app.isPackaged) {
        console.log("[MAIN PROCESS] App empacotado. Carregando 'dist/index.html'.");
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        const viteDevServerUrl = 'http://localhost:5173/';
        console.log("[MAIN PROCESS] App em desenvolvimento. Carregando de:", viteDevServerUrl);
        mainWindow.loadURL(viteDevServerUrl);
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(async () => {
    console.log("[MAIN PROCESS] Evento 'app.whenReady' disparado.");
    console.log("[MAIN PROCESS] Pasta de dados do usuário (userData):", app.getPath('userData'));
    
    try {
        await initializeAppDatabaseAndUser();
        console.log("[MAIN PROCESS] Inicialização do banco de dados e usuário master concluída. Criando janela...");
        createWindow();
    } catch (error) {
        console.error("[MAIN PROCESS] ERRO CRÍTICO DURANTE A INICIALIZAÇÃO DO APP:", error);
        app.quit();
        return;
    }

    // --- IPC Handlers para Peças ---
    ipcMain.handle('pecas:fetch-all', async () => {
        try { return await getAllPecas(); } 
        catch (error) { console.error("[IPC:pecas:fetch-all] Erro:", error.message); throw error; }
    });
    ipcMain.handle('pecas:insert', async (event, peca) => {
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Inserção de peças permitida apenas para administradores ou gerentes.");
        }
        try { return await dbModuleInsertPeca(peca); } 
        catch (error) { console.error("[IPC:pecas:insert] Erro:", error.message); throw error; }
    });
    ipcMain.handle('pecas:update', async (event, id, peca) => {
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Atualização de peças permitida apenas para administradores ou gerentes.");
        }
        try { return await dbModuleUpdatePeca(id, peca); } 
        catch (error) { console.error("[IPC:pecas:update] Erro:", error.message); throw error; }
    });
    ipcMain.handle('pecas:delete', async (event, id) => {
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Exclusão de peças permitida apenas para administradores ou gerentes.");
        }
        try { return await dbModuleDeletePeca(id); } 
        catch (error) { console.error("[IPC:pecas:delete] Erro:", error.message); throw error; }
    });
    ipcMain.handle('pecas:fetch-requested', async () => {
        try { return await getRequestedPecas(); } 
        catch (error) { console.error("[IPC:pecas:fetch-requested] Erro:", error.message); throw error; }
    });

    // --- IPC Handlers para Autenticação e Usuários ---
    ipcMain.handle('auth:login', async (event, { username, password }) => {
        try {
            const user = await findUserByUsername(username);
            if (!user || !verifyPassword(user.password_hash, password)) {
                throw new Error("Usuário não encontrado ou senha inválida.");
            }
            currentUserSession = { id: user.id, username: user.username, role: user.role };
            console.log(`[MAIN PROCESS] Usuário ${username} logado. Sessão:`, currentUserSession);
            return currentUserSession;
        } catch (error) {
            currentUserSession = null;
            console.error(`[IPC:auth:login] Erro para ${username}: ${error.message}`);
            throw error;
        }
    });
    ipcMain.handle('auth:logout', async () => {
        const username = currentUserSession?.username;
        currentUserSession = null;
        console.log(`[MAIN PROCESS] Usuário ${username || '(nenhum)'} deslogado.`);
        return { success: true };
    });
    ipcMain.handle('auth:get-session', async () => {
        return currentUserSession;
    });
    ipcMain.handle('auth:change-password', async (event, { currentPassword, newPassword }) => {
        if (!currentUserSession || !currentUserSession.id) throw new Error("Nenhum usuário logado.");
        if (!currentPassword || !newPassword || newPassword.length < 6) throw new Error("Dados inválidos para alteração de senha.");
        try {
            const userFromDb = await findUserByUsername(currentUserSession.username);
            if (!userFromDb || !verifyPassword(userFromDb.password_hash, currentPassword)) {
                throw new Error("Senha atual incorreta.");
            }
            const newPasswordHash = hashPassword(newPassword);
            await dbModuleUpdateUserPassword(currentUserSession.id, newPasswordHash);
            return { success: true, message: "Senha alterada com sucesso!" };
        } catch (error) {
            console.error(`[IPC:auth:change-password] Erro para ${currentUserSession.username}:`, error);
            throw error;
        }
    });

    // --- IPC Handlers para GERENCIAMENTO DE USUÁRIOS ---
    ipcMain.handle('users:create', async (event, { username, password, role }) => {
        console.log("[MAIN PROCESS] IPC 'users:create' - Dados (sem senha):", {username, role});
        // PERMISSÃO: Admin ou Gerente podem criar
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Apenas administradores ou gerentes podem criar usuários.");
        }
        // REGRA DE NEGÓCIO: Gerente não pode criar administrador
        if (currentUserSession.role === 'gerente' && role === 'administrador') {
            throw new Error("Acesso negado: Gerentes não podem criar usuários administradores.");
        }
        try {
            const existingUser = await findUserByUsername(username);
            if (existingUser) throw new Error(`Nome de usuário '${username}' já existe.`);
            
            const hashedPassword = hashPassword(password);
            const newUser = await dbModuleInsertUser(username, hashedPassword, role);
            console.log("[MAIN PROCESS] 'users:create' - Novo usuário criado no DB:", newUser);
            return newUser;
        } catch (error) {
            console.error("[MAIN PROCESS] ERRO no handler 'users:create':", error.message);
            throw error;
        }
    });

    ipcMain.handle('users:fetch-all', async () => {
        console.log("[MAIN PROCESS] IPC 'users:fetch-all' ACIONADO por:", currentUserSession?.username, "Papel:", currentUserSession?.role);
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Listagem de usuários permitida apenas para administradores ou gerentes.");
        }
        try {
            let users;
            if (currentUserSession.role === 'administrador') {
                users = await dbModuleGetAllUsers();
                console.log("[MAIN PROCESS] Admin listando todos os usuários.");
            } else { // Gerente
                users = await dbModuleGetUsersByRole('funcionario');
                console.log("[MAIN PROCESS] Gerente listando apenas funcionários.");
            }
            return users;
        } catch (error) {
            console.error("[MAIN PROCESS] ERRO no handler 'users:fetch-all':", error.message);
            throw error;
        }
    });
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

console.log("[MAIN PROCESS] Fim da configuração do script main.js.");