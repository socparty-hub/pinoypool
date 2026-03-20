try { require('dotenv').config(); } catch(e) {}

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const PREVIEW_TOKEN = process.env.PREVIEW_TOKEN;

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  // Bypass coming soon via secret token set in PREVIEW_TOKEN env var
  if (PREVIEW_TOKEN && req.query.preview === PREVIEW_TOKEN) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  res.sendFile(path.join(__dirname, 'coming-soon.html'));
});

app.listen(PORT, () => {
  console.log(`PinoyPool running on port ${PORT} | Mode: Coming Soon`);
});
