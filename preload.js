// preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log("[preload.js] Script de pré-carregamento (vComCreateFuncionarioAndOrUser_FINAL)...");

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

    // Gerenciamento de Contas de Usuário (user records) - Funções diretas para users
    createUserAccount: (userData) => ipcRenderer.invoke('users:create', userData), // Para criar/editar user logins diretamente
    getAllUsers: () => ipcRenderer.invoke('users:fetch-all'),
    updateUserDetails: (details) => ipcRenderer.invoke('users:update-details', details),
    adminResetPassword: (resetData) => ipcRenderer.invoke('users:admin-reset-password', resetData),
    deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId),

    // Gerenciamento de Funcionários (employee records) e Criação Unificada
    getAllFuncionarios: () => ipcRenderer.invoke('funcionarios:fetch-all'),
    // Função unificada que cria o funcionário e, opcionalmente, o usuário associado
    createFuncionarioAndOrUser: (data) => ipcRenderer.invoke('funcionarios:create-full', data),
    updateFuncionario: (id_funcionario, funcionarioData) => ipcRenderer.invoke('funcionarios:update', { id_funcionario, funcionarioData }),
    deleteFuncionario: (id_funcionario) => ipcRenderer.invoke('funcionarios:delete', id_funcionario), // Faz soft delete (inativa)

    // Ordens de Serviço
    getAllOrdensServico: () => ipcRenderer.invoke('os:fetch-all'),
    createOrdemServico: (osData) => ipcRenderer.invoke('os:create', osData)
});

console.log("[preload.js] API do Electron exposta com sucesso como window.api");