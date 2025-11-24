import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// API endpoint for storing training zones
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, method, zones } = body

    if (!sessionId || !method || !zones || !Array.isArray(zones)) {
      return NextResponse.json({ 
        error: 'sessionId, method, and zones array are required' 
      }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      // Delete existing zones for this session and method
      await client.query(`
        DELETE FROM training_zones 
        WHERE session_id = $1 AND method = $2
      `, [sessionId, method])

      // Insert new zones
      for (const zone of zones) {
        await client.query(`
          INSERT INTO training_zones 
          (session_id, method, zone_number, zone_name, power_min, power_max, lactate_range, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          sessionId,
          method,
          zone.number,
          zone.name,
          zone.powerMin,
          zone.powerMax,
          zone.lactateRange,
          zone.description
        ])
      }

      return NextResponse.json({
        success: true,
        message: 'Training zones stored successfully',
        zonesCount: zones.length
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error storing training zones:', error)
    return NextResponse.json({ 
      error: 'Failed to store training zones' 
    }, { status: 500 })
  }
}

// Get training zones for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const method = searchParams.get('method')

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'sessionId is required' 
      }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      let query = `
        SELECT zone_number, zone_name, power_min, power_max, lactate_range, description, calculated_at
        FROM training_zones 
        WHERE session_id = $1
      `
      let params = [sessionId]

      if (method) {
        query += ` AND method = $2`
        params.push(method)
      }

      query += ` ORDER BY zone_number ASC`

      const result = await client.query(query, params)

      return NextResponse.json({
        sessionId,
        method,
        zones: result.rows.map(row => ({
          number: row.zone_number,
          name: row.zone_name,
          powerMin: row.power_min,
          powerMax: row.power_max,
          lactateRange: row.lactate_range,
          description: row.description,
          calculatedAt: row.calculated_at
        }))
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error retrieving training zones:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve training zones' 
    }, { status: 500 })
  }
}