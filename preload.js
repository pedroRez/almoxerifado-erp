// preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log("[preload.js] Script de pré-carregamento sendo executado. Expondo API (vFinalCompleto_SemPlaceholders)...");

contextBridge.exposeInMainWorld('api', {
    // Funções relacionadas a 'Peças'
    getAllPecas: () => ipcRenderer.invoke('pecas:fetch-all'),
    insertPeca: (peca) => ipcRenderer.invoke('pecas:insert', peca),
    updatePeca: (id, peca) => ipcRenderer.invoke('pecas:update', id, peca),
    deletePeca: (id) => ipcRenderer.invoke('pecas:delete', id),
    getRequestedPecas: () => ipcRenderer.invoke('pecas:fetch-requested'), // Usado pelo gráfico no App.jsx

    // Funções relacionadas à AUTENTICAÇÃO
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials), // credentials = { username, password }
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),
    changePassword: (passwords) => ipcRenderer.invoke('auth:change-password', passwords), // passwords = { currentPassword, newPassword }

    // Funções relacionadas ao GERENCIAMENTO DE USUÁRIOS
    createUser: (userData) => ipcRenderer.invoke('users:create', userData), // userData = { username, password, role, can_approve_purchase_orders (opcional para admin) }
    getAllUsers: () => ipcRenderer.invoke('users:fetch-all'),
    updateUserDetails: (details) => ipcRenderer.invoke('users:update-details', details), // details = { userId, username?, role?, can_approve_purchase_orders? }
    adminResetPassword: (resetData) => ipcRenderer.invoke('users:admin-reset-password', resetData), // resetData = { userId, newPassword }
    deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId)
});

console.log("[preload.js] API do Electron exposta com sucesso como window.api");