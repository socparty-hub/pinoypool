const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/player', (req, res) => res.redirect('/?demo=player'));
app.get('/owner',  (req, res) => res.redirect('/?demo=owner'));
app.get('/scout',  (req, res) => res.redirect('/?demo=scout'));
app.get('/admin',  (req, res) => res.redirect('/?demo=admin'));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PinoyPool running on http://localhost:${PORT}`));
