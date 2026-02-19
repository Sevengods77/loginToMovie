require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const { initializeDatabase } = require('./initDb');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'netmovieSecret2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// ─── Routes: Serve HTML Pages ─────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// ─── API: Register ────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
    const { user_id, user_name, password, email, phone } = req.body;

    // Validate required fields
    if (!user_id || !user_name || !password || !email || !phone) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    // Validate phone (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ success: false, message: 'Phone must be 10 digits.' });
    }

    try {
        // Check if user_id already exists (MySQL uses ? placeholders)
        const [existingId] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [user_id]);
        if (existingId.length > 0) {
            return res.status(409).json({ success: false, message: 'User ID already exists. Please choose another.' });
        }

        // Check if email already exists
        const [existingEmail] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered. Please login.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert user into database
        await pool.query(
            'INSERT INTO users (user_id, user_name, password, email, phone) VALUES (?, ?, ?, ?, ?)',
            [user_id, user_name, hashedPassword, email, phone]
        );

        console.log(`✅ New user registered: ${user_id} (${user_name})`);
        res.status(201).json({ success: true, message: 'Registration successful! Redirecting to login...' });

    } catch (err) {
        console.error('❌ Registration error:', err.message);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// ─── API: Login ───────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
    // We'll use 'user_name' as the key from frontend, but it can be either User ID or Full Name
    const login_id = (req.body.user_name || req.body.login_input || req.body.identifier || '').trim();
    const password = req.body.password;

    console.log(`\n--- Login Attempt ---`);
    console.log(`Identifier: "${login_id}"`);

    if (!login_id || !password) {
        console.log(`❌ Missing fields`);
        return res.status(400).json({ success: false, message: 'User ID / Username and password are required.' });
    }

    try {
        // Search by user_id (the login ID like "netm01") OR user_name (display name like "Omkar")
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE user_id = ? OR user_name = ?',
            [login_id, login_id]
        );

        console.log(`Users found in DB: ${rows.length}`);

        if (rows.length === 0) {
            console.log(`❌ user_id or user_name "${login_id}" not found in database.`);
            return res.status(401).json({ success: false, message: 'Invalid User ID / username or password.' });
        }

        const user = rows[0];
        console.log(`Found User: ID="${user.user_id}", Name="${user.user_name}"`);

        // Compare password with stored bcrypt hash
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log(`Password comparison check: ${isPasswordValid ? 'SUCCESS' : 'FAILURE'}`);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid User ID / username or password.' });
        }

        // Set session
        req.session.userId = user.user_id;
        req.session.userName = user.user_name;
        req.session.loggedIn = true;

        console.log(`✅ Login SUCCESS for ${user.user_id}`);
        res.status(200).json({
            success: true,
            message: `Welcome back, ${user.user_name}!`,
            redirect: 'https://movie-eight-mauve.vercel.app/'
        });

    } catch (err) {
        console.error('❌ Login error:', err.stack);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// ─── API: Logout ──────────────────────────────────────────────────────────────
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
async function startServer() {
    try {
        await initializeDatabase();
    } catch (err) {
        console.error('⚠️  DB init failed:', err.message);
        console.error('⚠️  Server will start but DB operations will fail until connection is fixed.');
    }

    app.listen(PORT, () => {
        console.log(`🚀 NETMOVIE Server running at http://localhost:${PORT}`);
        console.log(`📄 Register: http://localhost:${PORT}/register`);
        console.log(`📄 Login:    http://localhost:${PORT}/login`);
    });
}

startServer();
