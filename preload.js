const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    fetchAllPecas: () => ipcRenderer.invoke('pecas:fetch-all'),
    insertPeca: (peca) => ipcRenderer.invoke('pecas:insert', peca),
    updatePeca: (id, peca) => ipcRenderer.invoke('pecas:update', id, peca),
    deletePeca: (id) => ipcRenderer.invoke('pecas:delete', id),
    fetchRequestedPecas: () => ipcRenderer.invoke('pecas:fetch-requested'), // Adicione esta linha
});