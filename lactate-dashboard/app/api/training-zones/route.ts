import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET - Retrieve training zones for a customer/session
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')
  const sessionId = searchParams.get('sessionId')
  
  if (!customerId || !sessionId) {
    return NextResponse.json({ error: 'customerId and sessionId are required' }, { status: 400 })
  }
  
  let client
  try {
    client = await pool.connect()
    
    const result = await client.query(
      `SELECT * FROM training_zones WHERE customer_id = $1 AND session_id = $2`,
      [customerId, sessionId]
    )
    
    if (result.rows.length > 0) {
      return NextResponse.json(result.rows[0])
    } else {
      return NextResponse.json(null)
    }
  } catch (error) {
    console.error('Error fetching training zones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training zones' },
      { status: 500 }
    )
  } finally {
    if (client) client.release()
  }
}

// POST - Save training zones
export async function POST(request: NextRequest) {
  let client
  try {
    const body = await request.json()
    const { customerId, sessionId, method, boundaries, zones, zoneBoundaries } = body
    
    // Accept either zoneBoundaries or boundaries
    const boundariesToSave = zoneBoundaries || boundaries
    
    if (!customerId || !sessionId || !boundariesToSave) {
      return NextResponse.json(
        { error: 'customerId, sessionId, and zoneBoundaries/boundaries are required' },
        { status: 400 }
      )
    }
    
    client = await pool.connect()
    
    // Also save the zones if provided
    const dataToSave = {
      boundaries: boundariesToSave,
      zones: zones || null,
      savedAt: new Date().toISOString()
    }
    
    // Upsert zone boundaries
    const result = await client.query(
      `INSERT INTO training_zones (customer_id, session_id, zone_boundaries, method, modified_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (customer_id, session_id) 
       DO UPDATE SET zone_boundaries = $3, method = $4, modified_at = NOW()
       RETURNING *`,
      [customerId, sessionId, JSON.stringify(dataToSave), method || 'custom']
    )
    
    return NextResponse.json({
      success: true,
      message: 'Training zones saved successfully',
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error saving training zones:', error)
    return NextResponse.json(
      { error: 'Failed to save training zones', message: (error as Error).message },
      { status: 500 }
    )
  } finally {
    if (client) client.release()
  }
}
