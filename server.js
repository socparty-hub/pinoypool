const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  // Bypass coming soon for staging/admin access via secret param
  if (req.query.preview === 'pp2026') {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  res.sendFile(path.join(__dirname, 'coming-soon.html'));
});

app.listen(PORT, () => {
  console.log(`PinoyPool running on port ${PORT} | Mode: Coming Soon`);
});
