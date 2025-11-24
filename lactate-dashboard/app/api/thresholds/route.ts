import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// API endpoint for storing threshold calculations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, method, lt1Power, lt1Lactate, lt2Power, lt2Lactate } = body

    if (!sessionId || !method) {
      return NextResponse.json({ 
        error: 'sessionId and method are required' 
      }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      // Store threshold results
      await client.query(`
        INSERT INTO threshold_results (session_id, method, lt1_power, lt1_lactate, lt2_power, lt2_lactate)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (session_id, method) 
        DO UPDATE SET 
          lt1_power = $3, 
          lt1_lactate = $4, 
          lt2_power = $5, 
          lt2_lactate = $6,
          calculated_at = NOW()
      `, [sessionId, method, lt1Power, lt1Lactate, lt2Power, lt2Lactate])

      return NextResponse.json({
        success: true,
        message: 'Threshold results stored successfully'
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error storing threshold results:', error)
    return NextResponse.json({ 
      error: 'Failed to store threshold results' 
    }, { status: 500 })
  }
}

// Get threshold results for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'sessionId is required' 
      }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT method, lt1_power, lt1_lactate, lt2_power, lt2_lactate, calculated_at
        FROM threshold_results 
        WHERE session_id = $1
        ORDER BY calculated_at DESC
      `, [sessionId])

      return NextResponse.json({
        sessionId,
        thresholds: result.rows
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error retrieving threshold results:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve threshold results' 
    }, { status: 500 })
  }
}