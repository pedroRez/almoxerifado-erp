// preload.js
// Altere de 'import' para 'require'
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Funções de 'pecas'
    getAllPecas: () => ipcRenderer.invoke('pecas:fetch-all'),
    insertPeca: (peca) => ipcRenderer.invoke('pecas:insert', peca),
    updatePeca: (id, peca) => ipcRenderer.invoke('pecas:update', id, peca),
    deletePeca: (id) => ipcRenderer.invoke('pecas:delete', id),
    getRequestedPecas: () => ipcRenderer.invoke('pecas:fetch-requested'),

    // Funções de AUTENTICAÇÃO
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials), // credentials = { username, password }
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:get-session'),

    // Funções de GERENCIAMENTO DE USUÁRIOS
    createUser: (userData) => ipcRenderer.invoke('users:create', userData) // userData = { username, password, role }
    // Adicione aqui outras funções como listUsers, updateUserRole, deleteUser se precisar
});