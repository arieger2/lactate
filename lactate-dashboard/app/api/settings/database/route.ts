import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface AppConfig {
  database: {
    host: string
    port: number
    database: string
    user: string
    password: string
    ssl: boolean
    pool?: {
      min: number
      max: number
      acquire: number
      idle: number
    }
  }
  application?: Record<string, unknown>
  features?: Record<string, unknown>
}

// Helper to read app.config.json
const readConfigFile = (): AppConfig => {
  try {
    const configPath = path.join(process.cwd(), 'config', 'app.config.json')
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading config file:', error)
    // Return default config
    return {
      database: {
        host: 'localhost',
        port: 5432,
        database: 'laktat',
        user: 'postgres',
        password: '',
        ssl: false
      }
    }
  }
}

// Helper to write app.config.json
const writeConfigFile = (config: AppConfig): void => {
  const configPath = path.join(process.cwd(), 'config', 'app.config.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

// GET - Get current database configuration (without exposing password)
export async function GET() {
  try {
    const config = readConfigFile()
    
    return NextResponse.json({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: '', // Don't expose password
      ssl: config.database.ssl
    })
  } catch (error) {
    console.error('Failed to get database config:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get database configuration'
    }, { status: 500 })
  }
}

// POST - Save database configuration to config/app.config.json
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { host, port, database, user, password, ssl } = body
    
    console.log('Received config to save:', { host, port, database, user, ssl })
    
    // Read existing config
    const config = readConfigFile()
    
    // Update database config
    config.database.host = host || config.database.host
    config.database.port = port || config.database.port
    config.database.database = database || config.database.database
    config.database.user = user || config.database.user
    if (password) {
      config.database.password = password
    }
    config.database.ssl = ssl !== undefined ? ssl : config.database.ssl
    
    console.log('Final values to save:', config.database)
    
    // Write back to config file
    writeConfigFile(config)
    
    return NextResponse.json({
      success: true,
      message: 'Database configuration saved to config/app.config.json'
    })
  } catch (error) {
    console.error('Failed to save database config:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to save database configuration'
    }, { status: 500 })
  }
}
