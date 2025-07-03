// BACKEND SERVER FOR POULTRY FARM APP (Express.js)


const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const app = express();

const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'poultrySecretKey';

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'poultry_farm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(cors());
app.use(bodyParser.json());

// --- AUTH MIDDLEWARE ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// --- AUTH ROUTES ---
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    await pool.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, password]);
    res.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password_hash = ?', [email, password]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ email }, SECRET_KEY);
    res.json({ success: true, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// --- PROTECTED API ROUTES ---
// For simplicity, keeping the rest of the routes using in-memory arrays as before

let flocks = [];
let feedStock = [];
let eggs = [];
let sales = [];
let mortality = [];
let vaccinations = [];

app.get('/api/dashboard-stats', authenticateToken, (req, res) => {
  const totalFlocks = flocks.length;
  const totalBirds = flocks.reduce((sum, f) => sum + f.initialBirdCount, 0);
  const eggsToday = eggs.filter(e => e.date === new Date().toISOString().slice(0, 10)).reduce((sum, e) => sum + e.quantity, 0);
  const revenueLast30Days = sales.reduce((sum, s) => sum + (s.unitPrice * s.quantity), 0);
  res.json({ totalFlocks, totalBirds, eggsToday, revenueLast30Days });
});

app.get('/api/flocks', authenticateToken, (req, res) => res.json(flocks));
app.post('/api/flocks', authenticateToken, (req, res) => {
  const flock = req.body;
  flock.id = Date.now();
  flocks.push(flock);
  res.json({ success: true, message: 'Flock added successfully' });
});

app.get('/api/feed', authenticateToken, (req, res) => res.json(feedStock));
app.post('/api/feed', authenticateToken, (req, res) => {
  feedStock.push(req.body);
  res.json({ success: true, message: 'Feed log added successfully' });
});

app.get('/api/eggs', authenticateToken, (req, res) => {
  const enriched = eggs.map(e => ({ ...e, flockName: flocks.find(f => f.id == e.flockId)?.name || 'Unknown' }));
  res.json(enriched);
});
app.post('/api/eggs', authenticateToken, (req, res) => {
  eggs.push(req.body);
  res.json({ success: true, message: 'Egg log added successfully' });
});

app.get('/api/mortality', authenticateToken, (req, res) => {
  const enriched = mortality.map(m => ({ ...m, flockName: flocks.find(f => f.id == m.flockId)?.name || 'Unknown' }));
  res.json(enriched);
});
app.post('/api/mortality', authenticateToken, (req, res) => {
  mortality.push(req.body);
  res.json({ success: true, message: 'Mortality log added successfully' });
});

app.get('/api/sales', authenticateToken, (req, res) => {
  const enriched = sales.map(s => ({
    ...s,
    formattedTotalPrice: `Ksh ${(s.unitPrice * s.quantity).toFixed(2)}`
  }));
  res.json(enriched);
});
app.post('/api/sales', authenticateToken, (req, res) => {
  sales.push(req.body);
  res.json({ success: true, message: 'Sale recorded successfully' });
});

app.get('/api/vaccinations', authenticateToken, (req, res) => {
  const enriched = vaccinations.map(v => ({ ...v, flockName: flocks.find(f => f.id == v.flockId)?.name || 'Unknown' }));
  res.json(enriched);
});
app.post('/api/vaccinations', authenticateToken, (req, res) => {
  vaccinations.push(req.body);
  res.json({ success: true, message: 'Vaccination record added successfully' });
});

// --- SERVER ---
app.listen(PORT, () => {
  console.log(`Poultry Farm API running on port ${PORT}`);
});
