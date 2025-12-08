import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { interpolateIncompleteStage, isStageIncomplete } from '@/lib/incompleteStageInterpolation'
import { calculateTheoreticalLoad, needsTheoreticalLoad } from '@/lib/theoreticalLoadExtrapolation'

interface LactateWebhookPayload {
  timestamp?: string
  load: number // Generic load (watt or kmh depending on unit)
  theoreticalLoad?: number // Calculated theoretical load for incomplete stages
  power?: number // Backward compatibility
  lactate: number // mmol/L
  heartRate?: number // bpm
  fatOxidation?: number // g/min
  vo2?: number // mL/kg/min
  sessionId?: string  // Maps to test_id
  testId?: string     // Direct mapping
  testType?: 'incremental' | 'steady-state'
  stage?: number      // Stage number
  duration?: number   // Duration in minutes
  rrSystolic?: number // Blood pressure systolic
  rrDiastolic?: number // Blood pressure diastolic
  isFinalApproximation?: boolean
  notes?: string
  unit?: string       // Unit type (watt, kmh, other)
  device?: string     // Device type (bike, treadmill, other)
  // Device metadata (optional - legacy support)
  sampleId?: string
  glucose?: number
  ph?: number
  temperature?: number
  measurementDate?: string
  measurementTime?: string
  errorCode?: string
  deviceId?: string
  rawData?: Record<string, unknown>
}

// PostgreSQL store with memory fallback
const dataStore = new Map<string, LactateWebhookPayload[]>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields - support both 'power' (legacy) and 'load' (new)
    const load = body.load || body.power
    if (!load || !body.lactate) {
      return NextResponse.json(
        { error: 'Missing required fields: load (or power) and lactate are required' },
        { status: 400 }
      )
    }

    // Validate data types and ranges
    if (typeof load !== 'number' || load < 0) {
      return NextResponse.json(
        { error: 'Load must be a positive number' },
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
      load: load,
      power: load, // Backward compatibility
      lactate: body.lactate,
      heartRate: body.heartRate,
      fatOxidation: body.fatOxidation,
      vo2: body.vo2 || body.VO2,
      sessionId: body.sessionId || body.testId || 'default',
      testId: body.testId || body.sessionId || 'default',
      testType: body.testType || 'incremental',
      stage: body.stage,
      duration: body.duration,
      rrSystolic: body.rrSystolic || body.rr_systolic,
      rrDiastolic: body.rrDiastolic || body.rr_diastolic,
      isFinalApproximation: body.isFinalApproximation || false,
      notes: body.notes,
      // Device metadata (optional - legacy)
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
    const testId = dataEntry.testId!
    const sessionId = testId // For backward compatibility
    let theoreticalLoad: number | null = null
    
    try {
      const client = await pool.connect()
      try {
        // Check if test_info exists, if not skip (user must create test_info first)
        const testExists = await client.query(
          'SELECT test_id FROM test_infos WHERE test_id = $1',
          [testId]
        )
        
        if (testExists.rows.length === 0) {
          // Test not found, do not save to DB
        } else {
          // Get test info for stage duration
          const testInfo = await client.query(
            'SELECT stage_duration_min FROM test_infos WHERE test_id = $1',
            [testId]
          )
          const targetDuration = testInfo.rows[0]?.stage_duration_min || 3
          
          // Get next stage number if not provided
          let stageNumber: number = dataEntry.stage || 0
          let isExistingStage = body.isExistingStage === true // Check the flag from request body first
          
          if (!stageNumber) {
            const maxStage = await client.query(
              'SELECT COALESCE(MAX(stage), 0) as max_stage FROM stages WHERE test_id = $1',
              [testId]
            )
            stageNumber = maxStage.rows[0].max_stage + 1
          } else if (!isExistingStage) {
            // Only check database if flag not explicitly set to true
            const existingStage = await client.query(
              'SELECT stage FROM stages WHERE test_id = $1 AND stage = $2',
              [testId, stageNumber]
            )
            isExistingStage = existingStage.rows.length > 0
          }
          
          // Check if interpolation is needed
          const actualDuration = dataEntry.duration || targetDuration
          let finalLoad = dataEntry.load
          let finalLactate = dataEntry.lactate
          let finalHeartRate = dataEntry.heartRate
          let isFinalApproximation = dataEntry.isFinalApproximation || false
          
          // NEW: Calculate theoretical load for incomplete stages
          // Always check if theoretical load is needed, regardless of whether stage is new or existing
          console.log(`🔍 Checking theoretical load: stageNumber=${stageNumber}, actualDuration=${actualDuration}, targetDuration=${targetDuration}`)
          console.log(`needsTheoreticalLoad result: ${needsTheoreticalLoad(actualDuration, targetDuration)}`)
          
          if (stageNumber > 1 && needsTheoreticalLoad(actualDuration, targetDuration)) {
            console.log(`✅ Calculating theoretical load for stage ${stageNumber}`)
            // Get previous stage
            const prevStage = await client.query(`
              SELECT load, lactate_mmol as lactate, heart_rate_bpm as "heartRate"
              FROM stages
              WHERE test_id = $1 AND stage = $2
            `, [testId, stageNumber - 1])
            
            if (prevStage.rows.length > 0) {
              const previousStage = {
                power: parseFloat(prevStage.rows[0].load),
                lactate: parseFloat(prevStage.rows[0].lactate),
                heartRate: prevStage.rows[0].heartRate ? parseInt(prevStage.rows[0].heartRate) : undefined
              }
              
              const currentStage = {
                power: dataEntry.load,
                lactate: dataEntry.lactate,
                heartRate: dataEntry.heartRate
              }
              
              // Get pre-previous stage for quadratic extrapolation (if available)
              let prePreviousStage: { power: number; lactate: number; heartRate?: number } | undefined
              if (stageNumber > 2) {
                const prePrevStage = await client.query(`
                  SELECT load, lactate_mmol as lactate, heart_rate_bpm as "heartRate"
                  FROM stages
                  WHERE test_id = $1 AND stage = $2
                `, [testId, stageNumber - 2])
                
                if (prePrevStage.rows.length > 0) {
                  prePreviousStage = {
                    power: parseFloat(prePrevStage.rows[0].load),
                    lactate: parseFloat(prePrevStage.rows[0].lactate),
                    heartRate: prePrevStage.rows[0].heartRate ? parseInt(prePrevStage.rows[0].heartRate) : undefined
                  }
                }
              }
              
              // Calculate theoretical load (what could be sustained for full duration)
              const theoretical = calculateTheoreticalLoad({
                previousStage,
                currentStage,
                prePreviousStage,
                actualDuration,
                targetDuration
              })
              
              theoreticalLoad = theoretical.theoreticalLoad
              isFinalApproximation = true // Mark this as a final approximation
              console.log(`🎯 Theoretical load calculated: ${theoreticalLoad}`)
            } else {
              console.log(`⚠️ No previous stage found for theoretical load calculation`)
            }
          } else {
            console.log(`❌ Skipped theoretical load: stageNumber=${stageNumber} (needs >1), needsCalc=${needsTheoreticalLoad(actualDuration, targetDuration)}`)
          }
          
          // If stage is new, use INSERT. If existing, use UPDATE.
          if (isExistingStage) {
            // UPDATE existing stage
            const query = `
              UPDATE stages SET
                load = $3,
                lactate_mmol = $4,
                heart_rate_bpm = $5,
                duration_min = $6,
                rr_systolic = $7,
                rr_diastolic = $8,
                notes = $9,
                is_final_approximation = $10,
                theoretical_load = $11
              WHERE test_id = $1 AND stage = $2
            `
            await client.query(query, [
              testId,
              stageNumber,
              finalLoad,
              finalLactate,
              finalHeartRate,
              actualDuration,
              dataEntry.rrSystolic,
              dataEntry.rrDiastolic,
              dataEntry.notes,
              isFinalApproximation,
              theoreticalLoad
            ])
          } else {
            // INSERT new stage
            const query = `
              INSERT INTO stages (
                test_id, stage, load, lactate_mmol, heart_rate_bpm, duration_min,
                rr_systolic, rr_diastolic, notes, is_final_approximation, theoretical_load
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `
            await client.query(query, [
              testId,
              stageNumber,
              finalLoad,
              finalLactate,
              finalHeartRate,
              actualDuration,
              dataEntry.rrSystolic,
              dataEntry.rrDiastolic,
              dataEntry.notes,
              isFinalApproximation,
              theoreticalLoad
            ])
          }
        }
      } finally {
        client.release()
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError)
      // Continue without saving to DB if it fails
    }

    // Also update in-memory store for non-DB use cases
    if (!dataStore.has(sessionId)) {
      dataStore.set(sessionId, [])
    }
    const sessionData = dataStore.get(sessionId)!

    // If stage exists, update it. Otherwise, add new.
    const existingIndex = sessionData.findIndex(d => d.stage === dataEntry.stage)
    if (existingIndex > -1) {
      sessionData[existingIndex] = dataEntry
    } else {
      sessionData.push(dataEntry)
    }
    
    // Sort by stage number
    sessionData.sort((a, b) => (a.stage || 0) - (b.stage || 0))

    return NextResponse.json({
      message: 'Data received successfully',
      testId: testId,
      stage: dataEntry.stage,
      theoreticalLoad: theoreticalLoad
    })
  } catch (error) {
    console.error('Error processing lactate data:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') || searchParams.get('testId') || 'default'
  const testId = sessionId // Use same value
  const includeMetadata = searchParams.get('includeMetadata') === 'true'

  try {
    // Get data from PostgreSQL
    const client = await pool.connect()
    try {
      // Query stages from new schema
      const result = await client.query(`
        SELECT 
          s.stage,
          s.duration_min as duration,
          s.load,
          s.theoretical_load as "theoreticalLoad",
          s.heart_rate_bpm as "heartRate",
          s.lactate_mmol as lactate,
          s.rr_systolic as "rrSystolic",
          s.rr_diastolic as "rrDiastolic",
          s.is_final_approximation as "isFinalApproximation",
          s.notes,
          s.created_at as timestamp,
          ti.unit,
          ti.device,
          ti.stage_duration_min
        FROM stages s
        JOIN test_infos ti ON s.test_id = ti.test_id
        WHERE s.test_id = $1 
        ORDER BY s.stage ASC
      `, [testId])

      const dbData: LactateWebhookPayload[] = result.rows.map(row => {
        const baseData: LactateWebhookPayload = {
          timestamp: row.timestamp,
          load: row.load,
          theoreticalLoad: row.theoreticalLoad,
          power: row.load, // Backward compatibility
          lactate: parseFloat(row.lactate),
          heartRate: row.heartRate,
          sessionId: testId,
          testId: testId,
          testType: 'incremental',
          stage: row.stage,
          duration: row.duration,
          rrSystolic: row.rrSystolic,
          rrDiastolic: row.rrDiastolic,
          isFinalApproximation: row.isFinalApproximation,
          notes: row.notes,
          unit: row.unit,
          device: row.device
        }
        
        return baseData
      })

      // Sync memory cache with database
      dataStore.set(sessionId, dbData)

      // Build response with optional metadata
      const response: any = {
        sessionId: sessionId,
        testId: testId,
        data: dbData,
        totalPoints: dbData.length,
        lastUpdated: dbData.length > 0 ? dbData[dbData.length - 1].timestamp : null,
        source: 'postgresql'
      }
      
      // Include metadata if requested
      if (includeMetadata && result.rows.length > 0) {
        response.metadata = {
          stage_duration_min: result.rows[0].stage_duration_min,
          unit: result.rows[0].unit,
          device: result.rows[0].device
        }
      }

      return NextResponse.json(response)
    } finally {
      client.release()
    }
  } catch (dbError) {
    console.error('PostgreSQL error, falling back to memory:', dbError)
    
    // Fallback to memory data
    const sessionData = dataStore.get(sessionId) || []
    return NextResponse.json({
      sessionId: sessionId,
      testId: testId,
      data: sessionData,
      totalPoints: sessionData.length,
      lastUpdated: sessionData.length > 0 ? sessionData[sessionData.length - 1].timestamp : null,
      source: 'memory_fallback'
    })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') || searchParams.get('testId')
  const testId = sessionId
  const stageNumber = searchParams.get('stage')

  try {
    const client = await pool.connect()
    try {
      if (testId && stageNumber) {
        // Delete specific stage from PostgreSQL
        await client.query('DELETE FROM stages WHERE test_id = $1 AND stage = $2', [testId, parseInt(stageNumber)])
        
        return NextResponse.json({
          success: true,
          message: `Stage ${stageNumber} of test ${testId} deleted from database`,
          source: 'postgresql'
        })
      } else if (testId) {
        // Delete specific test and its stages from PostgreSQL
        // Note: stages will be cascade deleted via FK constraint
        await client.query('DELETE FROM adjusted_thresholds WHERE test_id = $1', [testId])
        await client.query('DELETE FROM stages WHERE test_id = $1', [testId])
        await client.query('DELETE FROM test_infos WHERE test_id = $1', [testId])
        
        // Also delete from memory
        dataStore.delete(testId)
        

        return NextResponse.json({
          success: true,
          message: `Test ${testId} data cleared from database`,
          source: 'postgresql'
        })
      } else {
        // Clear all tests from PostgreSQL
        await client.query('DELETE FROM adjusted_thresholds')
        await client.query('DELETE FROM stages')
        await client.query('DELETE FROM test_infos')
        
        // Also clear memory
        dataStore.clear()
        
        return NextResponse.json({
          success: true,
          message: 'All test data cleared from database',
          source: 'postgresql'
        })
      }
    } finally {
      client.release()
    }
  } catch (dbError) {
    console.error('PostgreSQL error during deletion:', dbError)
    
    // Fallback to memory deletion
    if (testId) {
      dataStore.delete(testId)
      return NextResponse.json({
        success: true,
        message: `Test ${testId} data cleared from memory (DB error)`,
        source: 'memory_fallback'
      })
    } else {
      dataStore.clear()
      return NextResponse.json({
        success: true,
        message: 'All test data cleared from memory (DB error)',
        source: 'memory_fallback'
      })
    }
  }
}