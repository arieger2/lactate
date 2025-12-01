import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// POST - Delete a database
export async function POST(request: NextRequest) {
  let pool: Pool | null = null
  
  try {
    const body = await request.json()
    const { host, port, user, password, ssl, databaseToDelete } = body
    
    // Use provided values or fallback to env or config
    const config = await import('@/lib/configManager').then(m => m.default)
    const savedConfig = config.getConfig().database
    
    const finalHost = host || savedConfig.host || process.env.DB_HOST || 'localhost'
    const finalPort = parseInt(port || savedConfig.port?.toString() || process.env.DB_PORT || '5432')
    const finalUser = user || savedConfig.user || process.env.DB_USER || 'postgres'
    const finalPassword = password || savedConfig.password || process.env.DB_PASSWORD || ''
    const finalSsl = ssl !== undefined ? ssl : (savedConfig.ssl || process.env.DB_SSL === 'true')
    
    if (!databaseToDelete) {
      return NextResponse.json({
        success: false,
        message: 'Database name is required'
      }, { status: 400 })
    }
    
    // Safety check: prevent deletion of system databases
    const systemDatabases = ['postgres', 'template0', 'template1']
    if (systemDatabases.includes(databaseToDelete.toLowerCase())) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete system databases'
      }, { status: 400 })
    }
    
    console.log('🗑️ Delete Database Request:', {
      host: finalHost,
      port: finalPort,
      user: finalUser,
      database: databaseToDelete,
      ssl: finalSsl,
      hasPassword: !!finalPassword
    })
    
    // Connect to postgres database (not the one being deleted)
    pool = new Pool({
      host: finalHost,
      port: finalPort,
      database: 'postgres',
      user: finalUser,
      password: finalPassword,
      ssl: finalSsl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000
    })
    
    const client = await pool.connect()
    
    try {
      // Check if database exists
      const checkResult = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [databaseToDelete]
      )
      
      if (checkResult.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: `Database "${databaseToDelete}" does not exist`
        }, { status: 404 })
      }
      
      // Terminate all connections to the database
      console.log(`🔌 Terminating connections to "${databaseToDelete}"...`)
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
      `, [databaseToDelete])
      
      // Drop the database
      console.log(`🗑️ Dropping database "${databaseToDelete}"...`)
      await client.query(`DROP DATABASE "${databaseToDelete}"`)
      console.log(`✅ Database "${databaseToDelete}" deleted successfully`)
      
      return NextResponse.json({
        success: true,
        message: `Database "${databaseToDelete}" deleted successfully!`
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Failed to delete database:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete database'
    }, { status: 500 })
  } finally {
    if (pool) await pool.end()
  }
}
