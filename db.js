/* ── PinoyPool SQLite persistence layer ── */
const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'pinoypool.db');
const db      = new Database(DB_PATH);

// Single key-value table — mirrors the localStorage keys the app uses
db.exec(`
  CREATE TABLE IF NOT EXISTS pp_store (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// Only these keys are persisted server-side (no ephemeral/session keys)
const ALLOWED_KEYS = [
  'pp_adminMatches',
  'pp_registeredUsers',
  'pp_approvedPlayers',
  'pp_approvedHalls',
  'pp_tournaments',
  'pp_testPasswords',
];

const stmtGet    = db.prepare('SELECT value FROM pp_store WHERE key = ?');
const stmtUpsert = db.prepare(
  'INSERT INTO pp_store (key, value, updated_at) VALUES (?, ?, datetime("now")) ' +
  'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
);

module.exports = {
  ALLOWED_KEYS,

  /** Return all persisted keys as { key: jsonString } */
  getAll() {
    const placeholders = ALLOWED_KEYS.map(() => '?').join(',');
    const rows = db
      .prepare(`SELECT key, value FROM pp_store WHERE key IN (${placeholders})`)
      .all(...ALLOWED_KEYS);
    const result = {};
    rows.forEach(r => { result[r.key] = r.value; });
    return result;
  },

  /** Persist one key (value must be a JSON string) */
  set(key, value) {
    if (!ALLOWED_KEYS.includes(key)) return false;
    stmtUpsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  },
};
