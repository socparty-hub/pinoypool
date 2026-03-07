const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const DATA_DIR = path.join(__dirname, 'data');
const REG_FILE = path.join(DATA_DIR, 'registrations.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(REG_FILE)) fs.writeFileSync(REG_FILE, '[]');

function readRegs() {
  try { return JSON.parse(fs.readFileSync(REG_FILE, 'utf8')); }
  catch { return []; }
}
function writeRegs(data) {
  fs.writeFileSync(REG_FILE, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ── Registration API ── */
app.post('/api/register', (req, res) => {
  const { firstName, lastName, email, phone, role, hallName, city, region } = req.body;
  if (!firstName || !lastName || !role) {
    return res.status(400).json({ ok: false, message: 'Missing required fields.' });
  }
  const regs = readRegs();
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
  writeRegs(regs);
  console.log(`[REG] New ${role} registration: ${firstName} ${lastName} (${email || 'no email'})`);
  res.json({ ok: true, message: 'Registration received! Admin will review and activate your account within 24–48 hours.' });
});

/* ── Admin: list all registrations ── */
app.get('/api/registrations', (req, res) => {
  res.json(readRegs());
});

/* ── Admin: update registration status ── */
app.patch('/api/registrations/:id', (req, res) => {
  const regs = readRegs();
  const idx = regs.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false });
  regs[idx].status = req.body.status || regs[idx].status;
  writeRegs(regs);
  res.json({ ok: true, entry: regs[idx] });
});

/* ── Demo shortcuts ── */
app.get('/player', (req, res) => res.redirect('/?demo=player'));
app.get('/owner',  (req, res) => res.redirect('/?demo=owner'));
app.get('/scout',  (req, res) => res.redirect('/?demo=scout'));
app.get('/admin',  (req, res) => res.redirect('/?demo=admin'));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PinoyPool running on http://localhost:${PORT}`));
