import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const backupDir = searchParams.get('backupDir') || '/tmp/lactate_backups'
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json(
        { success: false, message: 'Filename is required' },
        { status: 400 }
      )
    }

    // Security check: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return NextResponse.json(
        { success: false, message: 'Invalid filename' },
        { status: 400 }
      )
    }

    // Construct full path
    const fullPath = path.join(backupDir, filename)

    // Check if file exists
    try {
      await fs.access(fullPath)
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = await fs.readFile(fullPath)

    // Determine content type
    const contentType = filename.endsWith('.gz') 
      ? 'application/gzip' 
      : 'application/sql'

    // Return file as download
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json(
      { success: false, message: `Download failed: ${error.message}` },
      { status: 500 }
    )
  }
}
