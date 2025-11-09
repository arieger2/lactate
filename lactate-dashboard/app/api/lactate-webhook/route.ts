import { NextRequest, NextResponse } from 'next/server'

interface LactateWebhookPayload {
  timestamp?: string
  power: number // Watts
  lactate: number // mmol/L
  heartRate?: number // bpm
  fatOxidation?: number // g/min
  sessionId?: string
  testType?: 'incremental' | 'steady-state'
}

// In a production environment, you would store this data in a database
// For this example, we'll use an in-memory store
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

    // Store the data (in production, save to database)
    const sessionId = dataEntry.sessionId!
    if (!dataStore.has(sessionId)) {
      dataStore.set(sessionId, [])
    }
    dataStore.get(sessionId)!.push(dataEntry)

    // Log the received data for debugging
    console.log('Received lactate data:', dataEntry)

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

  const sessionData = dataStore.get(sessionId) || []

  return NextResponse.json({
    sessionId: sessionId,
    data: sessionData,
    totalPoints: sessionData.length,
    lastUpdated: sessionData.length > 0 ? sessionData[sessionData.length - 1].timestamp : null
  })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (sessionId) {
    dataStore.delete(sessionId)
    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} data cleared`
    })
  } else {
    // Clear all sessions
    dataStore.clear()
    return NextResponse.json({
      success: true,
      message: 'All session data cleared'
    })
  }
}