import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// Import config manager for fallback
function getConfigPassword() {
  try {
    const fs = require('fs')
    const path = require('path')
    const configPath = path.join(process.cwd(), 'config', 'app.config.json')
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      return config.database?.password || ''
    }
  } catch (error) {
    // silent error
  }
  return ''
}

// POST - Test database connection with provided credentials
export async function POST(request: NextRequest) {
  let pool: Pool | null = null
  
  try {
    const body = await request.json()
    const { host, port, database, user, password, ssl } = body
    
    // Use provided password or fallback to config - CRITICAL: Must be string
    const dbPassword = String(password || getConfigPassword())
    
    pool = new Pool({
      host: String(host || 'localhost'),
      port: parseInt(port) || 5432,
      database: String(database || 'laktat'),
      user: String(user || 'postgres'),
      password: dbPassword, // Already converted to string above
      ssl: ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    })
    
    // Test the connection
    const client = await pool.connect()
    const result = await client.query('SELECT version()')
    client.release()
    
    return NextResponse.json({
      success: true,
      message: 'Connection successful!',
      version: result.rows[0].version
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    }, { status: 400 })
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}
