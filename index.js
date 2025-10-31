require('dotenv').config(); // load .env first
const express = require('express');
const app = express();
const path = require('path');

const PORT = process.env.PORT || 3000;   // fallback if .env missing
const NAME = process.env.NAME || 'TEST';

// set EJS as view engine
app.set('view engine', 'ejs');

// Route for home
app.get('/', (req, res) => {
  res.render('index', { name: NAME });
});


app.get('/extract-coordinates', (req, res) => {
  res.render('extract-coordinates');
});

app.get('/tsp', (req, res) => {
  res.render('tsp');
});

app.get('/gmap', (req, res) => {
  res.render('gmap');
});

app.get('/distance-matrix', (req, res) => {
  res.render('distance-matrix');
});

app.get('/result', (req, res) => {
  res.render('tsp-map');
});

app.use(express.static(path.join(__dirname, 'public')));

// Route for button click
app.get('/clicked', (req, res) => {
  res.send(`✅ Button was clicked! Hello ${NAME}, this response came from the server.`);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
