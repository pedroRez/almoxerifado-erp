// main.js (Electron - Processo Principal)
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("--- MAIN.JS INICIADO (vCompletaDefinitiva) ---");

// Importando do postgresService.js
import {
    connectPostgresDatabase,
    createPostgresTables,
    getAllPecas,
    insertPeca as dbModuleInsertPeca,
    updatePeca as dbModuleUpdatePeca,
    deletePeca as dbModuleDeletePeca,
    getRequestedPecas,
    findUserByUsername,
    insertUser as dbModuleInsertUser,
    getAllUsers as dbModuleGetAllUsers,
    getUsersByRole as dbModuleGetUsersByRole,
    updateUserPassword as dbModuleUpdateUserPassword,
    updateUserFullDetails as dbModuleUpdateUserFullDetails,
    adminResetUserPassword as dbModuleAdminResetUserPassword,
    deleteUser as dbModuleDeleteUser
} from './postgresService.js'; // Certifique-se que este arquivo existe na raiz

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

// Função para inicializar DB e criar usuário master
async function initializeAppDatabaseAndUser() {
    console.log("[MAIN PROCESS] Iniciando conexão com PostgreSQL e criação de tabelas...");
    await connectPostgresDatabase(); // Função do postgresService.js
    await createPostgresTables();    // Função do postgresService.js
    console.log("[MAIN PROCESS] PostgreSQL conectado e tabelas (se não existiam) verificadas/criadas.");

    console.log("[MAIN PROCESS] Verificando/Criando usuário master 'admin'...");
    try {
        const adminUser = await findUserByUsername('admin'); // Função do postgresService.js
        if (!adminUser) {
            console.log("[MAIN PROCESS] Usuário 'admin' não encontrado. Criando...");
            const masterUsername = 'admin';
            const masterPassword = 'admin'; // MUDE EM PRODUÇÃO!
            const masterRole = 'administrador';
            const hashedPassword = hashPassword(masterPassword);
            // Admin master pode aprovar pedidos por padrão e é o criador de si mesmo (ID null ou próprio ID)
            await dbModuleInsertUser(masterUsername, hashedPassword, masterRole, 1 /* canApproveOrders */, null /* created_by_user_id */); 
            console.log(`[MAIN PROCESS] Usuário master '${masterUsername}' criado com can_approve_purchase_orders=true. ATENÇÃO: SENHA PADRÃO!`);
        } else {
            console.log("[MAIN PROCESS] Usuário 'admin' já existe.");
            if (adminUser.id === 1 && adminUser.can_approve_purchase_orders !== true && adminUser.can_approve_purchase_orders !== 1) {
                console.log("[MAIN PROCESS] Atualizando admin master (ID 1) para poder aprovar pedidos.");
                await dbModuleUpdateUserFullDetails(adminUser.id, { can_approve_purchase_orders: true, updated_by_user_id: adminUser.id });
            }
        }
    } catch (error) {
        console.error("[MAIN PROCESS] Erro severo ao verificar/criar usuário master com postgresService:", error);
        throw error; 
    }
}

// Função para criar a janela principal
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
        // mainWindow.webContents.openDevTools(); // Comentado conforme seu pedido
    }
}

// Quando o Electron estiver pronto
app.whenReady().then(async () => {
    console.log("[MAIN PROCESS] Evento 'app.whenReady' disparado.");
    console.log("[MAIN PROCESS] Pasta de dados do usuário (userData):", app.getPath('userData'));
    
    try {
        await initializeAppDatabaseAndUser();
        console.log("[MAIN PROCESS] Inicialização do banco de dados e usuário master concluída. Criando janela...");
        createWindow();
    } catch (error) {
        console.error("[MAIN PROCESS] ERRO CRÍTICO DURANTE A INICIALIZAÇÃO DO APP:", error);
        dialog.showErrorBox("Erro Crítico de Inicialização", 
            "Não foi possível iniciar a aplicação devido a um problema interno: " + 
            (error.message || "Erro desconhecido"));
        app.quit();
        return;
    }

    // --- IPC Handlers para Peças ---
    ipcMain.handle('pecas:fetch-all', async () => {
        console.log("[MAIN PROCESS] IPC: pecas:fetch-all");
        try { return await getAllPecas(); } 
        catch (error) { console.error("[IPC:pecas:fetch-all] Erro:", error.message); throw error; }
    });

    ipcMain.handle('pecas:insert', async (event, pecaData) => {
        console.log("[MAIN PROCESS] IPC: pecas:insert, Dados:", pecaData);
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Inserção de peças permitida apenas para administradores ou gerentes.");
        }
        const pecaComUsuario = { ...pecaData, usuario_id: currentUserSession.id };
        try { 
            return await dbModuleInsertPeca(pecaComUsuario); 
        } catch (error) { 
            console.error("[IPC:pecas:insert] Erro:", error.message); 
            throw error; 
        }
    });

    ipcMain.handle('pecas:update', async (event, id_sync, pecaData) => {
        console.log("[MAIN PROCESS] IPC: pecas:update, ID_SYNC:", id_sync, "Dados:", pecaData);
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Atualização de peças permitida apenas para administradores ou gerentes.");
        }
        const pecaComUsuario = { ...pecaData, usuario_id: currentUserSession.id };
        try { 
            return await dbModuleUpdatePeca(id_sync, pecaComUsuario); 
        } catch (error) { 
            console.error("[IPC:pecas:update] Erro:", error.message); 
            throw error; 
        }
    });

    ipcMain.handle('pecas:delete', async (event, id_sync) => {
        console.log("[MAIN PROCESS] IPC: pecas:delete, ID_SYNC:", id_sync);
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Exclusão de peças permitida apenas para administradores ou gerentes.");
        }
        try { 
            return await dbModuleDeletePeca(id_sync, currentUserSession.id); 
        } catch (error) { 
            console.error("[IPC:pecas:delete] Erro:", error.message); 
            throw error; 
        }
    });

    ipcMain.handle('pecas:fetch-requested', async () => {
        console.log("[MAIN PROCESS] IPC: pecas:fetch-requested");
        try { return await getRequestedPecas(); } 
        catch (error) { console.error("[IPC:pecas:fetch-requested] Erro:", error.message); throw error; }
    });

    // --- IPC Handlers para Autenticação ---
    ipcMain.handle('auth:login', async (event, { username, password }) => {
        console.log(`[MAIN PROCESS] IPC: auth:login, Usuário: ${username}`);
        try {
            const user = await findUserByUsername(username);
            if (!user || !verifyPassword(user.password_hash, password)) {
                throw new Error("Usuário não encontrado ou senha inválida.");
            }
            currentUserSession = { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                can_approve_purchase_orders: Boolean(user.can_approve_purchase_orders)
            };
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
        console.log(`[MAIN PROCESS] IPC: auth:logout - Usuário ${username || '(nenhum)'} deslogado.`);
        return { success: true };
    });

    ipcMain.handle('auth:get-session', async () => {
        console.log("[MAIN PROCESS] IPC: auth:get-session. Sessão atual:", currentUserSession);
        return currentUserSession;
    });

    ipcMain.handle('auth:change-password', async (event, { currentPassword, newPassword }) => {
        console.log("[MAIN PROCESS] IPC: auth:change-password");
        if (!currentUserSession || !currentUserSession.id) {
            throw new Error("Nenhum usuário logado para alterar a senha.");
        }
        if (!currentPassword || !newPassword || newPassword.length < 6) {
            throw new Error("Senha atual e nova senha (mínimo 6 caracteres) são obrigatórias.");
        }
        try {
            const userFromDb = await findUserByUsername(currentUserSession.username);
            if (!userFromDb || !verifyPassword(userFromDb.password_hash, currentPassword)) {
                throw new Error("Senha atual incorreta.");
            }
            const newPasswordHash = hashPassword(newPassword);
            await dbModuleUpdateUserPassword(currentUserSession.id, newPasswordHash); // Passa o ID do usuário da sessão
            console.log(`[MAIN PROCESS] Senha alterada com sucesso para o usuário: ${currentUserSession.username}`);
            return { success: true, message: "Senha alterada com sucesso!" };
        } catch (error) {
            console.error(`[IPC:auth:change-password] Erro para ${currentUserSession.username}:`, error);
            throw error;
        }
    });

    // --- IPC Handlers para GERENCIAMENTO DE USUÁRIOS ---
    ipcMain.handle('users:create', async (event, { username, password, role, can_approve_purchase_orders }) => {
        console.log("[MAIN PROCESS] IPC 'users:create' - Dados:", {username, role, can_approve_purchase_orders});
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Criar usuários é permitido apenas para Administradores ou Gerentes.");
        }

        let finalRole = role;
        // O valor de can_approve_purchase_orders é o que vem do frontend se o criador for admin.
        // Se o criador for gerente, can_approve_purchase_orders será forçado para false no backend.
        let finalCanApprove = (can_approve_purchase_orders === true || can_approve_purchase_orders === 1) ? 1 : 0;

        if (currentUserSession.role === 'gerente') {
            if (role === 'administrador' || role === 'gerente') {
                throw new Error("Acesso negado: Gerentes podem criar apenas usuários 'funcionário'.");
            }
            finalRole = 'funcionario'; 
            finalCanApprove = 0; // Gerente não pode dar esta permissão
            console.log("[MAIN PROCESS] 'users:create' - Gerente criando. Forçando papel para 'funcionario' e can_approve_purchase_orders para false.");
        }
        
        try {
            const existingUser = await findUserByUsername(username);
            if (existingUser) throw new Error(`Nome de usuário '${username}' já existe.`);
            
            const hashedPassword = hashPassword(password);
            // Passando o ID do usuário que está criando (currentUserSession.id) para created_by_user_id
            return await dbModuleInsertUser(username, hashedPassword, finalRole, finalCanApprove, currentUserSession.id); 
        } catch (error) {
            console.error("[IPC:users:create] Erro:", error.message);
            throw error;
        }
    });

    ipcMain.handle('users:fetch-all', async () => {
        console.log("[MAIN PROCESS] IPC 'users:fetch-all' por:", currentUserSession?.username, currentUserSession?.role);
        if (!currentUserSession || !['administrador', 'gerente'].includes(currentUserSession.role)) {
            throw new Error("Acesso negado: Listagem de usuários permitida apenas para Administradores ou Gerentes.");
        }
        try {
            let users;
            if (currentUserSession.role === 'administrador') {
                users = await dbModuleGetAllUsers();
            } else { // Gerente
                users = await dbModuleGetUsersByRole('funcionario');
            }
            return users;
        } catch (error) {
            console.error("[IPC:users:fetch-all] Erro:", error.message);
            throw error;
        }
    });

    ipcMain.handle('users:update-details', async (event, { userId, username, role, can_approve_purchase_orders }) => {
        console.log("[MAIN PROCESS] IPC 'users:update-details' para UserID:", userId, "Dados:", {username, role, can_approve_purchase_orders});
        if (currentUserSession?.role !== 'administrador') {
            throw new Error("Acesso negado: Apenas administradores podem atualizar detalhes de usuários.");
        }
        if (Number(userId) === 1 && role && role !== 'administrador') { // Admin master ID 1
             throw new Error("O administrador principal (ID 1) não pode ter seu papel alterado para não-administrador.");
        }
        if (Number(userId) === 1 && (can_approve_purchase_orders === false || can_approve_purchase_orders === 0) ) {
             throw new Error("O administrador principal (ID 1) deve manter a permissão de aprovar pedidos.");
        }
        // Proteção para não se rebaixar se for o último admin (poderia ser mais elaborada)
        if (Number(userId) === currentUserSession.id && role && role !== 'administrador') {
             console.warn("[MAIN PROCESS] Admin tentando rebaixar o próprio papel.");
             // Poderia verificar se há outros admins antes de permitir. Por ora, vamos permitir, mas com aviso.
        }
        try {
            if (username) {
                const targetUser = await findUserByUsername(username);
                if (targetUser && targetUser.id !== Number(userId)) {
                    throw new Error(`O nome de usuário '${username}' já está em uso por outro usuário.`);
                }
            }
            // Passando o ID do admin que está fazendo a alteração
            return await dbModuleUpdateUserFullDetails(Number(userId), { username, role, can_approve_purchase_orders, updated_by_user_id: currentUserSession.id });
        } catch (error) {
            console.error("[IPC:users:update-details] Erro:", error.message);
            throw error;
        }
    });

    ipcMain.handle('users:admin-reset-password', async (event, { userId, newPassword }) => {
        console.log(`[MAIN PROCESS] IPC 'users:admin-reset-password' para UserID: ${userId}`);
        if (currentUserSession?.role !== 'administrador') {
            throw new Error("Acesso negado: Apenas administradores podem resetar senhas de outros usuários.");
        }
        if (!newPassword || newPassword.length < 6) {
            throw new Error("Nova senha inválida ou muito curta (mínimo 6 caracteres).");
        }
        try {
            const newPasswordHash = hashPassword(newPassword);
            // Passa o ID do admin que está fazendo o reset para updated_by_user_id na função do DB
            return await dbModuleAdminResetUserPassword(Number(userId), newPasswordHash, currentUserSession.id);
        } catch (error) {
            console.error("[IPC:users:admin-reset-password] Erro:", error.message);
            throw error;
        }
    });
    
    ipcMain.handle('users:delete', async (event, userIdToDelete) => {
        console.log(`[MAIN PROCESS] IPC 'users:delete' para UserID: ${userIdToDelete}`);
        if (currentUserSession?.role !== 'administrador') {
            throw new Error("Acesso negado: Apenas administradores podem excluir usuários.");
        }
        if (Number(userIdToDelete) === 1) { // Protege o admin master (ID 1)
            throw new Error("O administrador principal (ID 1) não pode ser excluído.");
        }
        if (currentUserSession.id === Number(userIdToDelete)) {
            throw new Error("Um administrador não pode excluir a própria conta.");
        }
        try {
            // Passa o ID do admin que está fazendo a exclusão para deleted_by_user_id
            return await dbModuleDeleteUser(Number(userIdToDelete), currentUserSession.id);
        } catch (error) {
            console.error("[IPC:users:delete] Erro:", error.message);
            throw error;
        }
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