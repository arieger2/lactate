import { NextRequest, NextResponse } from 'next/server'

// POST - Receive automatic measurement data from external devices
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, measurementData, customerId, sessionId: externalSessionId } = body
    
    // Validate required fields
    if (!measurementData || !Array.isArray(measurementData)) {
      return NextResponse.json({
        success: false,
        error: 'measurementData array is required'
      }, { status: 400 })
    }
    
    // Validate measurement format - each measurement must have key values
    for (const measurement of measurementData) {
      if (typeof measurement.lactate !== 'number' || measurement.lactate < 0) {
        return NextResponse.json({
          success: false,
          error: 'Invalid lactate value in measurement data'
        }, { status: 400 })
      }
      if (typeof measurement.power !== 'number' || measurement.power < 0) {
        return NextResponse.json({
          success: false,
          error: 'Invalid power value in measurement data'
        }, { status: 400 })
      }
    }
    
    // Use provided sessionId or generate new one
    const sessionId = externalSessionId || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Process each measurement
    const processedData = []
    
    for (const measurement of measurementData) {
      // Extract key values (required)
      const keyValues = {
        lactate: measurement.lactate,
        power: measurement.power,
        sampleId: measurement.sampleId || measurement.SampleID || measurement.sample_id,
        heartRate: measurement.heartRate || measurement.hr
      }
      
      // Extract metadata (optional device data)
      const metadata = measurement.metadata || {}
      
      const processedMeasurement = {
        timestamp: measurement.timestamp || new Date().toISOString(),
        // Key values
        ...keyValues,
        // Metadata from nested object or flat structure
        glucose: metadata.glucose || metadata.Glucose || measurement.glucose,
        ph: metadata.ph || metadata.pH || measurement.ph,
        temperature: metadata.temperature || metadata.Temperature || measurement.temperature,
        measurementDate: metadata.measurementDate || metadata.Date || metadata.date || measurement.measurementDate,
        measurementTime: metadata.measurementTime || metadata.Time || metadata.time || measurement.measurementTime,
        errorCode: metadata.errorCode || metadata.error_code || measurement.errorCode,
        vo2: metadata.vo2 || measurement.vo2,
        rawData: metadata.rawData || measurement.rawData,
        // Session info
        sessionId,
        testType: measurement.testType || 'automatic',
        customerId,
        deviceId,
        fatOxidation: measurement.vo2 ? measurement.vo2 / 100 : (metadata.vo2 ? metadata.vo2 / 100 : undefined)
      }
      
      // Send to lactate webhook endpoint for storage
      const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/lactate-webhook?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedMeasurement)
      })
      
      if (!webhookResponse.ok) {
        throw new Error(`Failed to store measurement: ${webhookResponse.statusText}`)
      }
      
      processedData.push(processedMeasurement)
    }
    

    
    return NextResponse.json({
      success: true,
      sessionId,
      processedCount: processedData.length,
      measurements: processedData,
      message: `Successfully processed ${processedData.length} measurements`
    })
    
  } catch (error) {
    console.error('❌ Error processing automatic measurement data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process measurement data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Check device interface status and get example format
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('deviceId')
  
  return NextResponse.json({
    success: true,
    status: 'Interface ready for automatic data reception',
    deviceId: deviceId || 'not-provided',
    dataStructure: {
      description: 'Each measurement has KEY VALUES (required) and optional METADATA',
      keyValues: {
        lactate: 'number (mmol/L) - REQUIRED',
        power: 'number (watts) - REQUIRED', 
        sampleId: 'string - sample/measurement ID from device',
        heartRate: 'number (bpm) - heart rate'
      },
      metadata: {
        glucose: 'number (mmol/L) - blood glucose if available',
        ph: 'number - pH value if available',
        temperature: 'number (°C) - measurement temperature',
        measurementDate: 'string (YYYY-MM-DD) - date of measurement',
        measurementTime: 'string (HH:MM:SS) - time of measurement',
        errorCode: 'string|null - error code if measurement failed',
        vo2: 'number (mL/kg/min) - VO2 if available',
        rawData: 'object - any additional device-specific data'
      }
    },
    exampleRequest: {
      deviceId: 'lactate-pro-2',
      customerId: '100',
      sessionId: 'optional-session-id',
      measurementData: [
        {
          // Key values (lactate, power, sampleId, heartRate)
          lactate: 1.3,
          power: 150,
          sampleId: '001',
          heartRate: 128,
          // Metadata (optional)
          metadata: {
            glucose: 5.2,
            ph: 7.38,
            temperature: 37.2,
            measurementDate: '2024-11-25',
            measurementTime: '10:30:15',
            errorCode: null,
            vo2: 42.5
          }
        },
        {
          lactate: 2.0,
          power: 200,
          sampleId: '002',
          heartRate: 145,
          metadata: {
            glucose: 5.5
          }
        }
      ]
    },
    flatFormatAlsoSupported: {
      description: 'Metadata can also be provided at measurement level (flat structure)',
      example: {
        lactate: 1.3,
        power: 150,
        sampleId: '001',
        heartRate: 128,
        glucose: 5.2,
        ph: 7.38,
        temperature: 37.2
      }
    },
    endpoints: {
      POST: '/api/device-interface - Send measurement data',
      GET: '/api/device-interface?deviceId=your-device - Get status and format'
    }
  })
}