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
    
    const adminClient = await adminPool.connect()
    
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
      
      // Create base tables from schema.sql
      console.log('📋 Creating tables...')
      await dbClient.query(`
        -- Create patient_profiles table (replaces customers)
        CREATE TABLE IF NOT EXISTS patient_profiles (
            profile_id VARCHAR(255) PRIMARY KEY,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            birth_date DATE,
            height_cm INTEGER,
            weight_kg DECIMAL(5,2),
            email VARCHAR(255),
            phone VARCHAR(50),
            additional_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create test_infos table (replaces sessions)
        CREATE TABLE IF NOT EXISTS test_infos (
            test_id VARCHAR(255) PRIMARY KEY,
            profile_id VARCHAR(255) NOT NULL,
            test_date DATE NOT NULL,
            test_time TIME NOT NULL,
            device VARCHAR(50) NOT NULL CHECK (device IN ('bike', 'treadmill', 'other')),
            unit VARCHAR(20) NOT NULL CHECK (unit IN ('watt', 'kmh', 'other')),
            start_load DECIMAL(5,2) NOT NULL,
            increment DECIMAL(5,2) NOT NULL,
            stage_duration_min INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (profile_id) REFERENCES patient_profiles(profile_id) ON DELETE CASCADE
        );

        -- Create stages table (replaces lactate_data)
        CREATE TABLE IF NOT EXISTS stages (
            id SERIAL PRIMARY KEY,
            test_id VARCHAR(255) NOT NULL,
            stage INTEGER NOT NULL,
            duration_min INTEGER NOT NULL,
            load DECIMAL(5,2) NOT NULL,
            heart_rate_bpm INTEGER,
            lactate_mmol DECIMAL(4,2) NOT NULL,
            rr_systolic INTEGER,
            rr_diastolic INTEGER,
            is_final_approximation BOOLEAN DEFAULT FALSE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (test_id) REFERENCES test_infos(test_id) ON DELETE CASCADE,
            UNIQUE(test_id, stage)
        );

        -- Create adjusted_thresholds table
        CREATE TABLE IF NOT EXISTS adjusted_thresholds (
            id SERIAL PRIMARY KEY,
            test_id VARCHAR(255) NOT NULL,
            profile_id VARCHAR(255) NOT NULL,
            lt1_load NUMERIC NOT NULL,
            lt1_lactate DECIMAL(4,2) NOT NULL,
            lt2_load NUMERIC NOT NULL,
            lt2_lactate DECIMAL(4,2) NOT NULL,
            adjusted_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (test_id) REFERENCES test_infos(test_id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES patient_profiles(profile_id) ON DELETE CASCADE,
            UNIQUE(test_id)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_patient_profiles_name ON patient_profiles(last_name, first_name);
        CREATE INDEX IF NOT EXISTS idx_patient_profiles_email ON patient_profiles(email);
        CREATE INDEX IF NOT EXISTS idx_test_infos_profile_id ON test_infos(profile_id);
        CREATE INDEX IF NOT EXISTS idx_test_infos_test_date ON test_infos(test_date);
        CREATE INDEX IF NOT EXISTS idx_test_infos_device ON test_infos(device);
        CREATE INDEX IF NOT EXISTS idx_stages_test_id ON stages(test_id);
        CREATE INDEX IF NOT EXISTS idx_stages_stage ON stages(stage);
        CREATE INDEX IF NOT EXISTS idx_stages_load ON stages(load);
        CREATE INDEX IF NOT EXISTS idx_adjusted_thresholds_test_id ON adjusted_thresholds(test_id);
        CREATE INDEX IF NOT EXISTS idx_adjusted_thresholds_profile_id ON adjusted_thresholds(profile_id);
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
