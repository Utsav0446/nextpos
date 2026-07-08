const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
  if (match) {
    databaseUrl = match[1];
  }
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  // Test password comparison
  const match = await bcrypt.compare('admin123', '$2b$10$EPf52dxG9eR9E2c1eQ9U9eqsN0LwW.a4y3P/1gTux1Vp4mUqgYhye');
  console.log('Match result for admin123:', match);

  // Check actual user row in DB
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM users');
    console.log('User rows in DB:', res.rows);
  } catch (err) {
    console.error('Error querying users:', err);
  } finally {
    client.release();
    pool.end();
  }
}
run();
