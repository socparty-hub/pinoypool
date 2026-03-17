const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  const host = req.hostname || '';
  const isProduction = host === 'pinoypool.com' || host === 'www.pinoypool.com';
  if (isProduction) {
    return res.sendFile(path.join(__dirname, 'coming-soon.html'));
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PinoyPool running on port ${PORT} | pinoypool.com → Coming Soon | other hosts → App`);
});
