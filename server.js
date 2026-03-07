const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// ── Set COMING_SOON=true in your hosting environment to show the coming soon page ──
const COMING_SOON = process.env.COMING_SOON === 'true';

const DATA_DIR = path.join(__dirname, 'data');
const REG_FILE  = path.join(DATA_DIR, 'registrations.json');
const NOTIFY_FILE = path.join(DATA_DIR, 'notify.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(REG_FILE))    fs.writeFileSync(REG_FILE, '[]');
if (!fs.existsSync(NOTIFY_FILE)) fs.writeFileSync(NOTIFY_FILE, '[]');

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ── Coming Soon: notify me ── */
app.post('/api/notify', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, message: 'Invalid email.' });
  }
  const list = readJSON(NOTIFY_FILE);
  if (list.find(e => e.email === email)) {
    return res.json({ ok: true, message: 'Already on the list!' });
  }
  list.push({ email, submittedAt: new Date().toISOString() });
  writeJSON(NOTIFY_FILE, list);
  console.log(`[NOTIFY] ${email} wants to be notified on launch.`);
  res.json({ ok: true });
});

/* ── Registration API ── */
app.post('/api/register', (req, res) => {
  const { firstName, lastName, email, phone, role, hallName, city, region } = req.body;
  if (!firstName || !lastName || !role) {
    return res.status(400).json({ ok: false, message: 'Missing required fields.' });
  }
  const regs = readJSON(REG_FILE);
  const entry = {
    id: 'r' + Date.now(),
    firstName, lastName,
    email: email || '',
    phone: phone || '',
    role,
    hallName: hallName || '',
    city: city || '',
    region: region || '',
    status: 'pending',
    submittedAt: new Date().toISOString()
  };
  regs.push(entry);
  writeJSON(REG_FILE, regs);
  console.log(`[REG] New ${role} registration: ${firstName} ${lastName} (${email || 'no email'})`);
  res.json({ ok: true, message: 'Registration received! Admin will review and activate your account within 24–48 hours.' });
});

/* ── Admin: list all registrations ── */
app.get('/api/registrations', (req, res) => res.json(readJSON(REG_FILE)));

/* ── Admin: update registration status ── */
app.patch('/api/registrations/:id', (req, res) => {
  const regs = readJSON(REG_FILE);
  const idx = regs.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false });
  regs[idx].status = req.body.status || regs[idx].status;
  writeJSON(REG_FILE, regs);
  res.json({ ok: true, entry: regs[idx] });
});

/* ── Coming soon preview (always accessible at /coming-soon) ── */
app.get('/coming-soon', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'coming-soon.html'));
});

/* ── Demo shortcuts (full app only) ── */
if (!COMING_SOON) {
  app.get('/player', (req, res) => res.redirect('/?demo=player'));
  app.get('/owner',  (req, res) => res.redirect('/?demo=owner'));
  app.get('/scout',  (req, res) => res.redirect('/?demo=scout'));
  app.get('/admin',  (req, res) => res.redirect('/?demo=admin'));
}

/* ── Catch-all: serve coming soon OR full app ── */
app.get('/{*path}', (req, res) => {
  const page = COMING_SOON ? 'coming-soon.html' : 'index.html';
  res.sendFile(path.join(__dirname, 'views', page));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PinoyPool running on http://localhost:${PORT} [${COMING_SOON ? 'COMING SOON mode' : 'LIVE mode'}]`);
});
