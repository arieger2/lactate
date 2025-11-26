import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// POST - Test database connection with provided credentials
export async function POST(request: NextRequest) {
  let pool: Pool | null = null
  
  try {
    const body = await request.json()
    const { host, port, database, user, password, ssl } = body
    
    // Use provided password or fallback to env
    const dbPassword = password || process.env.DB_PASSWORD
    
    pool = new Pool({
      host: host || 'localhost',
      port: parseInt(port) || 5432,
      database: database || 'laktat',
      user: user || 'postgres',
      password: dbPassword,
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
