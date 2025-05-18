import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { connectDatabase, createTables, getAllPecas, insertPeca, updatePeca, deletePeca, getRequestedPecas } from './localDatabase.js';

async function handleGetAllPecas() {
    return await getAllPecas();
}

async function handleInsertPeca(event, peca) {
    return await insertPeca(peca);
}

async function handleUpdatePeca(event, id, peca) {
    return await updatePeca(id, peca);
}

async function handleDeletePeca(event, id) {
    return await deletePeca(id);
}

async function handleGetRequestedPecas() {
    return await getRequestedPecas();
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

    mainWindow.loadURL('http://localhost:5173/'); // Carregar a URL do Vite durante o desenvolvimento
    // mainWindow.webContents.openDevTools(); // Opcional: abrir DevTools no Electron
}

app.whenReady().then(async () => {
    await connectDatabase();
    await createTables();
    createWindow();

    ipcMain.handle('pecas:fetch-all', handleGetAllPecas);
    ipcMain.handle('pecas:insert', handleInsertPeca);
    ipcMain.handle('pecas:update', handleUpdatePeca);
    ipcMain.handle('pecas:delete', handleDeletePeca);
    ipcMain.handle('pecas:fetch-requested', handleGetRequestedPecas); // Handler para as peças requisitadas

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});