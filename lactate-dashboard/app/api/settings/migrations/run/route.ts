import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// Migration SQL scripts
const migrations: Record<string, string> = {
  'add-device-metadata': `
    -- Migration: Add device metadata fields to lactate_data table
    ALTER TABLE lactate_data 
      ADD COLUMN IF NOT EXISTS sample_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS glucose DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS ph DECIMAL(4,3),
      ADD COLUMN IF NOT EXISTS temperature DECIMAL(4,1),
      ADD COLUMN IF NOT EXISTS measurement_date DATE,
      ADD COLUMN IF NOT EXISTS measurement_time TIME,
      ADD COLUMN IF NOT EXISTS error_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS device_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS raw_data JSONB,
      ADD COLUMN IF NOT EXISTS vo2 DECIMAL(5,2);

    CREATE INDEX IF NOT EXISTS idx_lactate_data_device_id ON lactate_data(device_id);
    CREATE INDEX IF NOT EXISTS idx_lactate_data_sample_id ON lactate_data(sample_id);

    COMMENT ON COLUMN lactate_data.sample_id IS 'Sample position/number from lactate device';
    COMMENT ON COLUMN lactate_data.glucose IS 'Blood glucose in mmol/L (if device is configured to measure)';
    COMMENT ON COLUMN lactate_data.ph IS 'Blood pH value (if device is configured to measure)';
    COMMENT ON COLUMN lactate_data.temperature IS 'Temperature of measurement unit in degrees';
    COMMENT ON COLUMN lactate_data.measurement_date IS 'Date of measurement as reported by device (YYYY-MM-DD)';
    COMMENT ON COLUMN lactate_data.measurement_time IS 'Time of measurement as reported by device (HH:MM:SS)';
    COMMENT ON COLUMN lactate_data.error_code IS 'Error code if measurement failed (null if successful)';
    COMMENT ON COLUMN lactate_data.device_id IS 'Identifier of the lactate measurement device';
    COMMENT ON COLUMN lactate_data.raw_data IS 'JSON blob containing any additional raw data from device';
    COMMENT ON COLUMN lactate_data.vo2 IS 'VO2 oxygen consumption in mL/kg/min';
  `,
  
  'create-training-zones-table': `
    -- Migration: Create training zones table
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

    CREATE INDEX IF NOT EXISTS idx_training_zones_customer_session 
      ON training_zones(customer_id, session_id);
  `
}

// POST - Run a specific migration
export async function POST(request: NextRequest) {
  let pool: Pool | null = null
  
  try {
    const body = await request.json()
    const { migration } = body
    
    if (!migration || !migrations[migration]) {
      return NextResponse.json({
        success: false,
        message: `Unknown migration: ${migration}`
      }, { status: 400 })
    }
    
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'laktat',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    })
    
    const client = await pool.connect()
    
    try {
      // Ensure migrations table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Check if already executed
      const checkResult = await client.query(
        'SELECT 1 FROM migrations WHERE name = $1',
        [migration]
      )
      
      if (checkResult.rows.length > 0) {
        return NextResponse.json({
          success: false,
          message: `Migration "${migration}" has already been executed`
        }, { status: 400 })
      }
      
      // Run the migration
      await client.query(migrations[migration])
      
      // Record the migration
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration]
      )
      
      return NextResponse.json({
        success: true,
        message: `Migration "${migration}" executed successfully!`
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Failed to run migration:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to run migration'
    }, { status: 500 })
  } finally {
    if (pool) await pool.end()
  }
}
