const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
const JWT_SECRET = 'your_jwt_secret_here'; // Replace with a secure secret in production

// Middleware
app.use(express.json());
app.use(express.static('public'));

// MySQL Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',          // <-- Replace
    password: '',  // <-- Replace
    database: 'poultry_farm_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access token missing' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
        req.user = user;
        next();
    });
}

// Signup Endpoint
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
    }
    try {
        const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: 'Username or email already exists' });
        }
        const password_hash = await bcrypt.hash(password, 10);
        const [result] = await pool.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, password_hash]);
        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Failed to register user' });
    }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Failed to login' });
    }
});

// Protect all other API routes
app.use('/api', (req, res, next) => {
    if (req.path === '/signup' || req.path === '/login') {
        return next();
    }
    authenticateToken(req, res, next);
});

// Dashboard Stats
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const [flocks] = await pool.query("SELECT COUNT(*) as totalFlocks, SUM(currentBirdCount) as totalBirds FROM flocks WHERE status = 'active'");
        const [sales] = await pool.query("SELECT SUM(totalPrice) as totalRevenue FROM sales WHERE saleDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");
        const [eggs] = await pool.query("SELECT SUM(quantity) as eggsToday FROM eggs WHERE date = CURDATE()");

        res.json({
            totalFlocks: flocks[0].totalFlocks || 0,
            totalBirds: flocks[0].totalBirds || 0,
            revenueLast30Days: sales[0].totalRevenue || 0,
            eggsToday: eggs[0].eggsToday || 0
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.' });
    }
});

// Flocks
app.get('/api/flocks', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM flocks ORDER BY id DESC");
        res.json(rows);
    } catch {
        res.status(500).json({ success: false, message: 'Failed to fetch flocks.' });
    }
});

app.post('/api/flocks', async (req, res) => {
    const { flockName, breed, initialBirdCount, acquisitionDate, flockStatus } = req.body;
    try {
        const query = `INSERT INTO flocks (name, breed, initialBirdCount, currentBirdCount, acquisitionDate, status) VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [flockName, breed, +initialBirdCount, +initialBirdCount, acquisitionDate, flockStatus];
        const [result] = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Flock added successfully!', data: { id: result.insertId, ...req.body } });
    } catch {
        res.status(500).json({ success: false, message: 'Failed to add flock.' });
    }
});

// Feed
app.get('/api/feed', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM feed ORDER BY purchaseDate DESC");
        res.json(rows);
    } catch {
        res.status(500).json({ success: false, message: 'Failed to fetch feed stock.' });
    }
});

app.post('/api/feed', async (req, res) => {
    const { feedType, quantityKg, purchaseDate, supplier } = req.body;
    try {
        const query = "INSERT INTO feed (type, quantityKg, purchaseDate, supplier) VALUES (?, ?, ?, ?)";
        const values = [feedType, +quantityKg, purchaseDate, supplier];
        const [result] = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Feed purchase logged!', data: { id: result.insertId, ...req.body } });
    } catch {
        res.status(500).json({ success: false, message: 'Failed to log feed.' });
    }
});

// Eggs
app.get('/api/eggs', async (req, res) => {
    try {
        const query = `SELECT e.*, f.name AS flockName FROM eggs e LEFT JOIN flocks f ON e.flockId = f.id ORDER BY e.date DESC, e.id DESC`;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch {
        res.status(500).json({ success: false, message: 'Failed to fetch eggs.' });
    }
});

app.post('/api/eggs', async (req, res) => {
    const { flockId, date, quantity, gradeA, gradeB } = req.body;
    try {
        const query = "INSERT INTO eggs (flockId, date, quantity, gradeA, gradeB) VALUES (?, ?, ?, ?, ?)";
        const values = [+flockId, date, +quantity, +gradeA || 0, +gradeB || 0];
        const [result] = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Eggs logged!', data: { id: result.insertId, ...req.body } });
    } catch {
        res.status(500).json({ success: false, message: 'Failed to log eggs.' });
    }
});

// Mortality
app.get('/api/mortality', async (req, res) => {
    try {
        const query = `SELECT m.*, f.name AS flockName FROM mortality m LEFT JOIN flocks f ON m.flockId = f.id ORDER BY m.date DESC, m.id DESC`;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch {
        res.status(500).json({ success: false, message: 'Failed to fetch mortality logs.' });
    }
});

app.post('/api/mortality', async (req, res) => {
    const { flockId, date, count, cause } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query("INSERT INTO mortality (flockId, date, count, cause) VALUES (?, ?, ?, ?)", [+flockId, date, +count, cause]);
        await connection.query("UPDATE flocks SET currentBirdCount = currentBirdCount - ? WHERE id = ?", [+count, +flockId]);
        await connection.commit();
        res.status(201).json({ success: true, message: 'Mortality recorded and flock updated.' });
    } catch {
        await connection.rollback();
        res.status(500).json({ success: false, message: 'Failed to record mortality.' });
    } finally {
        connection.release();
    }
});

// Sales
app.get('/api/sales', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT *, FORMAT(totalPrice, 2) as formattedTotalPrice FROM sales ORDER BY saleDate DESC");
        res.json(rows);
    } catch {
        res.status(500).json({ success: false, message: 'Failed to fetch sales.' });
    }
});

app.post('/api/sales', async (req, res) => {
    const { item, quantity, unitPrice, saleDate, customer } = req.body;
    try {
        const totalPrice = +quantity * +unitPrice;
        const query = "INSERT INTO sales (item, quantity, unitPrice, totalPrice, saleDate, customer) VALUES (?, ?, ?, ?, ?, ?)";
        const values = [item, +quantity, +unitPrice, totalPrice, saleDate, customer];
        const [result] = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Sale recorded.', data: { id: result.insertId, ...req.body, totalPrice } });
    } catch {
        res.status(500).json({ success: false, message: 'Failed to record sale.' });
    }
});

// Vaccinations
app.get('/api/vaccinations', async (req, res) => {
    try {
        const query = `SELECT v.*, f.name AS flockName FROM vaccinations v LEFT JOIN flocks f ON v.flockId = f.id ORDER BY v.vaccinationDate DESC`;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch {
        res.status(500).json({ success: false, message: 'Failed to fetch vaccinations.' });
    }
});

app.post('/api/vaccinations', async (req, res) => {
    const { flockId, vaccineName, method, vaccinationDate, notes } = req.body;
    try {
        const query = "INSERT INTO vaccinations (flockId, vaccineName, method, vaccinationDate, notes) VALUES (?, ?, ?, ?, ?)";
        const values = [+flockId, vaccineName, method, vaccinationDate, notes];
        const [result] = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Vaccination recorded.', data: { id: result.insertId, ...req.body } });
    } catch {
        res.status(500).json({ success: false, message: 'Failed to add vaccination.' });
    }
});

// Frontend Fallbacknode 

// Start Server
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL.');
        connection.release();
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    })
    .catch(error => {
        console.error('DB connection failed. Check credentials.');
        console.error(error.message);
        process.exit(1);
    });
