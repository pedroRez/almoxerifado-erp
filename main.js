// main.js (Electron - Processo Principal)
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
console.log("--- MAIN.JS FOI RECARREGADO (vComLogsSuperDetalhados) --- ", new Date().toLocaleTimeString());
console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
let userDataPathForLog = 'não definido ainda no topo do main.js';
try {
    // app.getPath pode não estar disponível antes do app.ready, mas tentamos para log inicial
    if (app && typeof app.getPath === 'function') {
        userDataPathForLog = app.getPath('userData');
    }
} catch (e) { console.error("Erro ao obter userData no topo do main.js (antes de app.ready):", e.message); }
console.log('Pasta de dados do usuário (userData) no início do script:', userDataPathForLog);


import {
    connectDatabase,
    createTables,
    getAllPecas,
    insertPeca as dbModuleInsertPeca, // Renomeado para clareza no main.js
    updatePeca as dbModuleUpdatePeca,
    deletePeca as dbModuleDeletePeca,
    getRequestedPecas,
    findUserByUsername,
    insertUser as dbModuleInsertUser
} from './localDatabase.js'; // Assume que localDatabase.js está na raiz

let currentUserSession = null;

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(storedPasswordHash, providedPassword) {
    if (!storedPasswordHash || !providedPassword) return false;
    const [salt, key] = storedPasswordHash.split(':');
    if (!salt || !key) return false;
    const hash = crypto.pbkdf2Sync(providedPassword, salt, 1000, 64, 'sha512').toString('hex');
    return key === hash;
}

async function createMasterUserIfNoneExists() {
    console.log("[MAIN PROCESS] Verificando existência do usuário master 'admin'...");
    try {
        const adminUser = await findUserByUsername('admin');
        if (!adminUser) {
            console.log("[MAIN PROCESS] Nenhum usuário 'admin' encontrado. Criando usuário master 'admin'...");
            const masterUsername = 'admin';
            const masterPassword = 'admin';
            const masterRole = 'administrador';
            const hashedPassword = hashPassword(masterPassword);
            await dbModuleInsertUser(masterUsername, hashedPassword, masterRole); // Usa a função importada
            console.log(`[MAIN PROCESS] Usuário master '${masterUsername}' criado com senha '${masterPassword}' e papel '${masterRole}'. LEMBRE-SE DE ALTERAR ESTA SENHA!`);
        } else {
            console.log("[MAIN PROCESS] Usuário 'admin' já existe.");
        }
    } catch (error) {
        console.error("[MAIN PROCESS] Erro ao verificar/criar usuário master:", error);
    }
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    console.log("[MAIN PROCESS] createWindow - Verificando modo de empacotamento.");
    if (app.isPackaged) {
        console.log("[MAIN PROCESS] App está empacotado. Carregando 'dist/index.html'.");
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
        // mainWindow.webContents.openDevTools(); // Geralmente não se abre DevTools em produção por padrão
    } else {
        const viteDevServerUrl = 'http://localhost:5173/';
        console.log("[MAIN PROCESS] App NÃO está empacotado. Carregando de:", viteDevServerUrl);
        mainWindow.loadURL(viteDevServerUrl);
        mainWindow.webContents.openDevTools(); // Abre DevTools em desenvolvimento
    }
}

app.whenReady().then(async () => {
    console.log("[MAIN PROCESS] Evento 'app.whenReady' disparado.");
    console.log("[MAIN PROCESS] Pasta de dados do usuário (userData) em whenReady:", app.getPath('userData'));
    console.log("[MAIN PROCESS] Conectando ao DB e criando tabelas...");
    try {
        await connectDatabase();
        await createTables();
        await createMasterUserIfNoneExists();
        console.log("[MAIN PROCESS] DB conectado, tabelas e usuário master verificados/criados.");
        createWindow();
    } catch (error) {
        console.error("[MAIN PROCESS] ERRO CRÍTICO na inicialização (DB, tabelas ou createWindow):", error);
    }

    // --- IPC Handlers para Peças ---
    ipcMain.handle('pecas:fetch-all', async () => {
        console.log("--------------------------------------------------");
        console.log("[MAIN PROCESS] IPC 'pecas:fetch-all' ACIONADO.");
        console.log("--------------------------------------------------");
        try {
            const pecas = await getAllPecas(); // Função do localDatabase.js
            console.log("[MAIN PROCESS] 'pecas:fetch-all' - Retornando para o renderer", pecas ? pecas.length : 0, "peças.");
            return pecas;
        } catch (error) {
            console.error("[MAIN PROCESS] ERRO no handler 'pecas:fetch-all':", error);
            throw error;
        }
    });

    ipcMain.handle('pecas:insert', async (event, peca) => {
        console.log("--------------------------------------------------");
        console.log("[MAIN PROCESS] IPC 'pecas:insert' ACIONADO AGORA. Dados recebidos:", peca);
        console.log("--------------------------------------------------");

        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            const errorMsg = "ACESSO NEGADO: Apenas administradores ou gerentes podem inserir peças.";
            console.error("[MAIN PROCESS] 'pecas:insert' - ACESSO NEGADO. Usuário:", currentUserSession);
            throw new Error(errorMsg);
        }

        try {
            console.log("[MAIN PROCESS] 'pecas:insert' - Tentando chamar dbModuleInsertPeca (de localDatabase.js)...");
            const resultado = await dbModuleInsertPeca(peca); // dbModuleInsertPeca é localDatabase.insertPeca
            console.log("[MAIN PROCESS] 'pecas:insert' - dbModuleInsertPeca retornou (SUCESSO APARENTE DO DB):", resultado);
            return resultado;
        } catch (error) {
            console.error("[MAIN PROCESS] 'pecas:insert' - ERRO DETECTADO ao chamar dbModuleInsertPeca ou dentro dela:", error);
            console.error("[MAIN PROCESS] 'pecas:insert' - Detalhes do erro original:", error.message, error.stack);
            throw error;
        }
    });

    ipcMain.handle('pecas:update', async (event, id, peca) => {
        console.log("--------------------------------------------------");
        console.log("[MAIN PROCESS] IPC 'pecas:update' ACIONADO. ID:", id, "Dados:", peca);
        console.log("--------------------------------------------------");
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
             throw new Error("Acesso negado: Apenas administradores ou gerentes podem atualizar peças.");
        }
        try {
            const resultado = await dbModuleUpdatePeca(id, peca);
            return resultado;
        } catch (error) {
            console.error("[MAIN PROCESS] ERRO no handler 'pecas:update':", error);
            throw error;
        }
    });

    ipcMain.handle('pecas:delete', async (event, id) => {
        console.log("--------------------------------------------------");
        console.log("[MAIN PROCESS] IPC 'pecas:delete' ACIONADO. ID:", id);
        console.log("--------------------------------------------------");
         if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Apenas administradores ou gerentes podem excluir peças.");
        }
        try {
            const resultado = await dbModuleDeletePeca(id);
            return resultado;
        } catch (error) {
            console.error("[MAIN PROCESS] ERRO no handler 'pecas:delete':", error);
            throw error;
        }
    });

    ipcMain.handle('pecas:fetch-requested', async () => { // Usado pelo App.jsx
        console.log("--------------------------------------------------");
        console.log("[MAIN PROCESS] IPC 'pecas:fetch-requested' ACIONADO.");
        console.log("--------------------------------------------------");
        try {
            const pecas = await getRequestedPecas();
            console.log("[MAIN PROCESS] 'pecas:fetch-requested' - Retornando para o renderer", pecas ? pecas.length : 0, "peças.");
            return pecas;
        } catch (error) {
            console.error("[MAIN PROCESS] Erro no handler 'pecas:fetch-requested':", error);
            throw error;
        }
    });

    // --- IPC Handlers para Autenticação e Usuários ---
    // (Estes já tinham bons logs, mas vou padronizar o cabeçalho)
    ipcMain.handle('auth:login', async (event, { username, password }) => {
        console.log("--------------------------------------------------");
        console.log(`[MAIN PROCESS] IPC 'auth:login' - Tentativa para usuário: ${username}`);
        console.log("--------------------------------------------------");
        try {
            const user = await findUserByUsername(username);
            if (!user) {
                throw new Error("Usuário não encontrado ou senha inválida.");
            }
            const passwordIsValid = verifyPassword(user.password_hash, password);
            if (!passwordIsValid) {
                throw new Error("Usuário não encontrado ou senha inválida.");
            }
            currentUserSession = { id: user.id, username: user.username, role: user.role };
            console.log(`[MAIN PROCESS] IPC 'auth:login' - Usuário ${username} logado. Sessão:`, currentUserSession);
            return currentUserSession;
        } catch (error) {
            currentUserSession = null;
            console.error(`[MAIN PROCESS] IPC 'auth:login' - Erro para ${username}: ${error.message}`);
            throw error;
        }
    });

    ipcMain.handle('auth:logout', async () => {
        console.log("--------------------------------------------------");
        const username = currentUserSession?.username;
        console.log(`[MAIN PROCESS] IPC 'auth:logout' - Usuário ${username || '(nenhum)'} deslogando.`);
        console.log("--------------------------------------------------");
        currentUserSession = null;
        return { success: true };
    });

    ipcMain.handle('auth:get-session', async () => {
        console.log("--------------------------------------------------");
        console.log("[MAIN PROCESS] IPC 'auth:get-session' chamado. Retornando sessão:", currentUserSession);
        console.log("--------------------------------------------------");
        return currentUserSession;
    });

    ipcMain.handle('users:create', async (event, { username, password, role }) => {
        console.log("--------------------------------------------------");
        console.log("[MAIN PROCESS] IPC 'users:create'. Dados (sem senha):", {username, role});
        console.log("--------------------------------------------------");
        if (currentUserSession?.role !== 'administrador') {
            throw new Error("Apenas administradores podem criar usuários.");
        }
        try {
            const hashedPassword = hashPassword(password);
            const newUser = await dbModuleInsertUser(username, hashedPassword, role);
            console.log("[MAIN PROCESS] 'users:create' - Novo usuário criado:", newUser);
            return newUser;
        } catch (error) {
            console.error("[MAIN PROCESS] ERRO no handler 'users:create':", error);
            throw error;
        }
    });
    
    app.on('activate', () => {
        console.log("[MAIN PROCESS] Evento 'app.activate' disparado.");
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    console.log("[MAIN PROCESS] Evento 'window-all-closed' disparado.");
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

console.log("[MAIN PROCESS] Fim da configuração do script main.js.");