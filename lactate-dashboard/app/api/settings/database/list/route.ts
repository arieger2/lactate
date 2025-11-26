import { NextRequest, NextResponse } from 'next/server'
import dbPoolManager from '@/lib/dbPoolManager'

// GET - List all user databases (excluding system databases)
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Getting database list via shared pool')
    
    const pool = dbPoolManager().getPool()
    if (!pool) {
      console.warn('⚠️ Database pool not available')
      return NextResponse.json({
        success: false,
        message: 'Database pool not available - check configuration',
        databases: []
      }, { status: 500 })
    }
    
    console.log('🔄 Pool obtained successfully')
    const client = await pool.connect()
    console.log('🔗 Client connected')
    
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
      
      console.log('✅ Query executed:', result.rows.length, 'databases found')
      
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
      console.log('🔓 Client released')
    }
  } catch (error) {
    console.error('❌ Failed to list databases:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to list databases',
      databases: []
    }, { status: 500 })
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
