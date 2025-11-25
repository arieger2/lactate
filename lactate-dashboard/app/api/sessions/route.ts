import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect()
    try {
      // Get all sessions with their data counts and last update times
      const result = await client.query(`
        SELECT 
          s.session_id as id,
          s.test_date,
          s.test_type,
          s.updated_at,
          COUNT(ld.id) as point_count,
          MAX(ld.timestamp) as last_updated
        FROM sessions s
        LEFT JOIN lactate_data ld ON s.session_id = ld.session_id
        GROUP BY s.session_id, s.test_date, s.test_type, s.updated_at
        HAVING COUNT(ld.id) > 0
        ORDER BY s.updated_at DESC
      `)

      const sessions = result.rows.map(row => ({
        id: row.id,
        testDate: row.test_date,
        testType: row.test_type,
        pointCount: parseInt(row.point_count),
        lastUpdated: row.last_updated || row.updated_at,
        updatedAt: row.updated_at
      }))

      return NextResponse.json(sessions)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}