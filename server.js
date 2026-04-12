// Catch any crash before Node dies silently
process.on('uncaughtException', (err) => {
  const fs2 = require('fs');
  const msg = `[CRASH] ${new Date().toISOString()} ${err.message}\n${err.stack}\n`;
  process.stderr.write(msg);
  try { fs2.appendFileSync('./startup.log', msg); } catch(e) {}
});

process.stderr.write('[STARTUP] server.js loading...\n');
try { require('dotenv').config(); } catch(e) { process.stderr.write('[STARTUP] dotenv error: ' + e.message + '\n'); }

const express = require('express');
const path    = require('path');
const fs      = require('fs');
let db;
try {
  db = require('./db');
  console.error('[STARTUP] db.js loaded OK');
} catch(e) {
  console.error('[STARTUP] FATAL: failed to load db.js:', e.message);
  process.exit(1);
}

const app           = express();
const PORT          = process.env.PORT || 3000;
const PREVIEW_TOKEN = process.env.PREVIEW_TOKEN;

app.use(express.json({ limit: '10mb' }));
// index: false — prevents express.static from serving index.html directly
// so our app.get('*') route can inject server data into it first
app.use(express.static(path.join(__dirname), { index: false }));

/* ── API: register a new player / hall owner / scout ── */
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, username, email, phone, dob, role, hallName, city, region } = req.body;
  if (!firstName || !lastName || !role) {
    return res.status(400).json({ ok: false, message: 'Missing required fields.' });
  }
  const store = await db.getAll();
  let users = [];
  try { users = JSON.parse(store['pp_registeredUsers'] || '[]'); } catch(e) {}
  const entry = {
    id:                 'r' + Date.now(),
    name:               (firstName + ' ' + lastName).trim(),
    username:           username   || '',
    email:              email      || '',
    phone:              phone      || '',
    dob:                dob        || '',
    role,
    hall:               hallName   || '',
    hallName:           hallName   || '',
    city:               city       || '',
    region:             region     || '',
    verificationStatus: 'pending',
    careerStatus:       null,
    ppr:                0,
    submittedAt:        new Date().toISOString()
  };
  users.push(entry);
  await db.set('pp_registeredUsers', JSON.stringify(users));
  console.log(`[REG] New ${role} registration received (id: ${entry.id})`);
  res.json({ ok: true, id: entry.id, message: 'Registration received! Admin will review and activate your account within 24–48 hours.' });
});

/* ── API: list registered users (buildAdmin fetches this to populate adminPlayers) ── */
app.get('/api/registrations', async (req, res) => {
  const store = await db.getAll();
  let users = [];
  try { users = JSON.parse(store['pp_registeredUsers'] || '[]'); } catch(e) {}
  const registrations = users.map(u => {
    const parts = (u.name || '').trim().split(' ');
    return {
      id:          u.id,
      firstName:   parts[0] || '',
      lastName:    parts.slice(1).join(' ') || '',
      username:    u.username    || '',
      email:       u.email       || '',
      phone:       u.phone       || '',
      role:        u.role        || 'player',
      region:      u.region      || '',
      status:      u.verificationStatus || 'pending',
      submittedAt: u.submittedAt || '',
      careerStatus:u.careerStatus||null,
      ppr:         u.ppr         || 0,
      hallName:    u.hall || u.hallName || '',
      city:        u.city        || '',
    };
  });
  res.json(registrations);
});

/* ── API: update registration status (called when admin approves a player) ── */
app.patch('/api/registrations/:id', async (req, res) => {
  const { id } = req.params;
  const { status, careerStatus, ppr, approvedAt } = req.body;
  const store = await db.getAll();
  let users = [];
  try { users = JSON.parse(store['pp_registeredUsers'] || '[]'); } catch(e) {}
  const user = users.find(u => String(u.id) === String(id));
  if (user) {
    if (status)           user.verificationStatus = status;
    if (careerStatus)     user.careerStatus = careerStatus;
    if (typeof ppr === 'number') user.ppr = ppr;
    if (approvedAt)       user.approvedAt = approvedAt;
    await db.set('pp_registeredUsers', JSON.stringify(users));
  }
  res.json({ ok: true });
});

/* ── API: admin data reset (clears all server-side data) ── */
app.post('/api/admin/reset', async (req, res) => {
  const { password } = req.body;
  const RESET_PW = process.env.ADMIN_RESET_PASSWORD;
  if (!RESET_PW || password !== RESET_PW) return res.status(403).json({ ok: false, error: 'Forbidden' });
  for (const k of db.ALLOWED_KEYS.filter(k => k !== 'pp_testPasswords')) {
    await db.set(k, '[]');
  }
  console.log('[RESET] All server data cleared by admin.');
  res.json({ ok: true, message: 'All server data cleared.' });
});

/* ── API: save a single pp_* key to MySQL ── */
app.post('/api/store/:key', async (req, res) => {
  const { key }   = req.params;
  const { value } = req.body;
  if (typeof value !== 'string') {
    return res.status(400).json({ error: 'value must be a JSON string' });
  }
  const ok = await db.set(key, value);
  if (!ok) return res.status(403).json({ error: 'key not permitted' });
  res.json({ ok: true });
});

/* ── Serve index.html with server-injected persisted data ── */
app.get('*', async (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  let html;
  try {
    html = fs.readFileSync(indexPath, 'utf8');
  } catch (e) {
    return res.status(500).send('Could not read index.html');
  }

  let serverData;
  try { serverData = await db.getAll(); } catch (e) { serverData = {}; }
  const injection   = `<script>window.__SD__=${JSON.stringify(serverData)};</script>`;
  html = html.replace('<!-- __SERVER_DATA__ -->', injection);

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(html);
});

/* ── Start: log env, connect to MySQL, then listen ── */
console.error(`[STARTUP] PORT=${process.env.PORT} DB_NAME=${process.env.DB_NAME}`);

db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PinoyPool running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('[DB] Failed to connect to MySQL:', err.message);
    console.error('[DB] Check DB_HOST, DB_USER, DB_PASS, DB_NAME environment variables.');
    // Start server anyway so the 503 clears and we can read logs
    app.listen(PORT, () => {
      console.log(`PinoyPool running on port ${PORT} (DB UNAVAILABLE)`);
    });
  });
