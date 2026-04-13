/**
 * Lactate Curve Smoother — public API wrapper around fitLactateCurve
 *
 * Public types / function signature are unchanged so all consumers compile
 * without modification. The internal algorithm has been replaced with
 * fitLactateCurve which selects between three fitting modes based on the
 * slope of the first data segment:
 *
 *   · full_exponential      — rising from the very first point
 *   · piecewise_flat_start  — flat/near-flat initial segment + exponential tail
 *   · negative_start_turn   — falling initial segment + exponential tail
 */

// ── Public types (unchanged) ──────────────────────────────────────────────────

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

// ── Internal types ────────────────────────────────────────────────────────────

interface Pt { x: number; y: number }

interface FitCfg {
  fineSteps:            number
  horizontalThreshold:  number
  expA_Min:             number
  expA_Max:             number
  expA_Step:            number
  expK_Min:             number
  expK_Max:             number
  expK_Step:            number
}

interface FitBase {
  mode:  string
  err:   number
  curve: (x: number) => number
  // fields that may or may not be present depending on mode
  x0?:    number
  y0?:    number
  A?:     number
  k?:     number
  m?:     number
  b?:     number
  xBreak?: number
  yBreak?: number
  xMin?:   number
  yMin?:   number
}

interface FitResult {
  horizontalThreshold: number
  firstSegmentSlope:   number
  fit:                 FitBase
  grid:                Pt[]
}

// ── Core algorithm ────────────────────────────────────────────────────────────

function fitLactateCurve(
  data: Array<{ x: number | string; y: number | string }>,
  options: Partial<FitCfg> = {},
): FitResult {
  const cfg: FitCfg = {
    fineSteps:           options.fineSteps           ?? 400,
    horizontalThreshold: options.horizontalThreshold ?? 0.005,
    expA_Min:            options.expA_Min            ?? 0.01,
    expA_Max:            options.expA_Max            ?? 6.0,
    expA_Step:           options.expA_Step           ?? 0.01,
    expK_Min:            options.expK_Min            ?? 0.0005,
    expK_Max:            options.expK_Max            ?? 1.5,
    expK_Step:           options.expK_Step           ?? 0.0005,
  }

  const pts: Pt[] = [...data]
    .map(d => ({ x: Number(d.x), y: Number(d.y) }))
    .sort((a, b) => a.x - b.x)

  if (pts.length < 4) throw new Error('At least 4 data points required.')

  function linearRegression(subset: Pt[]): { m: number; b: number } {
    const n   = subset.length
    const sx  = subset.reduce((a, p) => a + p.x, 0)
    const sy  = subset.reduce((a, p) => a + p.y, 0)
    const sxx = subset.reduce((a, p) => a + p.x * p.x, 0)
    const sxy = subset.reduce((a, p) => a + p.x * p.y, 0)
    const den = n * sxx - sx * sx
    const m   = Math.abs(den) < 1e-12 ? 0 : (n * sxy - sx * sy) / den
    const b   = (sy - m * sx) / n
    return { m, b }
  }

  function localSlope(p1: Pt, p2: Pt): number {
    const dx = p2.x - p1.x
    return Math.abs(dx) < 1e-12 ? 0 : (p2.y - p1.y) / dx
  }

  function fitExpTail(
    tailPts: Pt[],
    xBreak: number,
    yBreak: number,
  ): { A: number; k: number; err: number } {
    if (tailPts.length < 2) return { A: 0.1, k: 0.3, err: Infinity }

    let best = { A: 0.1, k: 0.3, err: Infinity }

    for (let A = cfg.expA_Min; A <= cfg.expA_Max + 1e-12; A += cfg.expA_Step) {
      for (let k = cfg.expK_Min; k <= cfg.expK_Max + 1e-12; k += cfg.expK_Step) {
        let err = 0
        for (const p of tailPts) {
          const yHat = yBreak + A * (Math.exp(k * (p.x - xBreak)) - 1)
          err += (p.y - yHat) ** 2
        }
        if (err < best.err) best = { A, k, err }
      }
    }

    return best
  }

  function fitExpFromStart(points: Pt[]): FitBase {
    const x0 = points[0].x
    const y0 = points[0].y

    let best = { A: 0.1, k: 0.2, err: Infinity }

    for (let A = cfg.expA_Min; A <= cfg.expA_Max + 1e-12; A += cfg.expA_Step) {
      for (let k = cfg.expK_Min; k <= cfg.expK_Max + 1e-12; k += cfg.expK_Step) {
        let err = 0
        for (const p of points) {
          const yHat = y0 + A * (Math.exp(k * (p.x - x0)) - 1)
          err += (p.y - yHat) ** 2
        }
        if (err < best.err) best = { A, k, err }
      }
    }

    const { A, k } = best
    return {
      mode:  'full_exponential',
      x0, y0, A, k,
      err:   best.err,
      curve: (x: number) => y0 + A * (Math.exp(k * (x - x0)) - 1),
    }
  }

  function fitPiecewiseFlatStart(points: Pt[]): FitBase {
    const s2       = localSlope(points[1], points[2])
    const breakIdx = Math.abs(s2) <= cfg.horizontalThreshold ? 2 : 1

    const baseline = points.slice(0, breakIdx + 1)
    const tail     = points.slice(breakIdx + 1)

    const { m, b } = linearRegression(baseline)
    const xBreak   = baseline[baseline.length - 1].x
    const yBreak   = m * xBreak + b

    const bestTail = fitExpTail(tail, xBreak, yBreak)
    const { A, k } = bestTail

    const curveFn = (x: number) =>
      x <= xBreak ? m * x + b : yBreak + A * (Math.exp(k * (x - xBreak)) - 1)

    let totalErr = 0
    for (const p of points) totalErr += (p.y - curveFn(p.x)) ** 2

    return { mode: 'piecewise_flat_start', xBreak, yBreak, m, b, A, k, err: totalErr, curve: curveFn }
  }

  function fitNegativeStartTurn(points: Pt[]): FitBase | null {
    let bestModel: FitBase | null = null

    for (let minIdx = 1; minIdx <= points.length - 2; minIdx++) {
      const left  = points.slice(0, minIdx + 1)
      const right = points.slice(minIdx + 1)

      const { m, b } = linearRegression(left)
      const xMin = left[left.length - 1].x
      const yMin = m * xMin + b

      if (m >= -cfg.horizontalThreshold) continue

      const bestTail = fitExpTail(right, xMin, yMin)
      const { A, k } = bestTail

      const curveFn = (x: number) =>
        x <= xMin ? m * x + b : yMin + A * (Math.exp(k * (x - xMin)) - 1)

      let totalErr = 0
      for (const p of points) totalErr += (p.y - curveFn(p.x)) ** 2

      const model: FitBase = { mode: 'negative_start_turn', xMin, yMin, m, b, A, k, err: totalErr, curve: curveFn }
      if (!bestModel || model.err < bestModel.err) bestModel = model
    }

    return bestModel
  }

  const s1 = localSlope(pts[0], pts[1])

  let fit: FitBase
  if (Math.abs(s1) <= cfg.horizontalThreshold) {
    fit = fitPiecewiseFlatStart(pts)
  } else if (s1 > 0) {
    fit = fitExpFromStart(pts)
  } else {
    fit = fitNegativeStartTurn(pts) ?? fitExpFromStart(pts)
  }

  const xMin = pts[0].x
  const xMax = pts[pts.length - 1].x
  const grid: Pt[] = []
  for (let i = 0; i <= cfg.fineSteps; i++) {
    const x = xMin + (xMax - xMin) * (i / cfg.fineSteps)
    grid.push({ x, y: fit.curve(x) })
  }

  return { horizontalThreshold: cfg.horizontalThreshold, firstSegmentSlope: s1, fit, grid }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function smoothLactateCurve(
  rawData: Array<{ power: number | string; lactate: number | string }>,
  options: {
    fineSteps?:           number
    horizontalThreshold?: number
  } = {},
): SmoothResult | null {
  if (!rawData || rawData.length < 4) return null

  let result: FitResult
  try {
    const pts = rawData.map(d => ({
      x: parseFloat(String(d.power   ?? 0)),
      y: parseFloat(String(d.lactate ?? 0)),
    })).filter(p => p.x > 0 && p.y > 0)

    if (pts.length < 4) return null
    result = fitLactateCurve(pts, options)
  } catch {
    return null
  }

  const { fit, grid, firstSegmentSlope } = result

  // Map grid → SmoothedPoint[]
  const smoothedCurve: SmoothedPoint[] = grid.map(p => ({
    power:   Math.round(p.x * 100) / 100,
    lactate: Math.round(Math.max(0.1, p.y) * 1000) / 1000,
  }))

  // Derive SmoothModel fields from fit
  const early_phase: 'flat' | 'slight_fall' | 'slight_rise' =
    fit.mode === 'negative_start_turn' ? 'slight_fall'
    : Math.abs(firstSegmentSlope) <= result.horizontalThreshold ? 'flat'
    : 'slight_rise'

  const v_break =
    fit.xBreak ?? fit.xMin ?? fit.x0 ?? smoothedCurve[0]?.power ?? 0

  const yBreak =
    fit.yBreak ?? fit.yMin ?? fit.y0 ?? smoothedCurve[0]?.lactate ?? 0

  const m = fit.m ?? 0
  const b = fit.b ?? (fit.y0 ?? 0)
  const A = fit.A ?? 0
  const k = fit.k ?? 0
  const xFirst = smoothedCurve[0]?.power ?? 0

  const smoothModel: SmoothModel = {
    model:       fit.mode,
    fit_ok:      true,
    early_phase,
    v_break:     Math.round(v_break * 100) / 100,
    params: {
      L0:     Math.round((m * xFirst + b) * 10000) / 10000,
      m:      Math.round(m               * 10000) / 10000,
      A:      Math.round(A               * 10000) / 10000,
      k:      Math.round(k               * 10000) / 10000,
      yBreak: Math.round(yBreak          * 10000) / 10000,
    },
  }

  return { smoothedCurve, smoothModel }
}
