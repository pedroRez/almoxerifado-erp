// preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log("[preload.js] Script de pré-carregamento sendo executado. Expondo API (vFinal_AposSetupSQL)...");

contextBridge.exposeInMainWorld('api', {
    // Peças
    getAllPecas: () => ipcRenderer.invoke('pecas:fetch-all'),
    insertPeca: (peca) => ipcRenderer.invoke('pecas:insert', peca),
    updatePeca: (id_sync, peca) => ipcRenderer.invoke('pecas:update', id_sync, peca), // id é id_sync
    deletePeca: (id_sync, usuario_id) => ipcRenderer.invoke('pecas:delete', id_sync, usuario_id), // id é id_sync
    getRequestedPecas: () => ipcRenderer.invoke('pecas:fetch-requested'),

    // Autenticação
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    changePassword: (passwords) => ipcRenderer.invoke('auth:change-password', passwords),

    // Gerenciamento de Usuários
    createUser: (userData) => ipcRenderer.invoke('users:create', userData),
    getAllUsers: () => ipcRenderer.invoke('users:fetch-all'),
    updateUserDetails: (details) => ipcRenderer.invoke('users:update-details', details), 
    adminResetPassword: (resetData) => ipcRenderer.invoke('users:admin-reset-password', resetData), 
    deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId)
});

console.log("[preload.js] API do Electron exposta com sucesso como window.api");