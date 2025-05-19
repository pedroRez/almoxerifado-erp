// preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log("[preload.js] Script de pré-carregamento sendo executado. Expondo API para o renderer process (vFinalCompleto)...");

contextBridge.exposeInMainWorld('api', {
    // Funções de 'pecas'
    getAllPecas: () => ipcRenderer.invoke('pecas:fetch-all'),
    insertPeca: (peca) => ipcRenderer.invoke('pecas:insert', peca),
    updatePeca: (id, peca) => ipcRenderer.invoke('pecas:update', id, peca),
    deletePeca: (id) => ipcRenderer.invoke('pecas:delete', id),
    getRequestedPecas: () => ipcRenderer.invoke('pecas:fetch-requested'), // Usado pelo gráfico no App.jsx

    // Funções de AUTENTICAÇÃO
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials), // credentials = { username, password }
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    changePassword: (passwords) => ipcRenderer.invoke('auth:change-password', passwords), // passwords = { currentPassword, newPassword }

    // Funções de GERENCIAMENTO DE USUÁRIOS
    createUser: (userData) => ipcRenderer.invoke('users:create', userData), // userData = { username, password, role }
    getAllUsers: () => ipcRenderer.invoke('users:fetch-all')
    // TODO Futuro: Adicionar updateUserRoleIPC, deleteUserIPC aqui quando os handlers no main.js estiverem prontos
    // Exemplo:
    // updateUserRole: (userId, newRole) => ipcRenderer.invoke('users:update-role', { userId, newRole }),
    // deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId),
});

console.log("[preload.js] API do Electron exposta com sucesso como window.api");