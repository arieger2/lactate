import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST() {
  try {
    const client = await pool.connect()
    
    try {
      console.log('🔧 Setting up customers table...')
      
      // Create customers table
      await client.query(`
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
        )
      `)
      
      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id)
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)
      `)
      
      // Check if table was created successfully
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customers'
      `)
      
      console.log('✅ Customers table setup complete')
      
      return NextResponse.json({
        success: true,
        message: 'Customers table created successfully',
        tableExists: result.rows.length > 0
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Error setting up customers table:', error)
    return NextResponse.json({
      success: false,
      error: `Failed to setup customers table: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const client = await pool.connect()
    
    try {
      // Check if customers table exists
      const tableResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customers'
      `)
      
      // Get table info if it exists
      let tableInfo = null
      if (tableResult.rows.length > 0) {
        const columnResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'customers'
          ORDER BY ordinal_position
        `)
        
        const rowCountResult = await client.query('SELECT COUNT(*) as count FROM customers')
        
        tableInfo = {
          exists: true,
          columns: columnResult.rows,
          rowCount: parseInt(rowCountResult.rows[0].count)
        }
      } else {
        tableInfo = { exists: false }
      }
      
      return NextResponse.json({
        success: true,
        table: tableInfo
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Error checking customers table:', error)
    return NextResponse.json({
      success: false,
      error: `Failed to check customers table: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}