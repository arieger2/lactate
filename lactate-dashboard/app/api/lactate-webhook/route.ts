import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

interface LactateWebhookPayload {
  timestamp?: string
  power: number // Watts
  lactate: number // mmol/L
  heartRate?: number // bpm
  fatOxidation?: number // g/min
  sessionId?: string
  testType?: 'incremental' | 'steady-state'
}

// PostgreSQL store with memory fallback
const dataStore = new Map<string, LactateWebhookPayload[]>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.power || !body.lactate) {
      return NextResponse.json(
        { error: 'Missing required fields: power and lactate are required' },
        { status: 400 }
      )
    }

    // Validate data types and ranges
    if (typeof body.power !== 'number' || body.power < 0) {
      return NextResponse.json(
        { error: 'Power must be a positive number' },
        { status: 400 }
      )
    }

    if (typeof body.lactate !== 'number' || body.lactate < 0) {
      return NextResponse.json(
        { error: 'Lactate must be a positive number' },
        { status: 400 }
      )
    }

    // Create the data entry
    const dataEntry: LactateWebhookPayload = {
      timestamp: body.timestamp || new Date().toISOString(),
      power: body.power,
      lactate: body.lactate,
      heartRate: body.heartRate,
      fatOxidation: body.fatOxidation,
      sessionId: body.sessionId || 'default',
      testType: body.testType || 'incremental'
    }

    // Store the data in PostgreSQL
    const sessionId = dataEntry.sessionId!
    
    try {
      const client = await pool.connect()
      try {
        // Ensure session exists
        await client.query(`
          INSERT INTO sessions (session_id, test_date, test_type) 
          VALUES ($1, NOW(), $2) 
          ON CONFLICT (session_id) DO UPDATE SET updated_at = NOW()
        `, [sessionId, dataEntry.testType])

        // Insert lactate data
        await client.query(`
          INSERT INTO lactate_data (session_id, customer_id, timestamp, power, lactate, heart_rate, fat_oxidation)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          sessionId,
          body.customerId || null,
          dataEntry.timestamp,
          dataEntry.power,
          dataEntry.lactate,
          dataEntry.heartRate || null,
          dataEntry.fatOxidation || null
        ])

        console.log('Data stored in PostgreSQL:', dataEntry)
      } finally {
        client.release()
      }
    } catch (dbError) {
      console.error('PostgreSQL error, falling back to memory:', dbError)
    }

    // Also store in memory for immediate access
    if (!dataStore.has(sessionId)) {
      dataStore.set(sessionId, [])
    }
    dataStore.get(sessionId)!.push(dataEntry)

    return NextResponse.json({
      success: true,
      message: 'Data received successfully',
      data: dataEntry,
      sessionId: sessionId,
      totalPoints: dataStore.get(sessionId)!.length
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') || 'default'

  try {
    // Get data from PostgreSQL
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT timestamp, power, lactate, heart_rate as "heartRate", 
               fat_oxidation as "fatOxidation", 'incremental' as "testType"
        FROM lactate_data 
        WHERE session_id = $1 
        ORDER BY timestamp ASC
      `, [sessionId])

      const dbData: LactateWebhookPayload[] = result.rows.map(row => ({
        timestamp: row.timestamp,
        power: row.power,
        lactate: parseFloat(row.lactate),
        heartRate: row.heartRate,
        fatOxidation: row.fatOxidation ? parseFloat(row.fatOxidation) : undefined,
        sessionId: sessionId,
        testType: row.testType
      }))

      // Sync memory cache with database
      dataStore.set(sessionId, dbData)

      return NextResponse.json({
        sessionId: sessionId,
        data: dbData,
        totalPoints: dbData.length,
        lastUpdated: dbData.length > 0 ? dbData[dbData.length - 1].timestamp : null,
        source: 'postgresql'
      })
    } finally {
      client.release()
    }
  } catch (dbError) {
    console.error('PostgreSQL error, falling back to memory:', dbError)
    
    // Fallback to memory data
    const sessionData = dataStore.get(sessionId) || []
    return NextResponse.json({
      sessionId: sessionId,
      data: sessionData,
      totalPoints: sessionData.length,
      lastUpdated: sessionData.length > 0 ? sessionData[sessionData.length - 1].timestamp : null,
      source: 'memory_fallback'
    })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  try {
    const client = await pool.connect()
    try {
      if (sessionId) {
        // Delete specific session from PostgreSQL
        await client.query('DELETE FROM lactate_data WHERE session_id = $1', [sessionId])
        await client.query('DELETE FROM threshold_results WHERE session_id = $1', [sessionId])
        await client.query('DELETE FROM training_zones WHERE session_id = $1', [sessionId])
        await client.query('DELETE FROM sessions WHERE session_id = $1', [sessionId])
        
        // Also delete from memory
        dataStore.delete(sessionId)
        
        console.log('Session deleted from PostgreSQL:', sessionId)
        return NextResponse.json({
          success: true,
          message: `Session ${sessionId} data cleared from database`,
          source: 'postgresql'
        })
      } else {
        // Clear all sessions from PostgreSQL
        await client.query('DELETE FROM lactate_data')
        await client.query('DELETE FROM threshold_results')
        await client.query('DELETE FROM training_zones')
        await client.query('DELETE FROM sessions')
        
        // Also clear memory
        dataStore.clear()
        
        return NextResponse.json({
          success: true,
          message: 'All session data cleared from database',
          source: 'postgresql'
        })
      }
    } finally {
      client.release()
    }
  } catch (dbError) {
    console.error('PostgreSQL error during deletion:', dbError)
    
    // Fallback to memory deletion
    if (sessionId) {
      dataStore.delete(sessionId)
      return NextResponse.json({
        success: true,
        message: `Session ${sessionId} data cleared from memory (DB error)`,
        source: 'memory_fallback'
      })
    } else {
      dataStore.clear()
      return NextResponse.json({
        success: true,
        message: 'All session data cleared from memory (DB error)',
        source: 'memory_fallback'
      })
    }
  }
}