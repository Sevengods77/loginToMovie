const pool = require('./db');
const { initializeDatabase } = require('./initDb');

async function test() {
    try {
        console.log('Testing connection...');
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log('Connection test result:', rows[0].result);

        console.log('Initializing database...');
        await initializeDatabase();
        console.log('Database initialized successfully');

        process.exit(0);
    } catch (err) {
        console.error('Test failed:');
        console.error(err);
        process.exit(1);
    }
}

test();
