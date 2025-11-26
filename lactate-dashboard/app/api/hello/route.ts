import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ message: 'Hello World', timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Error in hello API:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}