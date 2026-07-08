const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
  if (match) {
    databaseUrl = match[1];
  }
}

if (!databaseUrl) {
  console.error('Error: DATABASE_URL not found.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const password = 'admin123';
  const email = 'admin@restaurant.com';
  console.log(`Generating fresh bcrypt hash for "${password}"...`);
  const hash = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    // Check/apply schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
    }

    // Clean insert
    await client.query('DELETE FROM users WHERE email = $1', [email]);
    await client.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, hash]);
    console.log(`Successfully reset credentials:\nEmail: ${email}\nPassword: ${password}`);
  } catch (err) {
    console.error('Reset failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}
run();
