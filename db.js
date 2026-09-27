import pg from 'pg';
import Database from 'better-sqlite3';

const { Pool } = pg;
const usePostgres = Boolean(process.env.DATABASE_URL);

let sqlite;
let pool;

const schema = `
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, console TEXT, genre TEXT,
  year INTEGER, size TEXT, version TEXT, tag TEXT, img TEXT, description TEXT,
  pack TEXT, link TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS packs (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, short TEXT, console TEXT,
  count INTEGER DEFAULT 0, old_price INTEGER DEFAULT 0, price INTEGER DEFAULT 0,
  description TEXT, img TEXT, link TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, time TEXT, img TEXT, link TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tutorials (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, icon TEXT, description TEXT, link TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, customer_name TEXT, customer_contact TEXT,
  item_type TEXT NOT NULL, item_id TEXT NOT NULL, item_name TEXT,
  amount INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending',
  receipt TEXT, note TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

if (usePostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: { rejectUnauthorized: false }
  });
  await pool.query(schema);
  console.log('GAME TROLL: PostgreSQL database connected.');
} else {
  const path = process.env.DB_PATH || './game-troll.sqlite';
  sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(schema.replaceAll('TIMESTAMP', 'TEXT'));
  console.log('GAME TROLL: local SQLite database connected.');
}

function sqliteRows(sql, params=[]) { return sqlite.prepare(sql).all(...params); }
function sqliteGet(sql, params=[]) { return sqlite.prepare(sql).get(...params); }
function sqliteRun(sql, params=[]) { return sqlite.prepare(sql).run(...params); }

export const db = {
  async all(sql, params=[]) {
    if (!usePostgres) return sqliteRows(sql, params);
    let n = 0; const q = sql.replaceAll('?', () => `$${++n}`);
    return (await pool.query(q, params)).rows;
  },
  async get(sql, params=[]) {
    if (!usePostgres) return sqliteGet(sql, params);
    let n = 0; const q = sql.replaceAll('?', () => `$${++n}`);
    return (await pool.query(q, params)).rows[0];
  },
  async run(sql, params=[]) {
    if (!usePostgres) return sqliteRun(sql, params);
    let n = 0; const q = sql.replaceAll('?', () => `$${++n}`);
    return pool.query(q, params);
  },
  async upsert(table, columns, values) {
    if (!usePostgres) {
      const placeholders = columns.map(() => '?').join(',');
      const updates = columns.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(',');
      const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}, updated_at=CURRENT_TIMESTAMP`;
      sqliteRun(sql, values);
      return sqliteGet(`SELECT * FROM ${table} WHERE id=?`, [values[columns.indexOf('id')]]);
    }
    const placeholders = columns.map((_, i) => `$${i+1}`).join(',');
    const updates = columns.filter(c => c !== 'id').map(c => `${c}=EXCLUDED.${c}`).join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}, updated_at=CURRENT_TIMESTAMP RETURNING *`;
    return (await pool.query(sql, values)).rows[0];
  }
};
