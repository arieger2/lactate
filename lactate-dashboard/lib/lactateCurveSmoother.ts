/**
 * Lactate Curve Smoother — public API wrapper around fitDataset5Optimized
 *
 * Mode: optimized_monotone_slope
 *   - Searches over breakpoint indices (minBreakIndex..maxBreakIndex)
 *   - Left side: polynomial of configurable degree with enforced rising portion
 *   - Right tail: non-negative constrained least squares (u², u³, u⁴ terms)
 *   - Picks best candidate by SSE
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
  minBreakIndex:        number
  maxBreakIndex:        number
  leftDegrees:          number[]
  slopeTolerance:       number
  derivativeTolerance:  number
}

interface FitBase {
  mode:           string
  err:            number
  curve:          (x: number) => number
  breakIdx?:      number
  xBreak?:        number
  yBreak?:        number
  leftDegree?:    number
  xRise?:         number
  leftCoeffsAsc?: number[]
  slopeBreak?:    number
  tailA?:         number
  tailB?:         number
  tailC?:         number
}

interface FitResult {
  fit:        FitBase
  candidates: FitBase[]
  grid:       Pt[]
}

// ── Core algorithm ────────────────────────────────────────────────────────────

function fitDataset5Optimized(
  data: Array<{ x: number | string; y: number | string }>,
  options: Partial<FitCfg> = {},
): FitResult {
  const cfg: FitCfg = {
    fineSteps:           options.fineSteps           ?? 400,
    minBreakIndex:       options.minBreakIndex       ?? 2,
    maxBreakIndex:       options.maxBreakIndex       ?? 5,
    leftDegrees:         options.leftDegrees         ?? [2, 3],
    slopeTolerance:      options.slopeTolerance      ?? 1e-10,
    derivativeTolerance: options.derivativeTolerance ?? 1e-8,
  }

  const pts: Pt[] = [...data]
    .map(d => ({ x: Number(d.x), y: Number(d.y) }))
    .sort((a, b) => a.x - b.x)

  if (pts.length < 5) throw new Error('At least 5 data points required.')

  // ── Helpers ───────────────────────────────────────────────────────────────

  function sumSquaredError(points: Pt[], curve: (x: number) => number): number {
    let sse = 0
    for (const p of points) { const d = p.y - curve(p.x); sse += d * d }
    return sse
  }

  function solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length
    const aug = A.map((row, i) => [...row, b[i]])
    for (let col = 0; col < n; col++) {
      let pivotRow = col
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(aug[r][col]) > Math.abs(aug[pivotRow][col])) pivotRow = r
      }
      if (Math.abs(aug[pivotRow][col]) < 1e-12) throw new Error('Singular matrix.')
      ;[aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]]
      const pivot = aug[col][col]
      for (let j = col; j <= n; j++) aug[col][j] /= pivot
      for (let r = 0; r < n; r++) {
        if (r === col) continue
        const f = aug[r][col]
        for (let j = col; j <= n; j++) aug[r][j] -= f * aug[col][j]
      }
    }
    return aug.map(row => row[n])
  }

  function fitPolynomialLeastSquares(xs: number[], ys: number[], degree: number): number[] {
    const m = degree + 1
    const A: number[][] = Array.from({ length: m }, () => Array(m).fill(0))
    const b: number[]   = Array(m).fill(0)
    for (let row = 0; row < m; row++) {
      for (let col = 0; col < m; col++) {
        let sum = 0
        for (let i = 0; i < xs.length; i++) sum += xs[i] ** (row + col)
        A[row][col] = sum
      }
      let rhs = 0
      for (let i = 0; i < xs.length; i++) rhs += ys[i] * (xs[i] ** row)
      b[row] = rhs
    }
    return solveLinearSystem(A, b)
  }

  function evalPolyAsc(coeffs: number[], xv: number): number {
    let yv = 0, pow = 1
    for (let i = 0; i < coeffs.length; i++) { yv += coeffs[i] * pow; pow *= xv }
    return yv
  }

  function evalPolyDerivativeAsc(coeffs: number[], xv: number): number {
    let yv = 0, pow = 1
    for (let i = 1; i < coeffs.length; i++) { yv += i * coeffs[i] * pow; pow *= xv }
    return yv
  }

  function firstRiseXFromPoly(coeffs: number[], xMin: number, xMax: number, samples = 800): number | null {
    for (let i = 0; i < samples; i++) {
      const xv = xMin + (xMax - xMin) * (i / (samples - 1))
      if (evalPolyDerivativeAsc(coeffs, xv) >= -cfg.slopeTolerance) return xv
    }
    return null
  }

  function derivativeNonDecreasing(coeffs: number[], xStart: number, xEnd: number, samples = 500): boolean {
    let prev: number | null = null
    for (let i = 0; i < samples; i++) {
      const xv = xStart + (xEnd - xStart) * (i / (samples - 1))
      const dv = evalPolyDerivativeAsc(coeffs, xv)
      if (prev !== null && dv < prev - cfg.derivativeTolerance) return false
      prev = dv
    }
    return true
  }

  /** Non-negative least squares for 3 variables via active-set enumeration */
  function solveNNLS3(Arows: number[][], bvec: number[]): [number, number, number] {
    const subsets = [
      [], [0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2],
    ] as number[][]

    let best: { x: [number, number, number]; sse: number } | null = null

    for (const active of subsets) {
      try {
        if (active.length === 0) {
          let sse = 0
          for (const bv of bvec) sse += bv * bv
          if (!best || sse < best.sse) best = { x: [0, 0, 0], sse }
          continue
        }
        const k = active.length
        const ATA: number[][] = Array.from({ length: k }, () => Array(k).fill(0))
        const ATb: number[]   = Array(k).fill(0)
        for (let i = 0; i < Arows.length; i++) {
          for (let r = 0; r < k; r++) {
            ATb[r] += Arows[i][active[r]] * bvec[i]
            for (let c = 0; c < k; c++) {
              ATA[r][c] += Arows[i][active[r]] * Arows[i][active[c]]
            }
          }
        }
        const sol = solveLinearSystem(ATA, ATb)
        if (sol.some(v => v < -1e-12)) continue
        const x: [number, number, number] = [0, 0, 0]
        for (let i = 0; i < k; i++) x[active[i]] = Math.max(0, sol[i])
        let sse = 0
        for (let i = 0; i < Arows.length; i++) {
          const pred = Arows[i][0] * x[0] + Arows[i][1] * x[1] + Arows[i][2] * x[2]
          const r    = pred - bvec[i]
          sse += r * r
        }
        if (!best || sse < best.sse) best = { x, sse }
      } catch { /* singular — skip */ }
    }

    return best ? best.x : [0, 0, 0]
  }

  // ── Candidate builder ─────────────────────────────────────────────────────

  function fitConstrainedCandidate(points: Pt[], breakIdx: number, leftDegree: number): FitBase | null {
    if (leftDegree > breakIdx) return null

    const leftPoints = points.slice(0, breakIdx + 1)
    const leftX = leftPoints.map(p => p.x)
    const leftY = leftPoints.map(p => p.y)

    let leftCoeffs: number[]
    try { leftCoeffs = fitPolynomialLeastSquares(leftX, leftY, leftDegree) }
    catch { return null }

    const xRise = firstRiseXFromPoly(leftCoeffs, leftX[0], leftX[leftX.length - 1])
    if (xRise === null) return null

    if (!derivativeNonDecreasing(leftCoeffs, xRise, points[breakIdx].x)) return null

    const xb = points[breakIdx].x
    const yb = evalPolyAsc(leftCoeffs, xb)
    const sb = Math.max(0, evalPolyDerivativeAsc(leftCoeffs, xb))

    // Right tail: yb + sb·u + a·u² + b·u³ + c·u⁴   with a,b,c ≥ 0
    const tailPts = points.slice(breakIdx)
    const Arows: number[][] = []
    const bvec:  number[]   = []
    for (const p of tailPts) {
      const u = p.x - xb
      Arows.push([u * u, u * u * u, u * u * u * u])
      bvec.push(p.y - (yb + sb * u))
    }

    const [a, b, c] = solveNNLS3(Arows, bvec)

    const curveFn = (xv: number) => {
      if (xv <= xb) return evalPolyAsc(leftCoeffs, xv)
      const u = xv - xb
      return yb + sb * u + a * u * u + b * u * u * u + c * u * u * u * u
    }

    return {
      mode:          'optimized_monotone_slope',
      breakIdx,
      xBreak:        xb,
      yBreak:        yb,
      leftDegree,
      xRise,
      leftCoeffsAsc: leftCoeffs,
      slopeBreak:    sb,
      tailA:         a,
      tailB:         b,
      tailC:         c,
      err:           sumSquaredError(points, curveFn),
      curve:         curveFn,
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────

  const minBI = Math.max(2, cfg.minBreakIndex)
  const maxBI = Math.min(pts.length - 2, cfg.maxBreakIndex)

  const candidates: FitBase[] = []
  for (let breakIdx = minBI; breakIdx <= maxBI; breakIdx++) {
    for (const leftDegree of cfg.leftDegrees) {
      const cand = fitConstrainedCandidate(pts, breakIdx, leftDegree)
      if (cand) candidates.push(cand)
    }
  }

  if (candidates.length === 0) throw new Error('No valid constrained candidate found.')

  candidates.sort((a, b) => a.err - b.err)
  const fit = candidates[0]

  const xMin = pts[0].x
  const xMax = pts[pts.length - 1].x
  const grid: Pt[] = []
  for (let i = 0; i <= cfg.fineSteps; i++) {
    const xv = xMin + (xMax - xMin) * (i / cfg.fineSteps)
    grid.push({ x: xv, y: fit.curve(xv) })
  }

  return { fit, candidates, grid }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function smoothLactateCurve(
  rawData: Array<{ power: number | string; lactate: number | string }>,
  options: {
    fineSteps?: number
  } = {},
): SmoothResult | null {
  if (!rawData || rawData.length < 5) return null

  let result: FitResult
  let ptsFirst: Pt[] = []
  try {
    const pts = rawData.map(d => ({
      x: parseFloat(String(d.power   ?? 0)),
      y: parseFloat(String(d.lactate ?? 0)),
    })).filter(p => p.x > 0 && p.y > 0)

    if (pts.length < 5) return null
    ptsFirst = pts.sort((a, b) => a.x - b.x)
    result = fitDataset5Optimized(ptsFirst, options)
  } catch {
    return null
  }

  const { fit, grid } = result

  const smoothedCurve: SmoothedPoint[] = grid.map(p => ({
    power:   Math.round(p.x * 100) / 100,
    lactate: Math.round(Math.max(0.1, p.y) * 1000) / 1000,
  }))

  // Derive early_phase from first two data points
  const s1 = ptsFirst.length >= 2
    ? (ptsFirst[1].y - ptsFirst[0].y) / Math.max(1e-12, ptsFirst[1].x - ptsFirst[0].x)
    : 0
  const early_phase: 'flat' | 'slight_fall' | 'slight_rise' =
    s1 < -0.005 ? 'slight_fall' : s1 > 0.005 ? 'slight_rise' : 'flat'

  const v_break = fit.xBreak ?? smoothedCurve[0]?.power   ?? 0
  const yBreak  = fit.yBreak ?? smoothedCurve[0]?.lactate  ?? 0
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
