import { NextRequest, NextResponse } from 'next/server'

/**
 * AI-Analyse Webhook Endpoint
 *
 * Forwards lactate session data to the n8n workflow:
 *   Webhook Input → AI Decision Agent → Switch → Specialist AI → Respond to Webhook
 *
 * The n8n webhook path is: POST /webhook/lactate-analytics
 * The payload uses { data: {...} } so n8n expressions like {{ $json.data }} work.
 *
 * Expected response from n8n specialist agents:
 * {
 *   "output": "...",           // raw AI text
 *   "lt1": { "power": 180, "lactate": 2.1 },  // optional structured
 *   "lt2": { "power": 250, "lactate": 4.0 },  // optional structured
 *   "method": "dickhuth",     // optional — which specialist handled it
 *   "zones": [...]            // optional
 * }
 */

interface ThresholdPoint {
  power: number
  lactate: number
}

interface AIAnalysisResult {
  lt1?: ThresholdPoint
  lt2?: ThresholdPoint
  method?: string
  zones?: unknown[]
  reasoning?: string
  raw?: unknown
}

/**
 * Try to extract structured threshold data from the n8n agent response.
 * The agent may return JSON embedded in its text output, or a top-level object.
 */
function parseAgentResponse(responseData: unknown): AIAnalysisResult {
  if (!responseData || typeof responseData !== 'object') {
    return { raw: responseData }
  }

  const data = responseData as Record<string, unknown>

  // Direct structured response
  if (data.lt1 || data.lt2) {
    return {
      lt1: data.lt1 as ThresholdPoint | undefined,
      lt2: data.lt2 as ThresholdPoint | undefined,
      method: data.method as string | undefined,
      zones: data.zones as unknown[] | undefined,
      reasoning: data.output as string | undefined,
      raw: data
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
            lt1: parsed.lt1 as ThresholdPoint | undefined,
            lt2: parsed.lt2 as ThresholdPoint | undefined,
            method: parsed.method as string | undefined,
            zones: parsed.zones as unknown[] | undefined,
            reasoning: data.output,
            raw: data
          }
        }
      } catch {
        // JSON parse failed — return raw output as reasoning
      }
    }
    return { reasoning: data.output, raw: data }
  }

  return { raw: data }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { method, unit, testData, sessionId, customerId, customerName, currentLt1, currentLt2 } = body

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

    const payload = {
      data: {
        sessionId,
        customerId,
        customerName,
        unit,
        currentMethod: method,
        lactateData: testData,
        currentThresholds: {
          lt1: currentLt1 ?? null,
          lt2: currentLt2 ?? null
        },
        timestamp: new Date().toISOString()
      }
    }

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000) // 2 min — o1 model can be slow
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
    const parsed = parseAgentResponse(rawResult)

    return NextResponse.json({
      success: true,
      lt1: parsed.lt1 ?? null,
      lt2: parsed.lt2 ?? null,
      method: parsed.method ?? null,
      zones: parsed.zones ?? null,
      reasoning: parsed.reasoning ?? null,
      raw: parsed.raw
    })

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { success: false, message: 'AI-Analyse Timeout (>2 min)' },
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
