import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// Read database config from app.config.json
function getDatabaseConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'app.config.json')
    const configContent = require('fs').readFileSync(configPath, 'utf8')
    const config = JSON.parse(configContent)
    return config.database || {}
  } catch (error) {
    console.error('Failed to read config:', error)
    return {}
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { database, type, table, backupDir } = body

    if (!database) {
      return NextResponse.json(
        { success: false, message: 'Database name is required' },
        { status: 400 }
      )
    }

    if (!['full', 'compressed', 'data-only', 'table'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid backup type' },
        { status: 400 }
      )
    }

    if (type === 'table' && !table) {
      return NextResponse.json(
        { success: false, message: 'Table name is required for table backup' },
        { status: 400 }
      )
    }

    // Set backup directory
    const targetDir = backupDir || '/tmp/lactate_backups'
    
    // Create backup directory if it doesn't exist
    try {
      await fs.mkdir(targetDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create backup directory:', error)
    }

    // Get database config
    const dbConfig = getDatabaseConfig()
    const dbHost = dbConfig.host || 'localhost'
    const dbPort = dbConfig.port || '5432'
    const dbUser = dbConfig.user || 'postgres'
    const dbPassword = dbConfig.password || ''

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').split('.')[0]
    
    // Construct filename based on type
    let filename = ''
    let command = ''
    
    // Set PGPASSWORD environment variable
    const env = { ...process.env, PGPASSWORD: dbPassword }

    switch (type) {
      case 'full':
        filename = `${targetDir}/laktat_full_${timestamp}.sql`
        command = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${database} --clean --if-exists --create -F p -f "${filename}"`
        break
      case 'compressed':
        filename = `${targetDir}/laktat_compressed_${timestamp}.sql.gz`
        command = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${database} --clean --if-exists --create -F p | gzip > "${filename}"`
        break
      case 'data-only':
        filename = `${targetDir}/laktat_data_only_${timestamp}.sql`
        command = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${database} --clean --if-exists -a -F p -f "${filename}"`
        break
      case 'table':
        filename = `${targetDir}/laktat_${table}_${timestamp}.sql`
        command = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${database} --clean --if-exists -t ${table} -F p -f "${filename}"`
        break
    }

    console.log('🔄 Creating backup:', { type, filename, command: command.replace(dbPassword, '***') })

    try {
      const { stdout, stderr } = await execAsync(command, { env, timeout: 30000 })
      
      if (stderr && !stderr.includes('warning')) {
        console.warn('pg_dump stderr:', stderr)
      }
      
      console.log('✅ Backup created successfully:', filename)
      
      return NextResponse.json({
        success: true,
        message: `Backup created: ${path.basename(filename)}`,
        filename: path.basename(filename),
        fullPath: filename,
        type,
        timestamp
      })
    } catch (error: any) {
      console.error('❌ pg_dump error:', error)
      return NextResponse.json(
        { success: false, message: `Backup failed: ${error.message}` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ Backup error:', error)
    return NextResponse.json(
      { success: false, message: `Backup failed: ${error.message}` },
      { status: 500 }
    )
  }
}
