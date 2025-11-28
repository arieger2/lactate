import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

interface LactateWebhookPayload {
  timestamp?: string
  power: number // Watts
  lactate: number // mmol/L
  heartRate?: number // bpm
  fatOxidation?: number // g/min
  vo2?: number // mL/kg/min
  sessionId?: string
  testType?: 'incremental' | 'steady-state'
  // Device metadata (optional)
  sampleId?: string // Position/number
  glucose?: number // mmol/L
  ph?: number // pH value
  temperature?: number // Temperature of measurement unit
  measurementDate?: string // YYYY-MM-DD
  measurementTime?: string // HH:MM:SS
  errorCode?: string // Error code if measurement failed
  deviceId?: string // Device identifier
  rawData?: Record<string, unknown> // Any additional raw data
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

    // Create the data entry with all optional metadata
    const dataEntry: LactateWebhookPayload = {
      timestamp: body.timestamp || new Date().toISOString(),
      power: body.power,
      lactate: body.lactate,
      heartRate: body.heartRate,
      fatOxidation: body.fatOxidation,
      vo2: body.vo2 || body.VO2,
      sessionId: body.sessionId || 'default',
      testType: body.testType || 'incremental',
      // Device metadata (optional)
      sampleId: body.sampleId || body.SampleID,
      glucose: body.glucose || body.Glucose,
      ph: body.ph || body.pH,
      temperature: body.temperature || body.Temperature,
      measurementDate: body.measurementDate || body.Date,
      measurementTime: body.measurementTime || body.Time,
      errorCode: body.errorCode || body.error_code,
      deviceId: body.deviceId,
      rawData: body.rawData
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

        // Insert lactate data with extended metadata
        await client.query(`
          INSERT INTO lactate_data (
            session_id, customer_id, timestamp, power, lactate, heart_rate, fat_oxidation, vo2,
            sample_id, glucose, ph, temperature, measurement_date, measurement_time, 
            error_code, device_id, raw_data
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          sessionId,
          body.customerId || null,
          dataEntry.timestamp,
          dataEntry.power,
          dataEntry.lactate,
          dataEntry.heartRate || null,
          dataEntry.fatOxidation || null,
          dataEntry.vo2 || null,
          dataEntry.sampleId || null,
          dataEntry.glucose || null,
          dataEntry.ph || null,
          dataEntry.temperature || null,
          dataEntry.measurementDate || null,
          dataEntry.measurementTime || null,
          dataEntry.errorCode || null,
          dataEntry.deviceId || null,
          dataEntry.rawData ? JSON.stringify(dataEntry.rawData) : null
        ])


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
  const includeMetadata = searchParams.get('includeMetadata') === 'true'

  try {
    // Get data from PostgreSQL
    const client = await pool.connect()
    try {
      // Extended query with optional metadata fields
      const result = await client.query(`
        SELECT timestamp, power, lactate, heart_rate as "heartRate", 
               fat_oxidation as "fatOxidation", vo2, 'incremental' as "testType",
               sample_id as "sampleId", glucose, ph, temperature,
               measurement_date as "measurementDate", measurement_time as "measurementTime",
               error_code as "errorCode", device_id as "deviceId", raw_data as "rawData"
        FROM lactate_data 
        WHERE session_id = $1 
        ORDER BY timestamp ASC
      `, [sessionId])

      const dbData: LactateWebhookPayload[] = result.rows.map(row => {
        const baseData: LactateWebhookPayload = {
          timestamp: row.timestamp,
          power: row.power,
          lactate: parseFloat(row.lactate),
          heartRate: row.heartRate,
          fatOxidation: row.fatOxidation ? parseFloat(row.fatOxidation) : undefined,
          vo2: row.vo2 ? parseFloat(row.vo2) : undefined,
          sessionId: sessionId,
          testType: row.testType
        }
        
        // Include metadata if requested or if any metadata exists
        if (includeMetadata || row.sampleId || row.glucose || row.ph || row.errorCode) {
          return {
            ...baseData,
            sampleId: row.sampleId || undefined,
            glucose: row.glucose ? parseFloat(row.glucose) : undefined,
            ph: row.ph ? parseFloat(row.ph) : undefined,
            temperature: row.temperature ? parseFloat(row.temperature) : undefined,
            measurementDate: row.measurementDate || undefined,
            measurementTime: row.measurementTime || undefined,
            errorCode: row.errorCode || undefined,
            deviceId: row.deviceId || undefined,
            rawData: row.rawData || undefined
          }
        }
        
        return baseData
      })

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