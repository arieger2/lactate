import { NextRequest, NextResponse } from 'next/server'
import { AIAnalysisResponse } from '@/lib/types'
import { smoothLactateCurve } from '@/lib/lactateCurveSmoother'

/**
 * AI-Analyse Webhook Endpoint
 *
 * Forwards lactate session data to the n8n workflow:
 *   Webhook → Parse Context → Fan Out → Method Specialists → Aggregate → Compose → Respond
 *
 * Optional fields: vt1, vt2, vo2max
 * Extended response: curve (fitted lactate curve), vt1, vt2, vo2max, reasoning
 */

function parseAgentResponse(responseData: unknown): AIAnalysisResponse {
  if (!responseData || typeof responseData !== 'object') {
    return { lt1: null, lt2: null, method: null, reasoning: null }
  }

  const data = responseData as Record<string, unknown>

  // Direct structured response (lt1/lt2 at top level)
  if (data.lt1 || data.lt2) {
    return {
      lt1:     data.lt1     as AIAnalysisResponse['lt1'],
      lt2:     data.lt2     as AIAnalysisResponse['lt2'],
      vt1:     (data.vt1    as AIAnalysisResponse['vt1'])    ?? null,
      vt2:     (data.vt2    as AIAnalysisResponse['vt2'])    ?? null,
      vo2max:  (data.vo2max as number | null)                 ?? null,
      curve:   (data.curve  as AIAnalysisResponse['curve'])  ?? undefined,
      method:  data.method  as string | undefined             ?? null,
      reasoning: (data.reasoning ?? data.output) as string | undefined ?? null,
      methods: (data.methods as AIAnalysisResponse['methods']) ?? undefined,
    }
  }

  // Agent output field — try to parse embedded JSON
  if (typeof data.output === 'string') {
    const jsonMatch = data.output.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
        if (parsed.lt1 || parsed.lt2) {
          return {
            lt1:      parsed.lt1     as AIAnalysisResponse['lt1'],
            lt2:      parsed.lt2     as AIAnalysisResponse['lt2'],
            vt1:     (parsed.vt1    as AIAnalysisResponse['vt1'])   ?? null,
            vt2:     (parsed.vt2    as AIAnalysisResponse['vt2'])   ?? null,
            vo2max:  (parsed.vo2max as number | null)                ?? null,
            curve:   (parsed.curve  as AIAnalysisResponse['curve']) ?? undefined,
            method:   parsed.method as string | undefined            ?? null,
            reasoning: data.output,
          }
        }
      } catch {
        // JSON parse failed
      }
    }
    return { lt1: null, lt2: null, method: null, reasoning: data.output }
  }

  return { lt1: null, lt2: null, method: null, reasoning: null }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      method, unit, testData, sessionId, customerId, customerName,
      currentLt1, currentLt2,
      vt1, vt2, vo2max,
      zoneModel, stepCount, testDevice
    } = body

    if (!testData || !Array.isArray(testData) || testData.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Testdaten erforderlich' },
        { status: 400 }
      )
    }

    const webhookUrl = process.env.N8N_LACTATE_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, message: 'N8N_LACTATE_WEBHOOK_URL nicht konfiguriert' },
        { status: 503 }
      )
    }

    const smooth = smoothLactateCurve(testData)

    const payload = {
      data: {
        sessionId,
        customerId,
        customerName,
        unit,
        currentMethod: method,
        lactateData: testData,
        smoothedCurve: smooth?.smoothedCurve ?? null,
        smoothModel:   smooth?.smoothModel   ?? null,
        currentThresholds: {
          lt1: currentLt1 ?? null,
          lt2: currentLt2 ?? null,
        },
        // Optional ventilatory / VO2 context
        vt1:    vt1    ?? null,
        vt2:    vt2    ?? null,
        vo2max: vo2max ?? null,
        zoneModel:  zoneModel  ?? '5-zones',
        stepCount:  stepCount  ?? testData.length,
        testDevice: testDevice ?? 'bike',
        timestamp: new Date().toISOString(),
      }
    }

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180_000), // 3 min — multi-agent pipeline
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('n8n webhook error:', n8nResponse.status, errorText)
      return NextResponse.json(
        { success: false, message: `n8n Fehler: ${n8nResponse.status} ${n8nResponse.statusText}` },
        { status: 502 }
      )
    }

    const rawResult = await n8nResponse.json()

    // If n8n workflow returned an explicit failure (e.g. agent quota error), pass it through
    if (rawResult && rawResult.success === false) {
      return NextResponse.json(
        { success: false, message: rawResult.message || 'AI-Analyse fehlgeschlagen' },
        { status: 200 }
      )
    }

    const parsed = parseAgentResponse(rawResult)

    return NextResponse.json({
      success:   true,
      lt1:       parsed.lt1       ?? null,
      lt2:       parsed.lt2       ?? null,
      vt1:       parsed.vt1       ?? null,
      vt2:       parsed.vt2       ?? null,
      vo2max:    parsed.vo2max    ?? null,
      curve:     parsed.curve     ?? null,
      method:    parsed.method    ?? null,
      reasoning: parsed.reasoning ?? null,
      methods:   parsed.methods   ?? null,
    })

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { success: false, message: 'AI-Analyse Timeout (>3 min)' },
        { status: 504 }
      )
    }
    console.error('Error in AI analysis endpoint:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
