import { NextRequest, NextResponse } from 'next/server'
import { lactateDataService } from '@/lib/lactateDataService'

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
    
    // Validate measurement format
    for (const measurement of measurementData) {
      if (typeof measurement.lactate !== 'number' || measurement.lactate < 0) {
        return NextResponse.json({
          success: false,
          error: 'Invalid lactate value in measurement data'
        }, { status: 400 })
      }
    }
    
    // Use provided sessionId or generate new one
    const sessionId = externalSessionId || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Process each measurement
    const processedData = []
    
    for (const measurement of measurementData) {
      const processedMeasurement = {
        timestamp: measurement.timestamp || new Date().toISOString(),
        power: measurement.power || measurement.workload || 0,
        lactate: measurement.lactate,
        heartRate: measurement.heartRate || measurement.hr,
        fatOxidation: measurement.fatOxidation || (measurement.vo2 ? measurement.vo2 / 100 : undefined),
        sessionId,
        testType: measurement.testType || 'automatic',
        customerId,
        deviceId
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
    
    console.log(`✅ Processed ${processedData.length} automatic measurements for session: ${sessionId}`)
    
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
    supportedFormats: {
      minimumRequired: {
        measurementData: [
          {
            lactate: 2.5, // Required: mmol/L
          }
        ]
      },
      fullFormat: {
        deviceId: 'device-123',
        customerId: 'customer-456', 
        sessionId: 'optional-session-id', // If not provided, will be auto-generated
        measurementData: [
          {
            timestamp: '2024-11-25T10:30:00.000Z', // Optional: ISO string
            lactate: 2.5, // Required: mmol/L  
            power: 200, // Optional: watts
            workload: 200, // Alternative to power
            heartRate: 150, // Optional: bpm
            hr: 150, // Alternative to heartRate
            vo2: 40.5, // Optional: mL/kg/min
            fatOxidation: 0.405, // Optional: direct value
            testType: 'incremental' // Optional: test type
          }
        ]
      }
    },
    endpoints: {
      POST: '/api/device-interface - Send measurement data',
      GET: '/api/device-interface?deviceId=your-device - Get status and format'
    }
  })
}