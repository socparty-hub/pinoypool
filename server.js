const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Domains that show the coming soon page
const COMING_SOON_HOSTS = ['pinoypool.com', 'www.pinoypool.com'];

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  if (COMING_SOON_HOSTS.includes(req.hostname)) {
    res.sendFile(path.join(__dirname, 'coming-soon.html'));
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`PinoyPool running on port ${PORT}`);
});
