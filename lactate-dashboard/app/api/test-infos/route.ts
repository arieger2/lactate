import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// POST - Create new test info
export async function POST(request: NextRequest) {
  let client
  try {
    const body = await request.json()
    const { test_id, customer_id, profile_id, test_date, test_time, device, unit, start_load, increment, stage_duration_min } = body
    
    // Accept either customer_id or profile_id (they're the same)
    const actualProfileId = customer_id || profile_id
    
    // Validation
    if (!test_id || !actualProfileId || !test_date || !test_time || !device || !unit || start_load === undefined || increment === undefined || stage_duration_min === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    client = await pool.connect()
    
    // Check if test_id already exists
    const existing = await client.query(
      'SELECT test_id FROM test_infos WHERE test_id = $1',
      [test_id]
    )
    
    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Test ID "${test_id}" already exists`
      }, { status: 409 })
    }
    
    // Insert test_info
    const result = await client.query(`
      INSERT INTO test_infos (test_id, profile_id, test_date, test_time, device, unit, start_load, increment, stage_duration_min)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      test_id,
      actualProfileId,
      test_date,
      test_time,
      device,
      unit,
      start_load,
      increment,
      stage_duration_min
    ])
    
    return NextResponse.json({
      success: true,
      testInfo: result.rows[0]
    })
    
  } catch (error) {
    console.error('❌ Error creating test info:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create test info',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  } finally {
    if (client) client.release()
  }
}

// GET - List test infos for a profile
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')
  const profile_id = customerId || searchParams.get('profile_id')
  
  if (!profile_id) {
    return NextResponse.json({
      success: false,
      error: 'customerId or profile_id parameter is required'
    }, { status: 400 })
  }
  
  let client
  try {
    client = await pool.connect()
    
    const result = await client.query(`
      SELECT 
        test_id,
        profile_id,
        test_date,
        test_time,
        device,
        unit,
        start_load,
        increment,
        stage_duration_min,
        created_at,
        updated_at
      FROM test_infos
      WHERE profile_id = $1
      ORDER BY test_date DESC, test_time DESC
    `, [profile_id])
    
    return NextResponse.json({
      success: true,
      testInfos: result.rows
    })
    
  } catch (error) {
    console.error('❌ Error fetching test infos:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch test infos',
      testInfos: []
    }, { status: 500 })
  } finally {
    if (client) client.release()
  }
}
