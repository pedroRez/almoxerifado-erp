// preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log("[preload.js] Script de pré-carregamento (vComOS_Func_API)...");

contextBridge.exposeInMainWorld('api', {
    // Peças
    getAllPecas: () => ipcRenderer.invoke('pecas:fetch-all'),
    insertPeca: (peca) => ipcRenderer.invoke('pecas:insert', peca),
    updatePeca: (id_sync, peca) => ipcRenderer.invoke('pecas:update', id_sync, peca),
    deletePeca: (id_sync, usuario_id) => ipcRenderer.invoke('pecas:delete', id_sync, usuario_id),
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
    deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId),

    // NOVAS: Funcionários (distintos de Usuários com login)
    getAllFuncionarios: () => ipcRenderer.invoke('funcionarios:fetch-all'),
    createFuncionario: (funcionarioData) => ipcRenderer.invoke('funcionarios:create', funcionarioData),
    updateFuncionario: (id_funcionario, funcionarioData) => ipcRenderer.invoke('funcionarios:update', id_funcionario, funcionarioData),
    // deleteFuncionario: (id_funcionario) => ipcRenderer.invoke('funcionarios:delete', id_funcionario), // Se for implementar
    deleteFuncionario: (id_funcionario) => ipcRenderer.invoke('funcionarios:delete', id_funcionario),
    // NOVAS: Ordens de Serviço (CRUD inicial)
    getAllOrdensServico: () => ipcRenderer.invoke('os:fetch-all'),
    createOrdemServico: (osData) => ipcRenderer.invoke('os:create', osData)
    // TODO: updateOrdemServico, getOrdemServicoById, etc.
    // TODO: Funções para os_materiais, os_mao_de_obra, os_caracteristicas
});

console.log("[preload.js] API do Electron exposta como window.api");