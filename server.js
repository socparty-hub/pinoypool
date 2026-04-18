// Catch any crash before Node dies silently
process.on('uncaughtException', (err) => {
  const fs2 = require('fs');
  const msg = `[CRASH] ${new Date().toISOString()} ${err.message}\n${err.stack}\n`;
  process.stderr.write(msg);
  try { fs2.appendFileSync('./startup.log', msg); } catch(e) {}
});

process.stderr.write('[STARTUP] server.js loading...\n');
try { require('dotenv').config(); } catch(e) { process.stderr.write('[STARTUP] dotenv error: ' + e.message + '\n'); }

const express  = require('express');
const path     = require('path');
const fs       = require('fs');

/* ── web-push: optional — server starts normally even if not installed ── */
let webpush = null;
try { webpush = require('web-push'); } catch(e) {
  console.error('[PUSH] web-push not installed — mobile push disabled. Run: npm install');
}

/* ── Configure VAPID for Web Push ── */
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const _vapidEmailRaw = process.env.VAPID_EMAIL || 'admin@pinoypool.ph';
const VAPID_EMAIL = (_vapidEmailRaw.startsWith('mailto:') || _vapidEmailRaw.startsWith('https:'))
  ? _vapidEmailRaw
  : `mailto:${_vapidEmailRaw}`;
if (webpush && VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    console.error('[PUSH] VAPID configured — mobile push enabled.');
  } catch(e) {
    console.error('[PUSH] VAPID config failed:', e.message, '— push disabled.');
    webpush = null;
  }
} else {
  console.error('[PUSH] Mobile push disabled (web-push missing or VAPID keys not set).');
}
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
  const { firstName, lastName, username, email, phone, dob, role, hallName, city, region, password, moniker } = req.body;
  if (!firstName || !lastName || !role) {
    return res.status(400).json({ ok: false, message: 'Missing required fields.' });
  }
  let store;
  try { store = await db.getAll(); } catch(e) {
    console.error('[DB] register fetch error:', e.message);
    return res.status(500).json({ ok: false, message: 'Server error. Please try again.' });
  }
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
    moniker:            moniker    || '',
    password:           password   || '',
    verificationStatus: 'pending',
    careerStatus:       null,
    ppr:                0,
    submittedAt:        new Date().toISOString()
  };
  users.push(entry);
  try {
    await db.set('pp_registeredUsers', JSON.stringify(users));
    invalidateDbCache();
  } catch(e) {
    console.error('[DB] register save error:', e.message);
    return res.status(500).json({ ok: false, message: 'Server error saving registration. Please try again.' });
  }
  console.log(`[REG] New ${role} registration received (id: ${entry.id})`);
  res.json({ ok: true, id: entry.id, message: 'Registration received! Admin will review and activate your account within 24–48 hours.' });
});

/* ── API: list registered users (buildAdmin fetches this to populate adminPlayers) ── */
app.get('/api/registrations', async (req, res) => {
  let store;
  try { store = await db.getAll(); } catch(e) {
    console.error('[DB] registrations fetch error:', e.message);
    return res.status(500).json([]);
  }
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
  const { status, careerStatus, ppr, approvedAt, email } = req.body;
  try {
    const fields = {};
    if (status)                   fields.status       = status;
    if (careerStatus)             fields.careerStatus = careerStatus;
    if (typeof ppr === 'number')  fields.ppr          = ppr;
    if (approvedAt)               fields.approvedAt   = approvedAt;
    // Local hall IDs (h...) may differ from backend user IDs (r...) when
    // registration happened offline. Resolve the real DB row by email fallback.
    let resolvedId = String(id);
    if (email) {
      try {
        const [rows] = await db.query(
          'SELECT id FROM users WHERE id=? OR email=? LIMIT 1',
          [String(id), email]
        );
        if (rows.length) resolvedId = rows[0].id;
      } catch(e) { /* fall back to raw id */ }
    }
    await db.updateUser(resolvedId, fields, email);
    invalidateDbCache();
    res.json({ ok: true });
  } catch(e) {
    console.error('[DB] patch registration error:', e.message);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

/* ── API: save a push subscription for a user ── */
app.post('/api/push/subscribe', async (req, res) => {
  const { username, subscription } = req.body;
  if (!username || !subscription || !subscription.endpoint) {
    return res.status(400).json({ ok: false, error: 'Missing username or subscription' });
  }
  try {
    await db.addPushSub(username, subscription);
    res.json({ ok: true });
  } catch(e) {
    console.error('[PUSH] subscribe error:', e.message);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

/* ── API: send a push notification to a user ── */
app.post('/api/push/send', async (req, res) => {
  if (!webpush || !VAPID_PUBLIC || !VAPID_PRIVATE) return res.json({ ok: false, reason: 'push_unavailable' });
  const { username, title, body, type } = req.body;
  if (!username) return res.status(400).json({ ok: false, error: 'Missing username' });

  let userSubs;
  try { userSubs = await db.getPushSubs(username); } catch(e) { return res.json({ ok: true, sent: 0 }); }
  if (!userSubs.length) return res.json({ ok: true, sent: 0 });

  const payload = JSON.stringify({ title: title || 'PinoyPool', body: body || 'New notification', type: type || '' });
  let sent = 0;

  await Promise.all(userSubs.map(async sub => {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      // 410 Gone or 404 = subscription expired, remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.removePushSub(username, sub.endpoint).catch(() => {});
      }
    }
  }));

  res.json({ ok: true, sent });
});

/* ── API: expose VAPID public key to the client ── */
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ key: VAPID_PUBLIC });
});

/* ── API: admin data reset (clears all server-side data) ── */
app.post('/api/admin/reset', async (req, res) => {
  const { password } = req.body;
  const RESET_PW = process.env.ADMIN_RESET_PASSWORD;
  if (!RESET_PW || password !== RESET_PW) return res.status(403).json({ ok: false, error: 'Forbidden' });
  try {
    await db.resetAll();
    invalidateDbCache();
    console.log('[RESET] All server data cleared by admin.');
    res.json({ ok: true, message: 'All server data cleared.' });
  } catch(e) {
    console.error('[RESET] Error during reset:', e.message);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

/* ── API: save a single pp_* key to MySQL ── */
app.post('/api/store/:key', async (req, res) => {
  const { key }   = req.params;
  const { value } = req.body;
  if (typeof value !== 'string') {
    return res.status(400).json({ error: 'value must be a JSON string' });
  }
  try {
    const ok = await db.set(key, value);
    if (!ok) return res.status(403).json({ error: 'key not permitted' });
    invalidateDbCache();
    res.json({ ok: true });
  } catch (e) {
    console.error('[DB] store error:', e.message);
    res.status(500).json({ ok: false, error: 'db_error' });
  }
});

/* ── API: health check ── */
app.get('/api/health', async (req, res) => {
  let dbOk = false;
  try { await db.getAll(); dbOk = true; } catch (e) {}
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    ts: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

/* ── In-memory cache for db.getAll() — avoids MySQL hit on every page load ── */
let _dbCache     = null;
let _dbCacheTime = 0;
const DB_CACHE_TTL = 30 * 1000; // 30 seconds

async function getCachedData() {
  const now = Date.now();
  if (_dbCache && (now - _dbCacheTime) < DB_CACHE_TTL) return _dbCache;
  _dbCache     = await db.getAll();
  _dbCacheTime = now;
  return _dbCache;
}

/** Call this whenever a write happens so the next read is fresh */
function invalidateDbCache() { _dbCache = null; }

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
  try { serverData = await getCachedData(); } catch (e) { serverData = {}; }
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
