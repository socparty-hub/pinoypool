/* ── PinoyPool JSON file persistence layer (pure Node.js — no native deps) ── */
const fs   = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'pinoypool-data.json');

// Only these keys are persisted server-side (no ephemeral/session keys)
const ALLOWED_KEYS = [
  'pp_adminMatches',
  'pp_registeredUsers',
  'pp_approvedPlayers',
  'pp_approvedHalls',
  'pp_tournaments',
  'pp_testPasswords',
];

function readStore() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch (e) { return {}; }
}

function writeStore(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf8');
}

module.exports = {
  ALLOWED_KEYS,

  /** Return all persisted keys as { key: jsonString } */
  getAll() {
    const store = readStore();
    const result = {};
    ALLOWED_KEYS.forEach(k => { if (store[k] !== undefined) result[k] = store[k]; });
    return result;
  },

  /** Persist one key (value must be a JSON string) */
  set(key, value) {
    if (!ALLOWED_KEYS.includes(key)) return false;
    const store = readStore();
    store[key] = typeof value === 'string' ? value : JSON.stringify(value);
    writeStore(store);
    return true;
  },
};
