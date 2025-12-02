import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const BACKUP_DIR = searchParams.get('backupDir') || '/tmp/lactate_backups'
  try {
    // Check if backup directory exists
    try {
      await fs.access(BACKUP_DIR)
    } catch {
      // Directory doesn't exist, return empty list
      return NextResponse.json({
        success: true,
        backups: []
      })
    }

    // Read directory contents
    const files = await fs.readdir(BACKUP_DIR)
    
    // Filter for backup files and get their stats
    const backupFiles = await Promise.all(
      files
        .filter(file => file.startsWith('laktat_') && (file.endsWith('.sql') || file.endsWith('.sql.gz')))
        .map(async (filename) => {
          const filePath = path.join(BACKUP_DIR, filename)
          const stats = await fs.stat(filePath)
          
          // Determine backup type from filename
          let type: 'full' | 'compressed' | 'data-only' | 'table' = 'full'
          if (filename.includes('_compressed_')) {
            type = 'compressed'
          } else if (filename.includes('_data_only_')) {
            type = 'data-only'
          } else if (!filename.includes('_full_') && !filename.includes('_compressed_')) {
            type = 'table'
          }

          // Format size
          const formatSize = (bytes: number) => {
            if (bytes < 1024) return bytes + ' B'
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
            if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
            return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
          }

          return {
            filename,
            size: formatSize(stats.size),
            modified: stats.mtime.toLocaleString('de-DE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }),
            type
          }
        })
    )

    // Sort by modification time (newest first)
    backupFiles.sort((a, b) => {
      const dateA = new Date(a.modified.split(', ').reverse().join(' '))
      const dateB = new Date(b.modified.split(', ').reverse().join(' '))
      return dateB.getTime() - dateA.getTime()
    })

    return NextResponse.json({
      success: true,
      backups: backupFiles
    })
  } catch (error: any) {
    console.error('List backups error:', error)
    return NextResponse.json(
      { success: false, message: `Failed to list backups: ${error.message}` },
      { status: 500 }
    )
  }
}
