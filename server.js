try { require('dotenv').config(); } catch(e) {}

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const db      = require('./db');

const app           = express();
const PORT          = process.env.PORT || 3000;
const PREVIEW_TOKEN = process.env.PREVIEW_TOKEN;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

/* ── API: save a single pp_* key to SQLite ── */
app.post('/api/store/:key', (req, res) => {
  const { key }   = req.params;
  const { value } = req.body;
  if (typeof value !== 'string') {
    return res.status(400).json({ error: 'value must be a JSON string' });
  }
  const ok = db.set(key, value);
  if (!ok) return res.status(403).json({ error: 'key not permitted' });
  res.json({ ok: true });
});

/* ── Serve index.html with server-injected persisted data ── */
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  let html;
  try {
    html = fs.readFileSync(indexPath, 'utf8');
  } catch (e) {
    return res.status(500).send('Could not read index.html');
  }

  // Load all persisted data and embed it as a global before the app script runs
  const serverData  = db.getAll();
  const injection   = `<script>window.__SD__=${JSON.stringify(serverData)};</script>`;
  html = html.replace('<!-- __SERVER_DATA__ -->', injection);

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`PinoyPool running on port ${PORT}`);
});
