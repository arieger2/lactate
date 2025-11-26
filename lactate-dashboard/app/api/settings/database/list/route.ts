import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// GET - List all user databases (excluding system databases)
export async function GET(request: NextRequest) {
  let pool: Pool | null = null
  
  try {
    const { searchParams } = new URL(request.url)
    const host = searchParams.get('host') || process.env.DB_HOST || 'localhost'
    const port = parseInt(searchParams.get('port') || process.env.DB_PORT || '5432')
    const user = searchParams.get('user') || process.env.DB_USER || 'postgres'
    const password = searchParams.get('password') || process.env.DB_PASSWORD
    const ssl = searchParams.get('ssl') === 'true' || process.env.DB_SSL === 'true'
    
    pool = new Pool({
      host,
      port,
      database: 'postgres', // Connect to default postgres db to list all databases
      user,
      password,
      ssl: ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000
    })
    
    const client = await pool.connect()
    
    try {
      // Get all databases excluding system databases
      const result = await client.query(`
        SELECT 
          d.datname as name,
          pg_catalog.pg_get_userbyid(d.datdba) as owner,
          pg_catalog.pg_database_size(d.datname) as size,
          d.datcollate as collation
        FROM pg_catalog.pg_database d
        WHERE d.datname NOT IN ('postgres', 'template0', 'template1')
          AND d.datistemplate = false
        ORDER BY d.datname
      `)
      
      const databases = result.rows.map(row => ({
        name: row.name,
        owner: row.owner,
        size: formatBytes(parseInt(row.size)),
        sizeBytes: parseInt(row.size)
      }))
      
      return NextResponse.json({
        success: true,
        databases
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Failed to list databases:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to list databases',
      databases: []
    }, { status: 500 })
  } finally {
    if (pool) await pool.end()
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
