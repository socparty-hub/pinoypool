/* ── PinoyPool MySQL persistence layer ── */
console.error('[DB] db.js loading...');
try { require('dotenv').config(); } catch(e) {}

console.error('[DB] requiring mysql2...');
const mysql = require('mysql2/promise');
console.error('[DB] mysql2 loaded OK');

const ALLOWED_KEYS = [
  'pp_adminMatches',
  'pp_registeredUsers',
  'pp_approvedPlayers',
  'pp_approvedHalls',
  'pp_tournaments',
  'pp_testPasswords',
  'pp_notifications',
  'pp_push_subscriptions',
];

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
});

/** Ensure the pp_store table exists (called once on startup) */
async function init() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS pp_store (
      \`key\`   VARCHAR(100) PRIMARY KEY,
      \`value\` LONGTEXT     NOT NULL
    )
  `);
  console.log('[DB] MySQL connected and pp_store table ready.');
}

/** Return all whitelisted keys as { key: jsonString } */
async function getAll() {
  const placeholders = ALLOWED_KEYS.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT \`key\`, \`value\` FROM pp_store WHERE \`key\` IN (${placeholders})`,
    ALLOWED_KEYS
  );
  const result = {};
  rows.forEach(r => { result[r.key] = r.value; });
  return result;
}

/** Persist one key (value must be a JSON string). Returns false if key not allowed. */
async function set(key, value) {
  if (!ALLOWED_KEYS.includes(key)) return false;
  const v = typeof value === 'string' ? value : JSON.stringify(value);
  await pool.execute(
    `INSERT INTO pp_store (\`key\`, \`value\`) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
    [key, v]
  );
  return true;
}

module.exports = { ALLOWED_KEYS, init, getAll, set };
