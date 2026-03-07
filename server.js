const express = require('express');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const app = express();

// Load .env file if present (for local dev / Hostinger)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#') && val.length) {
      process.env[key.trim()] = val.join('=').trim();
    }
  });
}

// ── COMING_SOON: true = show coming soon page, false = show full app ──
const COMING_SOON = process.env.COMING_SOON === 'true';

// ── Email config (set these env vars on your server) ──
// SMTP_USER   = your Gmail address  e.g. yourname@gmail.com
// SMTP_PASS   = Gmail App Password  (16-char, from Google Account → Security → App Passwords)
// NOTIFY_TO   = where to send alerts e.g. yourname@gmail.com
const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

function sendAlert(subject, html) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.NOTIFY_TO) return;
  mailer.sendMail({
    from: `"PinoyPool" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_TO,
    subject,
    html
  }).catch(err => console.error('[MAIL ERROR]', err.message));
}

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
  const entry = { email, submittedAt: new Date().toISOString() };
  list.push(entry);
  writeJSON(NOTIFY_FILE, list);
  console.log(`[NOTIFY] ${email} signed up for launch notification.`);
  sendAlert(
    `🎱 PinoyPool — New Launch Signup: ${email}`,
    `<h2 style="font-family:sans-serif;">New Launch Notification Signup</h2>
     <p style="font-family:sans-serif;font-size:16px;"><strong>Email:</strong> ${email}<br>
     <strong>Time:</strong> ${new Date().toLocaleString('en-PH',{timeZone:'Asia/Manila'})}</p>
     <p style="font-family:sans-serif;font-size:13px;color:#888;">Total signups so far: ${list.length}</p>`
  );
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
  sendAlert(
    `🎱 PinoyPool — New ${role.charAt(0).toUpperCase()+role.slice(1)} Registration: ${firstName} ${lastName}`,
    `<h2 style="font-family:sans-serif;">New Registration on PinoyPool</h2>
     <table style="font-family:sans-serif;font-size:15px;border-collapse:collapse;">
       <tr><td style="padding:4px 12px 4px 0;color:#888;">Name</td><td><strong>${firstName} ${lastName}</strong></td></tr>
       <tr><td style="padding:4px 12px 4px 0;color:#888;">Role</td><td>${role}</td></tr>
       <tr><td style="padding:4px 12px 4px 0;color:#888;">Email</td><td>${email || '—'}</td></tr>
       <tr><td style="padding:4px 12px 4px 0;color:#888;">Phone</td><td>${phone || '—'}</td></tr>
       ${hallName ? `<tr><td style="padding:4px 12px 4px 0;color:#888;">Hall</td><td>${hallName}</td></tr>` : ''}
       ${city ? `<tr><td style="padding:4px 12px 4px 0;color:#888;">City</td><td>${city}</td></tr>` : ''}
       <tr><td style="padding:4px 12px 4px 0;color:#888;">Time</td><td>${new Date().toLocaleString('en-PH',{timeZone:'Asia/Manila'})}</td></tr>
     </table>
     <p style="font-family:sans-serif;font-size:13px;color:#888;margin-top:12px;">Login to the admin panel to activate this account.</p>`
  );
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
