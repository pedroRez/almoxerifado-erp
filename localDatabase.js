import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { verbose } = sqlite3;
const dbPath = path.resolve(__dirname, 'almoxerifado.db');

let db;

async function connectDatabase() {
    if (db) return db; // Se já estiver conectado, retorna a instância existente
    return new Promise((resolve, reject) => {
        const sqlite = verbose();
        db = new sqlite.Database(dbPath, (err) => {
            if (err) {
                console.error("Erro ao conectar ao banco de dados:", err.message);
                reject(err);
            } else {
                console.log("Conectado ao banco de dados SQLite.");
                resolve(db);
            }
        });
    });
}

async function createTables() {
    const db = await connectDatabase();
    return new Promise(async (resolve, reject) => {
        const sqlCreateTableUsers = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT CHECK (role IN ('gerente', 'funcionario')) NOT NULL
            );
        `;

        const sqlCreateTablePecas = `
            CREATE TABLE IF NOT EXISTS pecas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                tipo TEXT,
                fabricante TEXT,
                estoque_atual INTEGER,
                estoque_minimo INTEGER
            );
        `;

        const sqlCreateTableMaquinas = `
            CREATE TABLE IF NOT EXISTS maquinas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT,
                tipo TEXT CHECK (tipo IN ('escavadeira', 'caminhao')),
                localizacao TEXT,
                motorista TEXT
            );
        `;

        const sqlCreateTableMovimentacoes = `
            CREATE TABLE IF NOT EXISTS movimentacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                peca_id INTEGER,
                usuario_id INTEGER,
                maquina_id INTEGER,
                tipo TEXT CHECK (tipo IN ('entrada', 'saida')),
                quantidade INTEGER,
                data DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (peca_id) REFERENCES pecas(id),
                FOREIGN KEY (usuario_id) REFERENCES users(id),
                FOREIGN KEY (maquina_id) REFERENCES maquinas(id)
            );
        `;

        try {
            await db.run(sqlCreateTableUsers);
            await db.run(sqlCreateTablePecas);
            await db.run(sqlCreateTableMaquinas);
            await db.run(sqlCreateTableMovimentacoes);
            console.log("Tabelas criadas (ou já existentes).");
            resolve();
        } catch (err) {
            console.error("Erro ao criar tabelas:", err.message);
            reject(err);
        }
    });
}

async function getAllPecas() {
    const db = await connectDatabase();
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM pecas", [], (err, rows) => {
            if (err) {
                console.error("Erro ao buscar todas as peças:", err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function insertPeca(peca) {
    const db = await connectDatabase();
    return new Promise((resolve, reject) => {
        const { nome, tipo, fabricante, estoque_atual, estoque_minimo } = peca;
        db.run("INSERT INTO pecas (nome, tipo, fabricante, estoque_atual, estoque_minimo) VALUES (?, ?, ?, ?, ?)",
            [nome, tipo, fabricante, estoque_atual, estoque_minimo],
            function (err) {
                if (err) {
                    console.error("Erro ao inserir peça:", err.message);
                } else {
                    resolve(this.lastID); // Retorna o ID da última inserção
                }
            });
    });
}

async function updatePeca(id, peca) {
    const db = await connectDatabase();
    return new Promise((resolve, reject) => {
        const { nome, tipo, fabricante, estoque_atual, estoque_minimo } = peca;
        db.run("UPDATE pecas SET nome = ?, tipo = ?, fabricante = ?, estoque_atual = ?, estoque_minimo = ? WHERE id = ?",
            [nome, tipo, fabricante, estoque_atual, estoque_minimo, id],
            function (err) {
                if (err) {
                    console.error("Erro ao atualizar peça:", err.message);
                } else {
                    resolve(this.changes); // Retorna o número de linhas afetadas
                }
            });
    });
}

async function deletePeca(id) {
    const db = await connectDatabase();
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM pecas WHERE id = ?", [id], function (err) {
            if (err) {
                console.error("Erro ao deletar peça:", err.message);
            } else {
                resolve(this.changes); // Retorna o número de linhas afetadas
            }
        });
    });
}

async function getRequestedPecas() {
    const db = await connectDatabase();
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT pecas.nome, COUNT(movimentacoes.peca_id) AS quantidade
            FROM movimentacoes
            JOIN pecas ON movimentacoes.peca_id = pecas.id
            WHERE movimentacoes.tipo = 'saida'
            GROUP BY pecas.nome
            ORDER BY quantidade DESC
            LIMIT 5; -- Exemplo: Top 5 peças mais requisitadas
        `;
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error("Erro ao buscar peças mais requisitadas:", err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

export {
    connectDatabase,
    createTables,
    getAllPecas,
    insertPeca,
    updatePeca,
    deletePeca,
    getRequestedPecas,
};

createTables();