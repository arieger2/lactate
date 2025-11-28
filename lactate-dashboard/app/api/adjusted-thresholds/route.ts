import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { sessionId, customerId, lt1Power, lt1Lactate, lt2Power, lt2Lactate, adjustedAt } = body
    
    if (!sessionId || !customerId || !lt1Power || !lt1Lactate || !lt2Power || !lt2Lactate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    
    try {
      // Convert values to proper numeric types
      const lt1PowerNum = parseFloat(lt1Power)
      const lt1LactateNum = parseFloat(lt1Lactate)  
      const lt2PowerNum = parseFloat(lt2Power)
      const lt2LactateNum = parseFloat(lt2Lactate)
      
      // Insert or update adjusted thresholds
      await client.query(`
        INSERT INTO adjusted_thresholds (
          session_id, customer_id, lt1_power, lt1_lactate, 
          lt2_power, lt2_lactate, adjusted_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (session_id, customer_id) 
        DO UPDATE SET 
          lt1_power = $3,
          lt1_lactate = $4,
          lt2_power = $5,
          lt2_lactate = $6,
          adjusted_at = $7,
          updated_at = NOW()
      `, [
        sessionId, customerId, lt1PowerNum, lt1LactateNum, 
        lt2PowerNum, lt2LactateNum, adjustedAt
      ])



      return NextResponse.json({
        success: true,
        message: 'Adjusted thresholds saved successfully',
        data: {
          sessionId,
          customerId,
          lt1: { power: lt1Power, lactate: lt1Lactate },
          lt2: { power: lt2Power, lactate: lt2Lactate },
          adjustedAt
        }
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error saving adjusted thresholds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const customerId = searchParams.get('customerId')

  if (!sessionId || !customerId) {
    return NextResponse.json(
      { error: 'sessionId and customerId are required' },
      { status: 400 }
    )
  }

  try {
    const client = await pool.connect()
    
    try {
      const result = await client.query(`
        SELECT lt1_power, lt1_lactate, lt2_power, lt2_lactate, adjusted_at
        FROM adjusted_thresholds 
        WHERE session_id = $1 AND customer_id = $2
        ORDER BY adjusted_at DESC
        LIMIT 1
      `, [sessionId, customerId])

      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No adjusted thresholds found'
        })
      }

      const row = result.rows[0]
      return NextResponse.json({
        success: true,
        data: {
          lt1: { power: parseFloat(row.lt1_power), lactate: parseFloat(row.lt1_lactate) },
          lt2: { power: parseFloat(row.lt2_power), lactate: parseFloat(row.lt2_lactate) },
          adjustedAt: row.adjusted_at
        }
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error fetching adjusted thresholds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}