import fs from 'fs';
import path from 'path';
import type { AppState } from '../types/backend';

const BetterSqlite3 = require('better-sqlite3');

type PersistKey = keyof AppState;

const PERSIST_KEYS: PersistKey[] = [
  'users',
  'messages',
  'reviews',
  'carts',
  'orders',
  'wishlists',
  'resetTokens',
  'games',
];

const dbFilePath =
  process.env.SQLITE_DB_PATH ||
  (process.env.NODE_ENV === 'test' ? ':memory:' : path.join(process.cwd(), 'data', 'gogo.sqlite'));
if (dbFilePath !== ':memory:') {
  const dbDir = path.dirname(dbFilePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
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

function replaceStateValue(state: AppState, key: PersistKey, value: unknown) {
  if (Array.isArray(state[key]) && Array.isArray(value)) {
    const target = state[key] as unknown as unknown[];
    target.splice(0, target.length, ...value);
    return;
  }

  if (
    state[key] &&
    typeof state[key] === 'object' &&
    !Array.isArray(state[key]) &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    const target = state[key] as Record<string, unknown>;
    Object.keys(target).forEach((objKey) => delete target[objKey]);
    Object.assign(target, value as Record<string, unknown>);
    return;
  }

  (state as any)[key] = value;
}

export function hydrateState(state: AppState) {
  PERSIST_KEYS.forEach((key) => {
    const row = readStmt.get(key) as { value?: string } | undefined;
    if (!row?.value) {
      upsertStmt.run(key, JSON.stringify(state[key]));
      return;
    }

    try {
      const parsed = JSON.parse(row.value);
      replaceStateValue(state, key, parsed);
    } catch (error) {
      console.error(`[persistence] 無法解析 key=${key}，將使用預設值`, error);
      upsertStmt.run(key, JSON.stringify(state[key]));
    }
  });
}

export function persistState(state: AppState) {
  const writeAll = db.transaction((payload: AppState) => {
    PERSIST_KEYS.forEach((key) => {
      upsertStmt.run(key, JSON.stringify(payload[key]));
    });
  });

  writeAll(state);
}
