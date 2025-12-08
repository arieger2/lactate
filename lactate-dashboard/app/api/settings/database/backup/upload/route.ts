import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const backupDir = formData.get('backupDir') as string || '/tmp/lactate_backups'

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file extension
    if (!file.name.endsWith('.sql') && !file.name.endsWith('.sql.gz')) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Only .sql and .sql.gz files are allowed' },
        { status: 400 }
      )
    }

    // Create backup directory if it doesn't exist
    try {
      await fs.mkdir(backupDir, { recursive: true })
    } catch (error) {
      // silent error
    }

    // Save file to backup directory
    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = path.join(backupDir, file.name)

    await fs.writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      message: `File uploaded successfully: ${file.name}`,
      filename: file.name,
      path: filePath
    })
  } catch (error: any) {
    console.error('❌ Upload error:', error)
    return NextResponse.json(
      { success: false, message: `Upload failed: ${error.message}` },
      { status: 500 }
    )
  }
}
