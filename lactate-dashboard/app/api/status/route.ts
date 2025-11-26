import { NextResponse } from 'next/server'

// Simple test API to verify server stability
export async function GET() {
  try {
    console.log('🟢 Status API called')
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'Server is running'
    })
  } catch (error) {
    console.error('🔴 Status API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}