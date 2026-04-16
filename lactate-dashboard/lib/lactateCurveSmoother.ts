/**
 * Lactate Curve Smoother — public API wrapper around fitLactateCurve
 *
 * Routing rules based on s1 / s2:
 *   Rule 1a (s1 < 0, s2 >= threshold or short) → smooth_minimum_curve
 *   Rule 1b (s1 < 0, s2 < threshold, long)     → hybrid_polynomial
 *   Rule 2  (s1 > threshold)                   → pure_cubic
 *   Rule 3  (|s2| <= threshold)                → linear_cubic_tail at breakIdx 2
 *   Rule 4  (else)                             → linear_cubic_tail at breakIdx 1
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
  fineSteps:           number
  horizontalThreshold: number
  betaMin:             number
  betaMax:             number
  betaStep:            number
  hybridBreakIndex:    number
}

interface FitBase {
  mode:      string
  err:       number
  curve:     (x: number) => number
  // smooth_minimum_curve
  xMin?:     number
  yMin?:     number
  minIdx?:   number
  alpha?:    number
  beta?:     number
  // pure_cubic
  a3?:       number
  a2?:       number
  a1?:       number
  a0?:       number
  // linear_cubic_tail / hybrid_polynomial
  xBreak?:   number
  yBreak?:   number
  breakIdx?: number
  slope?:    number
  a?:        number
  b?:        number
  c?:        number
  d?:        number
}

interface FitResult {
  firstSegmentSlope:  number
  secondSegmentSlope: number
  fit:                FitBase
  grid:               Pt[]
}

// ── Core algorithm ────────────────────────────────────────────────────────────

function fitLactateCurve(
  data: Array<{ x: number | string; y: number | string }>,
  options: Partial<FitCfg> = {},
): FitResult {
  const cfg: FitCfg = {
    fineSteps:           options.fineSteps           ?? 400,
    horizontalThreshold: options.horizontalThreshold ?? 0.005,
    betaMin:             options.betaMin             ?? 0.0,
    betaMax:             options.betaMax             ?? 0.001,
    betaStep:            options.betaStep            ?? 0.000001,
    hybridBreakIndex:    options.hybridBreakIndex    ?? 3,
  }

  const pts: Pt[] = [...data]
    .map(d => ({ x: Number(d.x), y: Number(d.y) }))
    .sort((a, b) => a.x - b.x)

  if (pts.length < 4) throw new Error('At least 4 data points required.')

  // ── Helpers ───────────────────────────────────────────────────────────────

  function localSlope(p1: Pt, p2: Pt): number {
    const dx = p2.x - p1.x
    return Math.abs(dx) < 1e-12 ? 0 : (p2.y - p1.y) / dx
  }

  /** Gauss-Jordan elimination with partial pivoting for 4×4 systems */
  function solve4x4(M: number[][], v: number[]): number[] {
    const a = M.map((row, i) => [...row, v[i]])
    for (let i = 0; i < 4; i++) {
      let maxRow = i
      for (let r = i + 1; r < 4; r++) {
        if (Math.abs(a[r][i]) > Math.abs(a[maxRow][i])) maxRow = r
      }
      ;[a[i], a[maxRow]] = [a[maxRow], a[i]]
      const pivot = a[i][i]
      if (Math.abs(pivot) < 1e-12) throw new Error('Singular matrix in solver.')
      for (let j = i; j < 5; j++) a[i][j] /= pivot
      for (let r = 0; r < 4; r++) {
        if (r === i) continue
        const f = a[r][i]
        for (let j = i; j < 5; j++) a[r][j] -= f * a[i][j]
      }
    }
    return [a[0][4], a[1][4], a[2][4], a[3][4]]
  }

  // ── Fit models ────────────────────────────────────────────────────────────

  /** Rule 2: global least-squares cubic */
  function fitPureCubic(points: Pt[]): FitBase {
    const s = [0, 0, 0, 0, 0, 0, 0]
    const t = [0, 0, 0, 0]
    for (const p of points) {
      const x = p.x, y = p.y, x2 = x * x, x3 = x2 * x
      s[0]++; s[1] += x;    s[2] += x2;    s[3] += x3
      s[4] += x3 * x; s[5] += x3 * x * x; s[6] += x3 * x * x * x
      t[0] += y; t[1] += x * y; t[2] += x2 * y; t[3] += x3 * y
    }
    const A = [
      [s[6], s[5], s[4], s[3]],
      [s[5], s[4], s[3], s[2]],
      [s[4], s[3], s[2], s[1]],
      [s[3], s[2], s[1], s[0]],
    ]
    const [a3, a2, a1, a0] = solve4x4(A, [t[3], t[2], t[1], t[0]])
    const curveFn = (xv: number) => a3 * xv * xv * xv + a2 * xv * xv + a1 * xv + a0
    let totalErr = 0
    for (const p of points) totalErr += (p.y - curveFn(p.x)) ** 2
    return { mode: 'pure_cubic', a3, a2, a1, a0, err: totalErr, curve: curveFn }
  }

  /** Rules 3/4: linear p1→pBreak, C1-smooth cubic tail */
  function fitLinearCubicTail(points: Pt[], breakIdx: number): FitBase {
    const p1 = points[0], pb = points[breakIdx]
    const x1 = p1.x, y1 = p1.y, xb = pb.x, yb = pb.y
    const slope = (yb - y1) / (xb - x1)
    const c = slope, d = yb

    let s11 = 0, s12 = 0, s22 = 0, t1v = 0, t2v = 0
    for (const p of points.slice(breakIdx)) {
      const u = p.x - xb, u2 = u * u, u3 = u2 * u
      const rhs = p.y - (c * u + d)
      s11 += u3 * u3; s12 += u3 * u2; s22 += u2 * u2
      t1v += u3 * rhs; t2v += u2 * rhs
    }
    const det  = s11 * s22 - s12 * s12
    const aFit = Math.abs(det) > 1e-12 ? (t1v * s22 - t2v * s12) / det : 0
    const bFit = Math.abs(det) > 1e-12 ? (s11 * t2v - s12 * t1v) / det : 0

    const curveFn = (x: number) => {
      if (x <= xb) return y1 + slope * (x - x1)
      const u = x - xb
      return aFit * u * u * u + bFit * u * u + c * u + d
    }
    let totalErr = 0
    for (const p of points) totalErr += (p.y - curveFn(p.x)) ** 2

    return {
      mode: 'linear_cubic_tail', breakIdx, xBreak: xb, yBreak: yb,
      slope, a: aFit, b: bFit, c, d, err: totalErr, curve: curveFn,
    }
  }

  /** Rule 1a: falling start → smooth minimum */
  function fitSmoothMinimum(points: Pt[]): FitBase {
    let minIdx = 1
    for (let i = 1; i < points.length - 1; i++) {
      if (points[i + 1].y > points[i].y) { minIdx = i; break }
    }
    const xMin  = points[minIdx].x
    const yMin  = points[minIdx].y
    const xArr  = points.map(p => p.x)
    const yArr  = points.map(p => p.y)
    const dx    = xArr.map(x => x - xMin)
    const phi2  = dx.map(v => v * v)
    const phi3p = dx.map(v => Math.max(0, v) ** 3)

    let best: { alpha: number; beta: number; err: number } | null = null
    for (let beta = cfg.betaMin; beta <= cfg.betaMax + 1e-12; beta += cfg.betaStep) {
      const rhs = yArr.map((y, i) => y - yMin - beta * phi3p[i])
      let num = 0, den = 0
      for (let i = 0; i < phi2.length; i++) {
        num += phi2[i] * rhs[i]
        den += phi2[i] * phi2[i]
      }
      const alpha = den === 0 ? 0 : num / den
      if (alpha < 0) continue
      let err = 0
      for (let i = 0; i < xArr.length; i++) {
        err += (yArr[i] - (yMin + alpha * phi2[i] + beta * phi3p[i])) ** 2
      }
      if (!best || err < best.err) best = { alpha, beta, err }
    }
    if (!best) best = { alpha: 0, beta: 0, err: Infinity }

    const { alpha, beta } = best
    return {
      mode: 'smooth_minimum_curve', minIdx, xMin, yMin, alpha, beta,
      err:  best.err,
      curve: (x: number) => {
        const d = x - xMin
        return yMin + alpha * d * d + beta * Math.max(0, d) ** 3
      },
    }
  }

  /** Rule 1b: extended U-shape → cubic base + C1-smooth cubic ascent */
  function fitHybridPolynomial(points: Pt[], breakIdx: number): FitBase {
    if (points.length < breakIdx + 2) throw new Error('Not enough points for hybrid model.')

    // Base cubic fitted to first breakIdx+1 points
    const basePoints = points.slice(0, breakIdx + 1)
    const buildSums = (subset: Pt[]) => {
      const s = [0, 0, 0, 0, 0, 0, 0], t = [0, 0, 0, 0]
      for (const p of subset) {
        const x = p.x, y = p.y, x2 = x * x, x3 = x2 * x
        s[0]++; s[1] += x;    s[2] += x2;    s[3] += x3
        s[4] += x3 * x; s[5] += x3 * x * x; s[6] += x3 * x * x * x
        t[0] += y; t[1] += x * y; t[2] += x2 * y; t[3] += x3 * y
      }
      return { s, t }
    }
    const { s, t } = buildSums(basePoints)
    const A = [
      [s[6], s[5], s[4], s[3]],
      [s[5], s[4], s[3], s[2]],
      [s[4], s[3], s[2], s[1]],
      [s[3], s[2], s[1], s[0]],
    ]
    const [aB, bB, cB, dB] = solve4x4(A, [t[3], t[2], t[1], t[0]])
    const baseCurve  = (x: number) => aB * x * x * x + bB * x * x + cB * x + dB
    const baseDeriv  = (x: number) => 3 * aB * x * x + 2 * bB * x + cB

    // Ascent cubic from breakpoint, C1-matched to base
    const xb    = points[breakIdx].x
    const yb    = baseCurve(xb)
    const sb    = baseDeriv(xb)
    const cA = sb, dA = yb

    let s11 = 0, s12 = 0, s22 = 0, t1v = 0, t2v = 0
    for (const p of points.slice(breakIdx)) {
      const u = p.x - xb, u2 = u * u, u3 = u2 * u
      const rhs = p.y - (cA * u + dA)
      s11 += u3 * u3; s12 += u3 * u2; s22 += u2 * u2
      t1v += u3 * rhs; t2v += u2 * rhs
    }
    const det  = s11 * s22 - s12 * s12
    const aA   = Math.abs(det) > 1e-12 ? (t1v * s22 - t2v * s12) / det : 0
    const bA   = Math.abs(det) > 1e-12 ? (s11 * t2v - s12 * t1v) / det : 0

    const curveFn = (x: number) => {
      if (x <= xb) return baseCurve(x)
      const u = x - xb
      return aA * u * u * u + bA * u * u + cA * u + dA
    }
    let totalErr = 0
    for (const p of points) totalErr += (p.y - curveFn(p.x)) ** 2

    return {
      mode: 'hybrid_polynomial', breakIdx, xBreak: xb, yBreak: yb,
      err: totalErr, curve: curveFn,
    }
  }

  // ── Routing ───────────────────────────────────────────────────────────────

  const s1 = localSlope(pts[0], pts[1])
  const s2 = localSlope(pts[1], pts[2])

  let fit: FitBase
  if (s1 < 0) {
    // Extended U-shape (s2 still falling/flat and enough points) → hybrid
    fit = s2 < cfg.horizontalThreshold && pts.length > 5
      ? fitHybridPolynomial(pts, cfg.hybridBreakIndex)
      : fitSmoothMinimum(pts)
  } else if (s1 > cfg.horizontalThreshold) {
    fit = fitPureCubic(pts)
  } else if (Math.abs(s2) <= cfg.horizontalThreshold) {
    fit = fitLinearCubicTail(pts, 2)
  } else {
    fit = fitLinearCubicTail(pts, 1)
  }

  const xMin = pts[0].x
  const xMax = pts[pts.length - 1].x
  const grid: Pt[] = []
  for (let i = 0; i <= cfg.fineSteps; i++) {
    const x = xMin + (xMax - xMin) * (i / cfg.fineSteps)
    grid.push({ x, y: fit.curve(x) })
  }

  return { firstSegmentSlope: s1, secondSegmentSlope: s2, fit, grid }
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

  const smoothedCurve: SmoothedPoint[] = grid.map(p => ({
    power:   Math.round(p.x * 100) / 100,
    lactate: Math.round(Math.max(0.1, p.y) * 1000) / 1000,
  }))

  const horizontalThreshold = options.horizontalThreshold ?? 0.005

  const early_phase: 'flat' | 'slight_fall' | 'slight_rise' =
    fit.mode === 'smooth_minimum_curve' || fit.mode === 'hybrid_polynomial' ? 'slight_fall'
    : Math.abs(firstSegmentSlope) <= horizontalThreshold ? 'flat'
    : 'slight_rise'

  const v_break = fit.xBreak ?? fit.xMin ?? smoothedCurve[0]?.power   ?? 0
  const yBreak  = fit.yBreak ?? fit.yMin ?? smoothedCurve[0]?.lactate  ?? 0
  const xFirst  = smoothedCurve[0]?.power ?? 0
  const L0      = fit.curve(xFirst)

  const smoothModel: SmoothModel = {
    model:       fit.mode,
    fit_ok:      true,
    early_phase,
    v_break:     Math.round(v_break * 100) / 100,
    params: {
      L0:     Math.round(L0     * 10000) / 10000,
      m:      0,
      A:      0,
      k:      0,
      yBreak: Math.round(yBreak * 10000) / 10000,
    },
  }

  return { smoothedCurve, smoothModel }
}
