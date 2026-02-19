require('dotenv').config();
const pool = require('./db');

async function initializeDatabase() {
    const conn = await pool.getConnection();
    try {
        console.log('🔧 Initializing database schema...');

        // MySQL syntax: use backticks and MySQL types
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id    VARCHAR(50)  PRIMARY KEY,
                user_name  VARCHAR(100) NOT NULL,
                password   TEXT         NOT NULL,
                email      VARCHAR(150) NOT NULL UNIQUE,
                phone      VARCHAR(20)  NOT NULL,
                created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Users table ready');
        console.log('📋 Columns: user_id, user_name, password (bcrypt), email, phone, created_at');
    } catch (err) {
        console.error('❌ Error initializing database:', err.message);
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = { initializeDatabase };
