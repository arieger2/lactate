import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || '192.168.5.220',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'laktat',
  user: process.env.DB_USER || 'arieger',
  password: process.env.DB_PASSWORD || 'LisgumuM20251!',
  ssl: process.env.DB_SSL === 'true' ? { 
    rejectUnauthorized: false,
    requestCert: false,
    agent: false
  } : false,
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export default pool;