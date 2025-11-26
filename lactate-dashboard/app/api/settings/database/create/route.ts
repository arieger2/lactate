import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// POST - Create database if it doesn't exist
export async function POST(request: NextRequest) {
  let adminPool: Pool | null = null
  let dbPool: Pool | null = null
  
  try {
    const body = await request.json()
    const { host, port, database, user, password, ssl } = body
    
    const dbPassword = password || process.env.DB_PASSWORD
    
    // Connect to postgres database first (default db)
    adminPool = new Pool({
      host: host || 'localhost',
      port: parseInt(port) || 5432,
      database: 'postgres', // Connect to default postgres db
      user: user || 'postgres',
      password: dbPassword,
      ssl: ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    })
    
    const adminClient = await adminPool.connect()
    
    // Check if database exists
    const dbName = database || 'laktat'
    const checkResult = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    )
    
    if (checkResult.rows.length === 0) {
      // Create database
      await adminClient.query(`CREATE DATABASE "${dbName}"`)
      adminClient.release()
      await adminPool.end()
      
      // Connect to new database to create tables
      dbPool = new Pool({
        host: host || 'localhost',
        port: parseInt(port) || 5432,
        database: dbName,
        user: user || 'postgres',
        password: dbPassword,
        ssl: ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000
      })
      
      const dbClient = await dbPool.connect()
      
      // Create base tables
      await dbClient.query(`
        -- Customers table
        CREATE TABLE IF NOT EXISTS customers (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          birth_date DATE,
          gender VARCHAR(10),
          sport VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Sessions table
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          customer_id VARCHAR(255) REFERENCES customers(customer_id) ON DELETE CASCADE,
          test_type VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Lactate data table
        CREATE TABLE IF NOT EXISTS lactate_data (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          power INTEGER NOT NULL,
          lactate NUMERIC(4,2) NOT NULL,
          heart_rate INTEGER,
          fat_oxidation NUMERIC(4,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          customer_id VARCHAR(255) REFERENCES customers(customer_id) ON DELETE SET NULL
        );
        
        -- Training zones table
        CREATE TABLE IF NOT EXISTS training_zones (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          zone_type VARCHAR(50) NOT NULL DEFAULT 'custom',
          z1_end INTEGER NOT NULL,
          z2_end INTEGER NOT NULL,
          z3_end INTEGER NOT NULL,
          z4_end INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(customer_id, session_id, zone_type)
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_lactate_data_session_id ON lactate_data(session_id);
        CREATE INDEX IF NOT EXISTS idx_lactate_data_timestamp ON lactate_data(timestamp);
        CREATE INDEX IF NOT EXISTS idx_lactate_data_customer_id ON lactate_data(customer_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON sessions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_training_zones_customer_session ON training_zones(customer_id, session_id);
      `)
      
      dbClient.release()
      
      return NextResponse.json({
        success: true,
        message: `Database "${dbName}" created successfully with all tables!`
      })
    } else {
      adminClient.release()
      return NextResponse.json({
        success: true,
        message: `Database "${dbName}" already exists.`
      })
    }
  } catch (error) {
    console.error('Failed to create database:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create database'
    }, { status: 500 })
  } finally {
    if (adminPool) await adminPool.end()
    if (dbPool) await dbPool.end()
  }
}
