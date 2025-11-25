import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId parameter is required' },
        { status: 400 }
      )
    }

    console.log('Fetching sessions for customer:', customerId)
    
    const client = await pool.connect()
    try {
      // Get all sessions that have lactate_data for this customer
      const result = await client.query(`
        SELECT DISTINCT
          ld.session_id,
          s.test_date,
          s.test_type,
          s.updated_at,
          COUNT(ld.id) as point_count,
          MAX(ld.timestamp) as last_updated
        FROM lactate_data ld
        LEFT JOIN sessions s ON ld.session_id = s.session_id
        WHERE ld.customer_id = $1
        GROUP BY ld.session_id, s.test_date, s.test_type, s.updated_at
        ORDER BY MAX(ld.timestamp) DESC
      `, [customerId])

      console.log(`Found ${result.rows.length} sessions for customer ${customerId}`)

      const sessions = result.rows.map(row => ({
        session_id: row.session_id,
        test_date: row.test_date || new Date().toISOString(),
        test_type: row.test_type || 'automatic',
        point_count: parseInt(row.point_count),
        last_updated: row.last_updated,
        updated_at: row.updated_at || new Date().toISOString()
      }))

      return NextResponse.json(sessions)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Failed to fetch customer sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer sessions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}