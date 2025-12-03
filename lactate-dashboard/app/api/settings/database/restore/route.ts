import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
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
    const { database, backupFile, backupDir } = body

    const BACKUP_DIR = backupDir || '/tmp/lactate_backups'

    if (!database) {
      return NextResponse.json(
        { success: false, message: 'Database name is required' },
        { status: 400 }
      )
    }

    if (!backupFile) {
      return NextResponse.json(
        { success: false, message: 'Backup file is required' },
        { status: 400 }
      )
    }

    // Security check: ensure filename doesn't contain path traversal
    if (backupFile.includes('..') || backupFile.includes('/')) {
      return NextResponse.json(
        { success: false, message: 'Invalid backup filename' },
        { status: 400 }
      )
    }

    // Construct full path
    const fullPath = path.join(BACKUP_DIR, backupFile)

    // Get database config
    const dbConfig = getDatabaseConfig()
    const dbHost = dbConfig.host || 'localhost'
    const dbPort = dbConfig.port || '5432'
    const dbUser = dbConfig.user || 'postgres'
    const dbPassword = dbConfig.password || ''
    
    // Set PGPASSWORD environment variable
    const env = { ...process.env, PGPASSWORD: dbPassword }

    console.log('🔄 Restoring backup:', { backupFile, database })

    try {
      let command = ''
      
      // Determine if compressed or regular backup
      if (backupFile.endsWith('.gz')) {
        command = `gunzip -c "${fullPath}" | psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${database} -v ON_ERROR_STOP=0`
      } else {
        command = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${database} -v ON_ERROR_STOP=0 -f "${fullPath}"`
      }

      const { stdout, stderr } = await execAsync(command, { env, timeout: 120000 })
      
      if (stderr && !stderr.includes('NOTICE') && !stderr.includes('already exists')) {
        console.warn('⚠️ psql stderr:', stderr)
      }
      
      console.log('✅ Restore completed successfully')
      console.log('📊 Restore output:', stdout)
      
      return NextResponse.json({
        success: true,
        message: `Database restored from: ${backupFile}`,
        backupFile,
        timestamp: new Date().toISOString()
      })
    } catch (error: any) {
      console.error('❌ Restore error:', error)
      
      // Even if there are errors, check if it's just warnings
      if (error.stderr && error.stderr.includes('already exists')) {
        console.log('⚠️ Restore completed with warnings (objects already exist)')
        return NextResponse.json({
          success: true,
          message: `Database restored from: ${backupFile} (with warnings)`,
          backupFile,
          timestamp: new Date().toISOString()
        })
      }
      
      return NextResponse.json(
        { success: false, message: `Restore failed: ${error.message}` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ Restore error:', error)
    return NextResponse.json(
      { success: false, message: `Restore failed: ${error.message}` },
      { status: 500 }
    )
  }
}
