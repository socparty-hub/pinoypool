const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const COMING_SOON = process.env.COMING_SOON === 'true';

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  if (COMING_SOON) {
    res.sendFile(path.join(__dirname, 'coming-soon.html'));
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`PinoyPool running on port ${PORT} | Coming soon: ${COMING_SOON}`);
});
