"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hydrateState = hydrateState;
exports.persistState = persistState;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BetterSqlite3 = require('better-sqlite3');
const PERSIST_KEYS = [
    'users',
    'messages',
    'reviews',
    'carts',
    'orders',
    'wishlists',
    'resetTokens',
    'games',
];
const dbFilePath = process.env.SQLITE_DB_PATH ||
    (process.env.NODE_ENV === 'test' ? ':memory:' : path_1.default.join(process.cwd(), 'data', 'gogo.sqlite'));
if (dbFilePath !== ':memory:') {
    const dbDir = path_1.default.dirname(dbFilePath);
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
}
const db = new BetterSqlite3(dbFilePath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);
const readStmt = db.prepare('SELECT value FROM app_state WHERE key = ?');
const upsertStmt = db.prepare(`
  INSERT INTO app_state (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);
function replaceStateValue(state, key, value) {
    if (Array.isArray(state[key]) && Array.isArray(value)) {
        const target = state[key];
        target.splice(0, target.length, ...value);
        return;
    }
    if (state[key] &&
        typeof state[key] === 'object' &&
        !Array.isArray(state[key]) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)) {
        const target = state[key];
        Object.keys(target).forEach((objKey) => delete target[objKey]);
        Object.assign(target, value);
        return;
    }
    state[key] = value;
}
function hydrateState(state) {
    PERSIST_KEYS.forEach((key) => {
        const row = readStmt.get(key);
        if (!row?.value) {
            upsertStmt.run(key, JSON.stringify(state[key]));
            return;
        }
        try {
            const parsed = JSON.parse(row.value);
            replaceStateValue(state, key, parsed);
        }
        catch (error) {
            console.error(`[persistence] 無法解析 key=${key}，將使用預設值`, error);
            upsertStmt.run(key, JSON.stringify(state[key]));
        }
    });
}
function persistState(state) {
    const writeAll = db.transaction((payload) => {
        PERSIST_KEYS.forEach((key) => {
            upsertStmt.run(key, JSON.stringify(payload[key]));
        });
    });
    writeAll(state);
}
