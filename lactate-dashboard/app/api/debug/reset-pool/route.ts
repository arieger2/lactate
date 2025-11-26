import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('🛠️ Debug: Forcing pool reinitialization...')
    
    // Import dynamically to force re-evaluation
    const dbPoolManager = require('@/lib/dbPoolManager').default
    const poolManager = dbPoolManager()
    
    // Force recreation of the pool with new config
    poolManager.forceReinitialize()
    
    return NextResponse.json({ success: true, message: 'Pool reinitialized successfully' })
  } catch (error) {
    console.error('❌ Failed to reinitialize pool:', error)
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}