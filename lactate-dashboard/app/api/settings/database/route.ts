import { NextRequest, NextResponse } from 'next/server'
import configManager from '@/lib/configManager'

/**
 * GET /api/settings/database
 * Retrieves current database configuration from the single source of truth
 */
export async function GET() {
  try {
    const dbConfig = configManager.getDatabase()


    const response = {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: '', // Never expose password in API responses
      hasPassword: Boolean(dbConfig.password), // Indicate if password exists
      ssl: dbConfig.ssl
    }


    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Failed to get database config:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get database configuration'
    }, { status: 500 })
  }
}

/**
 * POST /api/settings/database
 * Updates database configuration in the single source of truth (config/app.config.json)
 * 
 * The ConfigManager automatically:
 * - Triggers file watching listeners
 * - Notifies database pool manager to recreate the connection pool
 * - NO server restart needed!
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { host, port, database, user, password, ssl } = body



    // Get current config to preserve password if empty is sent
    const currentConfig = configManager.getDatabase()
    
    // Update configuration through ConfigManager (single source of truth)
    configManager.updateDatabaseConfig({
      host: host || 'localhost',
      port: parseInt(port) || 5432,
      database: database || 'laktat',
      user: user || 'postgres',
      password: password || currentConfig.password, // Preserve existing password if empty
      ssl: ssl !== undefined ? Boolean(ssl) : false
    })



    return NextResponse.json({
      success: true,
      message:
        'Database configuration updated. The connection pool is being recreated automatically - no restart needed!'
    })
  } catch (error) {
    console.error('Failed to save database config:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to save database configuration'
    }, { status: 500 })
  }
}
