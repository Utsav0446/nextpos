import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pos';

const config: PoolConfig = {
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Enable SSL for Neon database or production
if (connectionString.includes('neon.tech') || process.env.NODE_ENV === 'production') {
  config.ssl = {
    rejectUnauthorized: false,
  };
}

export const pool = new Pool(config);

let dbInitialized = false;

export async function query(text: string, params?: any[]) {
  // Ensure DB is initialized before executing any query
  if (!dbInitialized) {
    await initDb();
  }

  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query:', { text: text.substring(0, 100), duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
}

export async function getClient() {
  if (!dbInitialized) {
    await initDb();
  }
  return await pool.connect();
}

/**
 * Automatically initializes the database schema if tables do not exist
 */
export async function initDb() {
  if (dbInitialized) return;

  const client = await pool.connect();
  try {
    // Check if the users table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;
    const res = await client.query(checkTableQuery);
    const tableExists = res.rows[0]?.exists;

    if (!tableExists) {
      console.log('Database tables not found. Initializing schema...');
      const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute the schema SQL
      await client.query(schemaSql);
      console.log('Database schema initialized successfully with seed data.');
    } else {
      console.log('Database already initialized.');
    }
    dbInitialized = true;
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
  } finally {
    client.release();
  }
}
