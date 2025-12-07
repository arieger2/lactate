import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { sessionId, profileId, zones } = body
    
    if (!sessionId || !profileId || !zones || !Array.isArray(zones)) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, profileId, and zones array' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      await client.query(
        'DELETE FROM manual_zones WHERE test_id = $1',
        [sessionId]
      )

      for (const zone of zones) {
        await client.query(`
          INSERT INTO manual_zones (
            test_id, profile_id, zone_id, range_start, range_end
          )
          VALUES ($1, $2, $3, $4, $5)
        `, [
          sessionId,
          profileId,
          zone.id,
          zone.min,
          zone.max
        ])
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: 'Manual zones saved successfully'
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error saving manual zones:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId parameter is required' },
      { status: 400 }
    )
  }

  try {
    const client = await pool.connect()
    
    try {
      const result = await client.query(`
        SELECT zone_id, range_start, range_end
        FROM manual_zones 
        WHERE test_id = $1
        ORDER BY zone_id ASC
      `, [sessionId])

      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No manual zones found'
        })
      }

      const zones = result.rows.map(row => ({
        id: row.zone_id,
        min: parseFloat(row.range_start),
        max: parseFloat(row.range_end)
      }))

      return NextResponse.json({
        success: true,
        data: zones
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error fetching manual zones:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
