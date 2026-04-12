/**
 * Lactate Curve Smoother — Piecewise Hybrid Model
 *
 * Phase 1: Linear baseline  L(v) = m·v + b
 *   - weak rise (< weakRiseThreshold) → forced flat (m = 0)
 *   - slight fall → kept as-is
 * Phase 2: Exponential rise  L(v) = yBreak + A·(exp(k·(v − vBreak)) − 1)
 *   fitted via brute-force grid search over (A, k)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SmoothedPoint {
  power:   number
  lactate: number
}

export interface SmoothModel {
  model:       string
  fit_ok:      boolean
  early_phase: 'flat' | 'slight_fall' | 'slight_rise'
  v_break:     number
  params: { L0: number; m: number; A: number; k: number; yBreak: number }
}

export interface SmoothResult {
  smoothedCurve: SmoothedPoint[]
  smoothModel:   SmoothModel
}

// ── Internal helpers ──────────────────────────────────────────────────────────

interface Pt { x: number; y: number }

function linearRegression(pts: Pt[]): { m: number; b: number } {
  const n   = pts.length
  const sx  = pts.reduce((a, p) => a + p.x, 0)
  const sy  = pts.reduce((a, p) => a + p.y, 0)
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0)
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0)
  const det = n * sxx - sx * sx
  const m   = Math.abs(det) < 1e-12 ? 0 : (n * sxy - sx * sy) / det
  const b   = (sy - m * sx) / n
  return { m, b }
}

function detectBaselineEnd(
  pts: Pt[],
  weakRiseThreshold: number,
  sustainedRiseCount: number,
  baselinePointsMin:  number,
): number {
  if (pts.length <= baselinePointsMin) return baselinePointsMin - 1

  for (let i = baselinePointsMin - 1; i < pts.length - sustainedRiseCount; i++) {
    const baseline        = pts.slice(0, i + 1)
    const { m, b }        = linearRegression(baseline)
    let   sustainedRise   = true
    let   prevY           = baseline[baseline.length - 1].y

    for (let j = 1; j <= sustainedRiseCount; j++) {
      const p    = pts[i + j]
      const pred = m * p.x + b
      if (p.y <= prevY || p.y <= pred + 0.05) { sustainedRise = false; break }
      prevY = p.y
    }

    if (sustainedRise) return i
  }

  return baselinePointsMin - 1
}

function fitExponentialTail(
  pts:    Pt[],
  xBreak: number,
  yBreak: number,
  yMax:   number,
): { A: number; k: number } {
  const tail = pts.filter(p => p.x > xBreak)
  if (tail.length < 2) return { A: 0.1, k: 0.3 }

  // Dynamic A ceiling: must be able to reach the highest observed lactate
  const aMax = Math.max(3.0, (yMax - yBreak) * 1.5)

  let best = { A: 0.1, k: 0.3, err: Infinity }

  for (let ai = 1; ai <= 150; ai++) {
    const A = aMax * ai / 150
    for (let ki = 1; ki <= 80; ki++) {
      const k = 0.01 + 1.5 * ki / 80
      let err = 0
      for (const p of tail) {
        const yHat = yBreak + A * (Math.exp(k * (p.x - xBreak)) - 1)
        err += (p.y - yHat) ** 2
      }
      if (err < best.err) best = { A, k, err }
    }
  }

  return { A: best.A, k: best.k }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function smoothLactateCurve(
  rawData: Array<{ power: number | string; lactate: number | string }>,
  options: {
    weakRiseThreshold?: number
    sustainedRiseCount?: number
    baselinePointsMin?:  number
    outputPoints?:       number
  } = {},
): SmoothResult | null {
  const weakRiseThreshold = options.weakRiseThreshold ?? 0.08
  const sustainedRiseCount = options.sustainedRiseCount ?? 2
  const baselinePointsMin  = options.baselinePointsMin  ?? 3
  const outputPoints       = options.outputPoints        ?? 50

  const pts: Pt[] = rawData
    .map(d => ({ x: parseFloat(String(d.power ?? 0)), y: parseFloat(String(d.lactate ?? 0)) }))
    .filter(d => d.x > 0 && d.y > 0)
    .sort((a, b) => a.x - b.x)

  if (pts.length < 4) return null

  const xMin  = pts[0].x
  const xLast = pts[pts.length - 1].x
  // Extend slightly beyond last point so the curve visually reaches it
  const xStep = pts.length > 1 ? pts[pts.length - 1].x - pts[pts.length - 2].x : 1
  const xMax  = xLast + xStep * 0.3
  const yMax  = Math.max(...pts.map(p => p.y))

  // ── 1. Detect baseline end ────────────────────────────────────────────────
  const baselineEndIdx = detectBaselineEnd(pts, weakRiseThreshold, sustainedRiseCount, baselinePointsMin)
  const baselinePts    = pts.slice(0, baselineEndIdx + 1)

  // ── 2. Fit baseline (linear regression) ──────────────────────────────────
  let { m, b } = linearRegression(baselinePts)

  // Weak positive rise → treat as flat
  if (m > 0 && m < weakRiseThreshold) {
    m = 0
    b = baselinePts.reduce((a, p) => a + p.y, 0) / baselinePts.length
  }
  // Slight fall stays as-is

  // ── 3. Breakpoint ─────────────────────────────────────────────────────────
  const xBreak = pts[baselineEndIdx].x
  const yBreak = m * xBreak + b

  // ── 4. Fit exponential tail ───────────────────────────────────────────────
  const { A, k } = fitExponentialTail(pts, xBreak, yBreak, yMax)

  // ── 5. Piecewise curve function ───────────────────────────────────────────
  function curve(x: number): number {
    if (x <= xBreak) return m * x + b
    return yBreak + A * (Math.exp(k * (x - xBreak)) - 1)
  }

  // ── 6. Generate output points ─────────────────────────────────────────────
  const smoothedCurve: SmoothedPoint[] = []
  for (let i = 0; i < outputPoints; i++) {
    const x = xMin + (xMax - xMin) * i / (outputPoints - 1)
    smoothedCurve.push({
      power:   Math.round(x                    * 100) / 100,
      lactate: Math.round(Math.max(0.1, curve(x)) * 1000) / 1000,
    })
  }

  const earlyPhase = m === 0 ? 'flat' : m < 0 ? 'slight_fall' : 'slight_rise'

  return {
    smoothedCurve,
    smoothModel: {
      model:       'piecewise_hybrid',
      fit_ok:      true,
      early_phase: earlyPhase,
      v_break:     Math.round(xBreak * 100) / 100,
      params: {
        L0:     Math.round((m * xMin + b) * 10000) / 10000,
        m:      Math.round(m              * 10000) / 10000,
        A:      Math.round(A              * 10000) / 10000,
        k:      Math.round(k              * 10000) / 10000,
        yBreak: Math.round(yBreak         * 10000) / 10000,
      },
    },
  }
}
