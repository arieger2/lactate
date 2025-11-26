import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// GET - Get current database configuration (without exposing password)
export async function GET() {
  try {
    return NextResponse.json({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'laktat',
      user: process.env.DB_USER || 'postgres',
      password: '', // Don't expose password
      ssl: process.env.DB_SSL === 'true'
    })
  } catch (error) {
    console.error('Failed to get database config:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get database configuration'
    }, { status: 500 })
  }
}

// POST - Save database configuration to .env.local
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { host, port, database, user, password, ssl } = body
    
    // Use provided values or fallback to current env values
    const finalHost = host || process.env.DB_HOST || 'localhost'
    const finalPort = port || process.env.DB_PORT || '5432'
    const finalDatabase = database || process.env.DB_NAME || 'laktat'
    const finalUser = user || process.env.DB_USER || 'postgres'
    const finalSsl = ssl !== undefined ? ssl : (process.env.DB_SSL === 'true')
    
    const envPath = path.join(process.cwd(), '.env.local')
    
    // Read existing .env.local
    let envContent = ''
    try {
      envContent = fs.readFileSync(envPath, 'utf-8')
    } catch {
      // File doesn't exist, create new content
      envContent = '# Environment Configuration for Lactate Dashboard\n\n'
    }
    
    // Update or add each variable
    const updateEnvVar = (content: string, key: string, value: string): string => {
      const regex = new RegExp(`^${key}=.*$`, 'm')
      if (regex.test(content)) {
        return content.replace(regex, `${key}=${value}`)
      } else {
        return content + `\n${key}=${value}`
      }
    }
    
    envContent = updateEnvVar(envContent, 'DB_HOST', finalHost)
    envContent = updateEnvVar(envContent, 'DB_PORT', finalPort)
    envContent = updateEnvVar(envContent, 'DB_NAME', finalDatabase)
    envContent = updateEnvVar(envContent, 'DB_USER', finalUser)
    if (password) {
      envContent = updateEnvVar(envContent, 'DB_PASSWORD', password)
    }
    envContent = updateEnvVar(envContent, 'DB_SSL', finalSsl ? 'true' : 'false')
    
    fs.writeFileSync(envPath, envContent)
    
    return NextResponse.json({
      success: true,
      message: 'Database configuration saved. Restart the application for changes to take effect.'
    })
  } catch (error) {
    console.error('Failed to save database config:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to save database configuration'
    }, { status: 500 })
  }
}
