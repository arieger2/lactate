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


    
    const client = await pool.connect()
    try {
      // Get all test_infos (sessions) with stage counts for this profile
      const result = await client.query(`
        SELECT 
          ti.test_id as session_id,
          ti.test_date,
          ti.test_time,
          ti.device,
          ti.unit,
          ti.updated_at,
          COUNT(s.id) as point_count,
          MAX(s.created_at) as last_updated
        FROM test_infos ti
        LEFT JOIN stages s ON ti.test_id = s.test_id
        WHERE ti.profile_id = $1
        GROUP BY ti.test_id, ti.test_date, ti.test_time, ti.device, ti.unit, ti.updated_at
        ORDER BY ti.test_date DESC, ti.test_time DESC
      `, [customerId])



      const sessions = result.rows.map(row => ({
        id: row.session_id, // Use 'id' for consistency with the frontend
        session_id: row.session_id,
        test_date: row.test_date || new Date().toISOString(),
        test_type: row.device || 'bike', // Use device as test_type
        device: row.device,
        unit: row.unit,
        point_count: parseInt(row.point_count),
        last_updated: row.last_updated,
        updated_at: row.updated_at || new Date().toISOString()
      }))

      return NextResponse.json({
        success: true,
        sessions: sessions
      })
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