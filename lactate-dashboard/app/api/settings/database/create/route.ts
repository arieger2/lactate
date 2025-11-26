import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import configManager from '@/lib/configManager'

// POST - Create database if it doesn't exist
export async function POST(request: NextRequest) {
  let adminPool: Pool | null = null
  let dbPool: Pool | null = null
  
  try {
    const body = await request.json()
    const { host, port, database, user, password, ssl } = body
    
    // Use provided values or fallback to env
    const finalHost = host || process.env.DB_HOST || 'localhost'
    const finalPort = parseInt(port || process.env.DB_PORT || '5432')
    const finalUser = user || process.env.DB_USER || 'postgres'
    const finalPassword = password || process.env.DB_PASSWORD
    const finalSsl = ssl !== undefined ? ssl : (process.env.DB_SSL === 'true')
    const dbName = database || process.env.DB_NAME || 'laktat'
    
    console.log('🗄️ Create Database Request:', {
      host: finalHost,
      port: finalPort,
      user: finalUser,
      database: dbName,
      ssl: finalSsl,
      hasPassword: !!finalPassword
    })
    
    // Connect to postgres database first (default db)
    adminPool = new Pool({
      host: finalHost,
      port: finalPort,
      database: 'postgres', // Connect to default postgres db
      user: finalUser,
      password: finalPassword,
      ssl: finalSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000
    })
    
    console.log('📡 Connecting to postgres database...')
    const adminClient = await adminPool.connect()
    console.log('✅ Connected to postgres database')
    
    // Check if database exists
    const checkResult = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    )
    
    console.log(`🔍 Database "${dbName}" exists:`, checkResult.rows.length > 0)
    
    if (checkResult.rows.length === 0) {
      // Create database
      console.log(`📦 Creating database "${dbName}"...`)
      await adminClient.query(`CREATE DATABASE "${dbName}"`)
      console.log(`✅ Database "${dbName}" created`)
      adminClient.release()
      await adminPool.end()
      adminPool = null
      
      // Connect to new database to create tables
      dbPool = new Pool({
        host: finalHost,
        port: finalPort,
        database: dbName,
        user: finalUser,
        password: finalPassword,
        ssl: finalSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000
      })
      
      console.log(`📡 Connecting to new database "${dbName}"...`)
      const dbClient = await dbPool.connect()
      console.log(`✅ Connected to "${dbName}"`)
      
      // Create base tables
      console.log('📋 Creating tables...')
      await dbClient.query(`
        -- Customers table
        CREATE TABLE IF NOT EXISTS customers (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          date_of_birth DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Sessions table
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          customer_id VARCHAR(255) REFERENCES customers(customer_id) ON DELETE SET NULL,
          athlete_name VARCHAR(255),
          test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          test_type VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
          customer_id VARCHAR(255) REFERENCES customers(customer_id) ON DELETE SET NULL,
          sample_id VARCHAR(50),
          glucose NUMERIC(5,2),
          ph NUMERIC(4,3),
          temperature NUMERIC(4,1),
          measurement_date DATE,
          measurement_time TIME,
          error_code VARCHAR(20),
          device_id VARCHAR(100),
          raw_data JSONB,
          vo2 NUMERIC(5,2)
        );
        
        -- Training zones table
        CREATE TABLE IF NOT EXISTS training_zones (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          zone_boundaries JSONB NOT NULL,
          method VARCHAR(50) NOT NULL,
          modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(customer_id, session_id)
        );
        
        -- Threshold results table
        CREATE TABLE IF NOT EXISTS threshold_results (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
          method VARCHAR(50) NOT NULL,
          threshold_power INTEGER,
          threshold_lactate NUMERIC(4,2),
          threshold_heart_rate INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Migrations tracking table
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
        CREATE INDEX IF NOT EXISTS idx_lactate_data_session_id ON lactate_data(session_id);
        CREATE INDEX IF NOT EXISTS idx_lactate_data_timestamp ON lactate_data(timestamp);
        CREATE INDEX IF NOT EXISTS idx_lactate_data_customer_id ON lactate_data(customer_id);
        CREATE INDEX IF NOT EXISTS idx_lactate_data_sample_id ON lactate_data(sample_id);
        CREATE INDEX IF NOT EXISTS idx_lactate_data_device_id ON lactate_data(device_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON sessions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_training_zones_customer_session ON training_zones(customer_id, session_id);
      `)
      
      console.log('✅ Tables created successfully')
      dbClient.release()

      // Save the newly created database config to the single source of truth
      configManager.updateDatabaseConfig({
        host: finalHost,
        port: finalPort,
        database: dbName,
        user: finalUser,
        password: finalPassword || '',
        ssl: finalSsl
      })
      
      return NextResponse.json({
        success: true,
        message: `Database "${dbName}" created successfully with all tables!`
      })
    } else {
      adminClient.release()
      console.log(`ℹ️ Database "${dbName}" already exists, skipping creation`)
      return NextResponse.json({
        success: true,
        message: `Database "${dbName}" already exists.`
      })
    }
  } catch (error) {
    console.error('❌ Failed to create database:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create database'
    }, { status: 500 })
  } finally {
    if (adminPool) await adminPool.end()
    if (dbPool) await dbPool.end()
  }
}
