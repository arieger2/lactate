'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ReactEcharts from 'echarts-for-react'
import { lactateDataService } from '@/lib/lactateDataService'
import { useCustomer } from '@/lib/CustomerContext'

// Types for the webhook data
interface LactateWebhookData {
  timestamp: string
  power: number
  lactate: number
  heartRate?: number
  fatOxidation?: number
}

interface ThresholdData {
  lt1: {
    power: number
    lactate: number
    heartRate?: number
  }
  lt2: {
    power: number
    lactate: number
    heartRate?: number
  }
  fatMax?: {
    power: number
    fatOxidation: number
    heartRate?: number
  }
}

// Zone boundaries type for custom adjustments
interface ZoneBoundaries {
  z1End: number   // End of Z1 / Start of Z2
  z2End: number   // End of Z2 / Start of Z3 (LT1)
  z3End: number   // End of Z3 / Start of Z4 (LT2)
  z4End: number   // End of Z4 / Start of Z5
}

type OverlayType = 'dmax' | 'lt2ians' | 'mader' | 'stegmann' | 'fes' | 'coggan' | 'seiler' | 'inscyd'

const LactatePerformanceCurve = () => {
  // Use global customer context with persistent session
  const { selectedCustomer, selectedSessionId, setSelectedSessionId } = useCustomer()
  
  const [webhookData, setWebhookData] = useState<LactateWebhookData[]>([])
  // Local sessionId synced with global context
  const [sessionId, setSessionIdLocal] = useState<string>(selectedSessionId || '')
  const [availableSessions, setAvailableSessions] = useState<{id: string, lastUpdated: string, pointCount: number}[]>([])
  const [isReceivingData, setIsReceivingData] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [thresholds, setThresholds] = useState<ThresholdData | null>(null)
  const [activeOverlay, setActiveOverlay] = useState<OverlayType | null>('dmax')
  const [chartKey, setChartKey] = useState(0)
  
  // Custom zone boundaries (user-adjustable)
  const [customZoneBoundaries, setCustomZoneBoundaries] = useState<ZoneBoundaries | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [dragBoundary, setDragBoundary] = useState<string | null>(null)
  const [hoverBoundary, setHoverBoundary] = useState<string | null>(null)
  const [hasSavedAdjustedZones, setHasSavedAdjustedZones] = useState(false)
  const [savedAdjustedBoundaries, setSavedAdjustedBoundaries] = useState<ZoneBoundaries | null>(null)
  const chartRef = useRef<any>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // ============================================================================
  // HELPER FUNCTIONS FOR MATHEMATICAL CURVE FITTING
  // ============================================================================
  
  // Linear interpolation to find exact power at a target lactate value
  const interpolatePowerAtLactate = (data: LactateWebhookData[], targetLactate: number): { power: number; lactate: number; heartRate?: number } | null => {
    const sortedData = [...data].sort((a, b) => a.power - b.power)
    
    for (let i = 0; i < sortedData.length - 1; i++) {
      const curr = sortedData[i]
      const next = sortedData[i + 1]
      
      if ((curr.lactate <= targetLactate && next.lactate >= targetLactate) ||
          (curr.lactate >= targetLactate && next.lactate <= targetLactate)) {
        // Linear interpolation
        const t = (targetLactate - curr.lactate) / (next.lactate - curr.lactate)
        const power = curr.power + t * (next.power - curr.power)
        const heartRate = curr.heartRate && next.heartRate 
          ? curr.heartRate + t * (next.heartRate - curr.heartRate)
          : curr.heartRate || next.heartRate
        
        return { power, lactate: targetLactate, heartRate: heartRate ? Math.round(heartRate) : undefined }
      }
    }
    
    // If target not found in range, return null
    return null
  }
  
  // Fit exponential model: lactate = a + b * e^(c * power)
  // Uses Levenberg-Marquardt-like iterative approach
  const fitExponentialModel = (data: LactateWebhookData[]): { a: number; b: number; c: number } | null => {
    if (data.length < 3) return null
    
    const sortedData = [...data].sort((a, b) => a.power - b.power)
    const n = sortedData.length
    
    // Initial estimates
    const minLactate = Math.min(...sortedData.map(d => d.lactate))
    const maxLactate = Math.max(...sortedData.map(d => d.lactate))
    const minPower = sortedData[0].power
    const maxPower = sortedData[n - 1].power
    
    // a = baseline (minimum lactate)
    let a = minLactate * 0.9
    // b = amplitude
    let b = 0.1
    // c = growth rate
    let c = Math.log((maxLactate - a) / b) / (maxPower - minPower) || 0.01
    
    // Simple gradient descent optimization (10 iterations)
    const learningRate = 0.0001
    for (let iter = 0; iter < 20; iter++) {
      let gradA = 0, gradB = 0, gradC = 0
      
      for (const point of sortedData) {
        const expTerm = Math.exp(c * point.power)
        const predicted = a + b * expTerm
        const error = predicted - point.lactate
        
        gradA += 2 * error
        gradB += 2 * error * expTerm
        gradC += 2 * error * b * point.power * expTerm
      }
      
      a -= learningRate * gradA
      b -= learningRate * 0.1 * gradB
      c -= learningRate * 0.00001 * gradC
      
      // Clamp values to reasonable ranges
      a = Math.max(0.5, Math.min(2.0, a))
      b = Math.max(0.001, Math.min(1.0, b))
      c = Math.max(0.001, Math.min(0.05, c))
    }
    
    return { a, b, c }
  }
  
  // Fit 3rd degree polynomial: lactate = a0 + a1*P + a2*P² + a3*P³
  // Uses least squares regression
  const fitPolynomial3 = (data: LactateWebhookData[]): number[] | null => {
    if (data.length < 4) return null
    
    const sortedData = [...data].sort((a, b) => a.power - b.power)
    const n = sortedData.length
    
    // Normalize power values for numerical stability
    const powers = sortedData.map(d => d.power)
    const minP = Math.min(...powers)
    const maxP = Math.max(...powers)
    const range = maxP - minP || 1
    
    // Build Vandermonde matrix for polynomial fitting
    // Using normal equations: (X^T X) a = X^T y
    const X: number[][] = sortedData.map(d => {
      const p = (d.power - minP) / range // Normalized 0-1
      return [1, p, p * p, p * p * p]
    })
    const y = sortedData.map(d => d.lactate)
    
    // X^T X
    const XtX: number[][] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < n; k++) {
          XtX[i][j] += X[k][i] * X[k][j]
        }
      }
    }
    
    // X^T y
    const Xty: number[] = [0, 0, 0, 0]
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k < n; k++) {
        Xty[i] += X[k][i] * y[k]
      }
    }
    
    // Solve using Gaussian elimination with partial pivoting
    const augmented = XtX.map((row, i) => [...row, Xty[i]])
    
    for (let col = 0; col < 4; col++) {
      // Find pivot
      let maxRow = col
      for (let row = col + 1; row < 4; row++) {
        if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
          maxRow = row
        }
      }
      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]]
      
      if (Math.abs(augmented[col][col]) < 1e-10) continue
      
      // Eliminate
      for (let row = col + 1; row < 4; row++) {
        const factor = augmented[row][col] / augmented[col][col]
        for (let j = col; j < 5; j++) {
          augmented[row][j] -= factor * augmented[col][j]
        }
      }
    }
    
    // Back substitution
    const coeffs = [0, 0, 0, 0]
    for (let i = 3; i >= 0; i--) {
      let sum = augmented[i][4]
      for (let j = i + 1; j < 4; j++) {
        sum -= augmented[i][j] * coeffs[j]
      }
      coeffs[i] = Math.abs(augmented[i][i]) > 1e-10 ? sum / augmented[i][i] : 0
    }
    
    // Store normalization params with coefficients
    return [...coeffs, minP, range]
  }
  
  // Evaluate polynomial at a given power
  const evalPolynomial3 = (coeffs: number[], power: number): number => {
    const [a0, a1, a2, a3, minP, range] = coeffs
    const p = (power - minP) / range
    return a0 + a1 * p + a2 * p * p + a3 * p * p * p
  }
  
  // Find derivative of polynomial at power (for inflection points)
  const polynomialDerivative = (coeffs: number[], power: number): number => {
    const [, a1, a2, a3, minP, range] = coeffs
    const p = (power - minP) / range
    return (a1 + 2 * a2 * p + 3 * a3 * p * p) / range
  }
  
  // Find second derivative (for curvature analysis)
  const polynomialSecondDerivative = (coeffs: number[], power: number): number => {
    const [, , a2, a3, minP, range] = coeffs
    const p = (power - minP) / range
    return (2 * a2 + 6 * a3 * p) / (range * range)
  }
  
  // Find power at specific lactate value using polynomial (binary search)
  const findPowerAtLactatePolynomial = (coeffs: number[], targetLactate: number, minPower: number, maxPower: number): number | null => {
    let low = minPower
    let high = maxPower
    
    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2
      const lactateAtMid = evalPolynomial3(coeffs, mid)
      
      if (Math.abs(lactateAtMid - targetLactate) < 0.01) {
        return mid
      }
      
      if (lactateAtMid < targetLactate) {
        low = mid
      } else {
        high = mid
      }
    }
    
    return (low + high) / 2
  }

  // ============================================================================
  // THRESHOLD CALCULATION METHODS (Scientifically Validated)
  // ============================================================================
  
  const thresholdMethods: Record<OverlayType, { name: string; color: string; description: string; calculate: (data: LactateWebhookData[]) => ThresholdData | null }> = {
    
    // DMAX Method (Cheng et al., 1992)
    // Maximum perpendicular distance from baseline to fitted lactate curve
    dmax: {
      name: 'DMAX',
      color: '#dc2626',
      description: 'Cheng et al. (1992) - Max. Distanz zur Baseline',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Fit 3rd degree polynomial to lactate curve
        const coeffs = fitPolynomial3(sortedData)
        if (!coeffs) return null
        
        const startPoint = sortedData[0]
        const endPoint = sortedData[sortedData.length - 1]
        
        // Line from first to last point: y = mx + b
        const m = (endPoint.lactate - startPoint.lactate) / (endPoint.power - startPoint.power)
        const b = startPoint.lactate - m * startPoint.power
        
        // Find maximum perpendicular distance using polynomial curve
        let maxDistance = 0
        let dmaxPower = (startPoint.power + endPoint.power) / 2
        
        // Sample 100 points along the curve
        for (let i = 0; i <= 100; i++) {
          const power = startPoint.power + (endPoint.power - startPoint.power) * (i / 100)
          const curveLactate = evalPolynomial3(coeffs, power)
          const lineLactate = m * power + b
          
          // Perpendicular distance formula
          const distance = Math.abs(curveLactate - lineLactate) / Math.sqrt(1 + m * m)
          
          if (distance > maxDistance) {
            maxDistance = distance
            dmaxPower = power
          }
        }
        
        const dmaxLactate = evalPolynomial3(coeffs, dmaxPower)
        
        // LT1 using "Modified DMAX" - first deflection point
        // Find where second derivative changes sign or exceeds threshold
        let lt1Power = startPoint.power
        const baselineSlope = polynomialDerivative(coeffs, startPoint.power)
        
        for (let i = 0; i <= 50; i++) {
          const power = startPoint.power + (dmaxPower - startPoint.power) * (i / 50)
          const slope = polynomialDerivative(coeffs, power)
          
          // LT1 where slope increases by 50% from baseline
          if (slope > baselineSlope * 1.5 && slope > 0.01) {
            lt1Power = power
            break
          }
        }
        
        const lt1Lactate = evalPolynomial3(coeffs, lt1Power)
        
        // Interpolate heart rate
        const lt1HR = sortedData.reduce((prev, curr) => 
          Math.abs(curr.power - lt1Power) < Math.abs(prev.power - lt1Power) ? curr : prev
        ).heartRate
        const lt2HR = sortedData.reduce((prev, curr) => 
          Math.abs(curr.power - dmaxPower) < Math.abs(prev.power - dmaxPower) ? curr : prev
        ).heartRate
        
        return {
          lt1: { power: Math.round(lt1Power), lactate: Math.round(lt1Lactate * 100) / 100, heartRate: lt1HR },
          lt2: { power: Math.round(dmaxPower), lactate: Math.round(dmaxLactate * 100) / 100, heartRate: lt2HR }
        }
      }
    },
    
    // Individual Anaerobic Threshold (Dickhuth et al., 1999)
    // LT1 = baseline + 0.5 mmol/L, LT2 = baseline + 1.5 mmol/L
    lt2ians: {
      name: 'Dickhuth',
      color: '#7c2d12',
      description: 'Dickhuth et al. - Baseline + 1.5 mmol/L',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Baseline = average of first 2-3 points (warm-up)
        const baselinePoints = sortedData.slice(0, Math.min(3, Math.floor(sortedData.length / 3)))
        const baseline = baselinePoints.reduce((sum, d) => sum + d.lactate, 0) / baselinePoints.length
        
        // LT1 (aerobic threshold) = baseline + 0.5 mmol/L
        const lt1Target = baseline + 0.5
        const lt1Result = interpolatePowerAtLactate(sortedData, lt1Target)
        
        // LT2 (anaerobic threshold / IANS) = baseline + 1.5 mmol/L
        const lt2Target = baseline + 1.5
        const lt2Result = interpolatePowerAtLactate(sortedData, lt2Target)
        
        // Fallback if interpolation fails
        if (!lt1Result || !lt2Result) {
          const coeffs = fitPolynomial3(sortedData)
          if (!coeffs) return null
          
          const minP = sortedData[0].power
          const maxP = sortedData[sortedData.length - 1].power
          
          const lt1Power = findPowerAtLactatePolynomial(coeffs, lt1Target, minP, maxP)
          const lt2Power = findPowerAtLactatePolynomial(coeffs, lt2Target, minP, maxP)
          
          if (!lt1Power || !lt2Power) return null
          
          return {
            lt1: { power: Math.round(lt1Power), lactate: Math.round(lt1Target * 100) / 100 },
            lt2: { power: Math.round(lt2Power), lactate: Math.round(lt2Target * 100) / 100 }
          }
        }
        
        return {
          lt1: { power: Math.round(lt1Result.power), lactate: lt1Result.lactate, heartRate: lt1Result.heartRate },
          lt2: { power: Math.round(lt2Result.power), lactate: lt2Result.lactate, heartRate: lt2Result.heartRate }
        }
      }
    },
    
    // Mader OBLA (Onset of Blood Lactate Accumulation)
    // Fixed 4 mmol/L with proper interpolation (Mader, 1976)
    mader: {
      name: 'Mader 4mmol',
      color: '#ef4444',
      description: 'Mader (1976) - OBLA bei 4 mmol/L',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 3) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // LT1 at 2 mmol/L (aerobic threshold, commonly used with Mader)
        const lt1Result = interpolatePowerAtLactate(sortedData, 2.0)
        
        // LT2 at 4 mmol/L (OBLA - Mader's classic threshold)
        const lt2Result = interpolatePowerAtLactate(sortedData, 4.0)
        
        // Fallback using polynomial if exact values not in data range
        if (!lt1Result || !lt2Result) {
          const coeffs = fitPolynomial3(sortedData)
          if (!coeffs) return null
          
          const minP = sortedData[0].power
          const maxP = sortedData[sortedData.length - 1].power
          
          const lt1Power = lt1Result?.power || findPowerAtLactatePolynomial(coeffs, 2.0, minP, maxP)
          const lt2Power = lt2Result?.power || findPowerAtLactatePolynomial(coeffs, 4.0, minP, maxP)
          
          if (!lt1Power || !lt2Power) return null
          
          return {
            lt1: { power: Math.round(lt1Power), lactate: 2.0 },
            lt2: { power: Math.round(lt2Power), lactate: 4.0 }
          }
        }
        
        return {
          lt1: { power: Math.round(lt1Result.power), lactate: 2.0, heartRate: lt1Result.heartRate },
          lt2: { power: Math.round(lt2Result.power), lactate: 4.0, heartRate: lt2Result.heartRate }
        }
      }
    },
    
    // Log-log Transformation Method (Beaver et al., 1985)
    // Uses log-transformed lactate vs power to find breakpoints
    stegmann: {
      name: 'Log-Log',
      color: '#8b5cf6',
      description: 'Beaver et al. - Log-Log Transformation',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 5) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Transform to log-log space
        const logData = sortedData.map(d => ({
          logPower: Math.log(d.power),
          logLactate: Math.log(Math.max(0.1, d.lactate)),
          original: d
        }))
        
        // Find the breakpoint using two-line regression
        // Test each point as potential breakpoint
        let bestBreakpoint = Math.floor(logData.length / 2)
        let minTotalError = Infinity
        
        for (let bp = 2; bp < logData.length - 2; bp++) {
          // Fit line to first segment
          const seg1 = logData.slice(0, bp + 1)
          const n1 = seg1.length
          const sumX1 = seg1.reduce((s, d) => s + d.logPower, 0)
          const sumY1 = seg1.reduce((s, d) => s + d.logLactate, 0)
          const sumXY1 = seg1.reduce((s, d) => s + d.logPower * d.logLactate, 0)
          const sumX2_1 = seg1.reduce((s, d) => s + d.logPower * d.logPower, 0)
          const slope1 = (n1 * sumXY1 - sumX1 * sumY1) / (n1 * sumX2_1 - sumX1 * sumX1)
          const intercept1 = (sumY1 - slope1 * sumX1) / n1
          
          // Fit line to second segment
          const seg2 = logData.slice(bp)
          const n2 = seg2.length
          const sumX2 = seg2.reduce((s, d) => s + d.logPower, 0)
          const sumY2 = seg2.reduce((s, d) => s + d.logLactate, 0)
          const sumXY2 = seg2.reduce((s, d) => s + d.logPower * d.logLactate, 0)
          const sumX2_2 = seg2.reduce((s, d) => s + d.logPower * d.logPower, 0)
          const slope2 = (n2 * sumXY2 - sumX2 * sumY2) / (n2 * sumX2_2 - sumX2 * sumX2)
          const intercept2 = (sumY2 - slope2 * sumX2) / n2
          
          // Calculate total error
          let error = 0
          for (const d of seg1) {
            error += Math.pow(d.logLactate - (slope1 * d.logPower + intercept1), 2)
          }
          for (const d of seg2) {
            error += Math.pow(d.logLactate - (slope2 * d.logPower + intercept2), 2)
          }
          
          if (error < minTotalError) {
            minTotalError = error
            bestBreakpoint = bp
          }
        }
        
        // LT2 is at the breakpoint
        const lt2Point = sortedData[bestBreakpoint]
        
        // LT1 is earlier - find where slope first increases significantly
        const coeffs = fitPolynomial3(sortedData)
        let lt1Power = sortedData[0].power
        
        if (coeffs) {
          const baseSlope = polynomialDerivative(coeffs, sortedData[0].power)
          for (let i = 1; i < bestBreakpoint; i++) {
            const slope = polynomialDerivative(coeffs, sortedData[i].power)
            if (slope > baseSlope * 1.3) {
              lt1Power = sortedData[i].power
              break
            }
          }
        } else {
          lt1Power = sortedData[Math.max(0, bestBreakpoint - 2)].power
        }
        
        const lt1Point = sortedData.reduce((prev, curr) => 
          Math.abs(curr.power - lt1Power) < Math.abs(prev.power - lt1Power) ? curr : prev
        )
        
        return {
          lt1: { power: Math.round(lt1Point.power), lactate: lt1Point.lactate, heartRate: lt1Point.heartRate },
          lt2: { power: Math.round(lt2Point.power), lactate: lt2Point.lactate, heartRate: lt2Point.heartRate }
        }
      }
    },
    
    // Bseline + 1.0 mmol/L Method (Faude et al., 2009)
    // Common in German sports science
    fes: {
      name: '+1.0 mmol/L',
      color: '#10b981',
      description: 'Faude et al. - Baseline + 1.0 mmol/L',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Minimum lactate as baseline (not necessarily first point)
        const baseline = Math.min(...sortedData.slice(0, Math.ceil(sortedData.length / 2)).map(d => d.lactate))
        
        // LT1 at baseline (minimum lactate power)
        const baselinePoint = sortedData.find(d => d.lactate === baseline) || sortedData[0]
        
        // LT2 at baseline + 1.0 mmol/L
        const lt2Target = baseline + 1.0
        const lt2Result = interpolatePowerAtLactate(sortedData, lt2Target)
        
        if (!lt2Result) {
          const coeffs = fitPolynomial3(sortedData)
          if (!coeffs) return null
          
          const lt2Power = findPowerAtLactatePolynomial(coeffs, lt2Target, sortedData[0].power, sortedData[sortedData.length - 1].power)
          if (!lt2Power) return null
          
          return {
            lt1: { power: Math.round(baselinePoint.power), lactate: baseline, heartRate: baselinePoint.heartRate },
            lt2: { power: Math.round(lt2Power), lactate: lt2Target }
          }
        }
        
        return {
          lt1: { power: Math.round(baselinePoint.power), lactate: baseline, heartRate: baselinePoint.heartRate },
          lt2: { power: Math.round(lt2Result.power), lactate: lt2Target, heartRate: lt2Result.heartRate }
        }
      }
    },
    
    // Modified DMAX (Bishop et al., 1998)
    // Uses polynomial fit from lactate minimum to maximum
    coggan: {
      name: 'ModDMAX',
      color: '#f59e0b',
      description: 'Bishop et al. - Modified DMAX',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Find lactate minimum point (not necessarily first)
        let minLactateIdx = 0
        let minLactate = sortedData[0].lactate
        for (let i = 1; i < Math.ceil(sortedData.length / 2); i++) {
          if (sortedData[i].lactate < minLactate) {
            minLactate = sortedData[i].lactate
            minLactateIdx = i
          }
        }
        
        // Use data from lactate minimum to end
        const relevantData = sortedData.slice(minLactateIdx)
        if (relevantData.length < 3) return null
        
        const coeffs = fitPolynomial3(relevantData)
        if (!coeffs) return null
        
        const startPoint = relevantData[0]
        const endPoint = relevantData[relevantData.length - 1]
        
        // Line from lactate minimum to final point
        const m = (endPoint.lactate - startPoint.lactate) / (endPoint.power - startPoint.power)
        const b = startPoint.lactate - m * startPoint.power
        
        // Find ModDMAX point
        let maxDistance = 0
        let modDmaxPower = (startPoint.power + endPoint.power) / 2
        
        for (let i = 0; i <= 100; i++) {
          const power = startPoint.power + (endPoint.power - startPoint.power) * (i / 100)
          const curveLactate = evalPolynomial3(coeffs, power)
          const lineLactate = m * power + b
          const distance = Math.abs(curveLactate - lineLactate) / Math.sqrt(1 + m * m)
          
          if (distance > maxDistance) {
            maxDistance = distance
            modDmaxPower = power
          }
        }
        
        const lt2Lactate = evalPolynomial3(coeffs, modDmaxPower)
        
        // LT1 at lactate minimum
        const lt1Point = sortedData[minLactateIdx]
        
        const lt2HR = relevantData.reduce((prev, curr) => 
          Math.abs(curr.power - modDmaxPower) < Math.abs(prev.power - modDmaxPower) ? curr : prev
        ).heartRate
        
        return {
          lt1: { power: Math.round(lt1Point.power), lactate: lt1Point.lactate, heartRate: lt1Point.heartRate },
          lt2: { power: Math.round(modDmaxPower), lactate: Math.round(lt2Lactate * 100) / 100, heartRate: lt2HR }
        }
      }
    },
    
    // 3-Zone Polarized Model (Seiler & Kjerland, 2006)
    // Based on ventilatory equivalents approximation
    seiler: {
      name: 'Seiler 3-Zone',
      color: '#06b6d4',
      description: 'Seiler - Polarisiertes Training',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Seiler zones based on lactate:
        // Zone 1: Below VT1 (~2 mmol/L or baseline + 0.5)
        // Zone 2: Between VT1 and VT2 (~4 mmol/L or baseline + 1.5)
        // Zone 3: Above VT2
        
        const baseline = Math.min(...sortedData.slice(0, 3).map(d => d.lactate))
        
        // VT1 approximation: baseline + 0.5 mmol/L or first rise
        const vt1Target = Math.max(baseline + 0.5, 1.8)
        const vt1Result = interpolatePowerAtLactate(sortedData, vt1Target)
        
        // VT2 approximation: ~4 mmol/L or baseline + 2.0
        const vt2Target = Math.max(baseline + 2.0, 3.5)
        const vt2Result = interpolatePowerAtLactate(sortedData, vt2Target)
        
        if (!vt1Result || !vt2Result) {
          const coeffs = fitPolynomial3(sortedData)
          if (!coeffs) return null
          
          const minP = sortedData[0].power
          const maxP = sortedData[sortedData.length - 1].power
          
          const vt1Power = vt1Result?.power || findPowerAtLactatePolynomial(coeffs, vt1Target, minP, maxP)
          const vt2Power = vt2Result?.power || findPowerAtLactatePolynomial(coeffs, vt2Target, minP, maxP)
          
          if (!vt1Power || !vt2Power) return null
          
          return {
            lt1: { power: Math.round(vt1Power), lactate: Math.round(vt1Target * 100) / 100 },
            lt2: { power: Math.round(vt2Power), lactate: Math.round(vt2Target * 100) / 100 }
          }
        }
        
        return {
          lt1: { power: Math.round(vt1Result.power), lactate: vt1Result.lactate, heartRate: vt1Result.heartRate },
          lt2: { power: Math.round(vt2Result.power), lactate: vt2Result.lactate, heartRate: vt2Result.heartRate }
        }
      }
    },
    
    // INSCYD-style with FatMax (San-Millán & Brooks, 2018)
    // Includes fat oxidation crossover point
    inscyd: {
      name: 'FatMax/LT',
      color: '#ec4899',
      description: 'San-Millán - FatMax & Lactate Thresholds',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        const hasFatOx = data.some(d => d.fatOxidation && d.fatOxidation > 0)
        
        // LT1: First lactate turn point (baseline + 0.5 or where fat oxidation peaks)
        const baseline = Math.min(...sortedData.slice(0, 3).map(d => d.lactate))
        const lt1Target = baseline + 0.5
        
        let lt1Result = interpolatePowerAtLactate(sortedData, lt1Target)
        
        // LT2: MLSS approximation (baseline + 1.5 mmol/L)
        const lt2Target = baseline + 1.5
        let lt2Result = interpolatePowerAtLactate(sortedData, lt2Target)
        
        // FatMax: Peak fat oxidation point
        let fatMax: { power: number; fatOxidation: number; heartRate?: number } | undefined
        
        if (hasFatOx) {
          const fatMaxPoint = sortedData.reduce((max, current) => 
            (current.fatOxidation || 0) > (max.fatOxidation || 0) ? current : max
          )
          
          if (fatMaxPoint.fatOxidation && fatMaxPoint.fatOxidation > 0) {
            fatMax = {
              power: fatMaxPoint.power,
              fatOxidation: fatMaxPoint.fatOxidation,
              heartRate: fatMaxPoint.heartRate
            }
            
            // Refine LT1 to be near FatMax if available
            if (fatMax && !lt1Result) {
              lt1Result = {
                power: fatMax.power,
                lactate: sortedData.find(d => d.power === fatMax!.power)?.lactate || lt1Target,
                heartRate: fatMax.heartRate
              }
            }
          }
        }
        
        // Fallback with polynomial
        if (!lt1Result || !lt2Result) {
          const coeffs = fitPolynomial3(sortedData)
          if (!coeffs) return null
          
          const minP = sortedData[0].power
          const maxP = sortedData[sortedData.length - 1].power
          
          const lt1Power = lt1Result?.power || findPowerAtLactatePolynomial(coeffs, lt1Target, minP, maxP)
          const lt2Power = lt2Result?.power || findPowerAtLactatePolynomial(coeffs, lt2Target, minP, maxP)
          
          if (!lt1Power || !lt2Power) return null
          
          return {
            lt1: { power: Math.round(lt1Power), lactate: Math.round(lt1Target * 100) / 100 },
            lt2: { power: Math.round(lt2Power), lactate: Math.round(lt2Target * 100) / 100 },
            fatMax
          }
        }
        
        return {
          lt1: { power: Math.round(lt1Result.power), lactate: lt1Result.lactate, heartRate: lt1Result.heartRate },
          lt2: { power: Math.round(lt2Result.power), lactate: lt2Result.lactate, heartRate: lt2Result.heartRate },
          fatMax
        }
      }
    }
  }

  // Get thresholds for the active overlay method
  const getActiveThresholds = useCallback(() => {
    if (!webhookData.length || !activeOverlay) return thresholds
    return thresholdMethods[activeOverlay].calculate(webhookData)
  }, [webhookData, activeOverlay, thresholds])

  // Calculate default zone boundaries based on thresholds
  const getDefaultZoneBoundaries = useCallback((): ZoneBoundaries | null => {
    const displayThresholds = getActiveThresholds()
    if (!displayThresholds || webhookData.length === 0) return null
    
    const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
    const minPower = Math.min(...sortedData.map(d => d.power))
    const maxPower = Math.max(...sortedData.map(d => d.power))
    const powerRange = maxPower - minPower
    const extendedMaxPower = maxPower + powerRange * 0.1
    
    const lt1Power = displayThresholds.lt1.power
    const lt2Power = displayThresholds.lt2.power
    const rawVt1Power = lt1Power * 0.85
    const rawVt2Power = lt2Power * 1.05
    
    const z1End = Math.max(minPower + 30, Math.min(rawVt1Power, lt1Power - 20))
    const z2End = Math.max(z1End + 20, lt1Power)
    const z3End = Math.max(z2End + 20, lt2Power)
    const z4End = Math.max(z3End + 20, rawVt2Power)
    
    return { z1End, z2End, z3End, z4End }
  }, [webhookData, getActiveThresholds])

  // Define 5 seamless training zones based on lactate thresholds
  const getFiveTrainingZones = useCallback(() => {
    const displayThresholds = getActiveThresholds()
    if (!displayThresholds || webhookData.length === 0) return []
    
    const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
    const minPower = Math.min(...sortedData.map(d => d.power))
    const maxPower = Math.max(...sortedData.map(d => d.power))
    const powerRange = maxPower - minPower
    const extendedMaxPower = maxPower + powerRange * 0.1
    
    // Use custom boundaries if available, otherwise calculate defaults
    let z1End: number, z2End: number, z3End: number, z4End: number
    
    if (customZoneBoundaries) {
      z1End = customZoneBoundaries.z1End
      z2End = customZoneBoundaries.z2End
      z3End = customZoneBoundaries.z3End
      z4End = customZoneBoundaries.z4End
    } else {
      const defaults = getDefaultZoneBoundaries()
      if (!defaults) return []
      z1End = defaults.z1End
      z2End = defaults.z2End
      z3End = defaults.z3End
      z4End = defaults.z4End
    }
    
    const z1Start = minPower
    const z5End = Math.max(z4End + 20, extendedMaxPower)
    
    // Build zone boundaries
    const zoneBoundaries = [z1Start, z1End, z2End, z3End, z4End, z5End]
    
    // Debug log
    console.log('Zone calculation:', {
      customZoneBoundaries: !!customZoneBoundaries,
      z1: `${Math.round(z1Start)}-${Math.round(z1End)}`,
      z2: `${Math.round(z1End)}-${Math.round(z2End)}`,
      z3: `${Math.round(z2End)}-${Math.round(z3End)}`,
      z4: `${Math.round(z3End)}-${Math.round(z4End)}`,
      z5: `${Math.round(z4End)}-${Math.round(z5End)}`
    })
    
    const zones = [
      {
        id: 1,
        name: 'Zone 1 - Aktive Regeneration',
        color: 'rgba(144, 238, 144, 0.5)',      // Light green
        borderColor: 'rgba(34, 139, 34, 0.8)',
        range: [zoneBoundaries[0], zoneBoundaries[1]],
        lactateRange: '< 2.0 mmol/l',
        description: 'Regeneration & Fettstoffwechsel',
        intensity: '< 65% HFmax'
      },
      {
        id: 2,
        name: 'Zone 2 - Aerobe Basis',
        color: 'rgba(0, 200, 83, 0.4)',          // Green
        borderColor: 'rgba(0, 150, 60, 0.8)',
        range: [zoneBoundaries[1], zoneBoundaries[2]],
        lactateRange: '2.0-2.5 mmol/l',
        description: 'Grundlagenausdauer 1',
        intensity: '65-75% HFmax'
      },
      {
        id: 3,
        name: 'Zone 3 - Aerobe Schwelle',
        color: 'rgba(255, 235, 59, 0.4)',        // Yellow
        borderColor: 'rgba(245, 200, 0, 0.8)',
        range: [zoneBoundaries[2], zoneBoundaries[3]],
        lactateRange: '2.5-4.0 mmol/l',
        description: 'Grundlagenausdauer 2 / Tempo',
        intensity: '75-85% HFmax'
      },
      {
        id: 4,
        name: 'Zone 4 - Laktatschwelle',
        color: 'rgba(255, 152, 0, 0.4)',         // Orange
        borderColor: 'rgba(230, 120, 0, 0.8)',
        range: [zoneBoundaries[3], zoneBoundaries[4]],
        lactateRange: '4.0-8.0 mmol/l',
        description: 'Wettkampftempo / Schwellenbereich',
        intensity: '85-95% HFmax'
      },
      {
        id: 5,
        name: 'Zone 5 - Neuromuskuläre Leistung',
        color: 'rgba(244, 67, 54, 0.4)',         // Red
        borderColor: 'rgba(200, 40, 30, 0.8)',
        range: [zoneBoundaries[4], zoneBoundaries[5]],
        lactateRange: '> 8.0 mmol/l',
        description: 'Anaerobe Kapazität / VO2max',
        intensity: '> 95% HFmax'
      }
    ]

    // Debug: Log seamless zone boundaries
    console.log('Seamless Zone Boundaries:', {
      boundaries: zoneBoundaries.map(b => Math.round(b)),
      zones: zones.map(z => ({
        id: z.id,
        start: Math.round(z.range[0]),
        end: Math.round(z.range[1]),
        width: Math.round(z.range[1] - z.range[0])
      }))
    })

    return zones
  }, [webhookData, activeOverlay, getActiveThresholds, customZoneBoundaries, getDefaultZoneBoundaries])

  // Auto-save zone boundaries to database (silent, no alerts, debounced)
  const autoSaveZoneBoundaries = useCallback(async (boundariesToSave: ZoneBoundaries) => {
    if (!selectedCustomer || !sessionId) {
      console.log('Cannot auto-save: no customer or session selected')
      return
    }
    
    try {
      const response = await fetch('/api/training-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.customer_id,
          sessionId: sessionId,
          method: 'adjusted', // Mark as manually adjusted
          boundaries: boundariesToSave,
          zones: getFiveTrainingZones().map(z => ({
            zoneId: z.id,
            name: z.name,
            powerStart: z.range[0],
            powerEnd: z.range[1]
          }))
        })
      })
      
      if (response.ok) {
        console.log('✅ Zones auto-saved successfully')
        // Update the saved adjusted boundaries so "Adjusted" button appears
        setSavedAdjustedBoundaries(boundariesToSave)
        setHasSavedAdjustedZones(true)
      } else {
        console.error('Failed to auto-save zones')
      }
    } catch (error) {
      console.error('Error auto-saving zones:', error)
    }
  }, [selectedCustomer, sessionId, getFiveTrainingZones])

  // Handle zone boundary change - updates state and triggers debounced auto-save
  const handleZoneBoundaryChange = useCallback((boundaryKey: keyof ZoneBoundaries, newValue: number) => {
    const currentBoundaries = customZoneBoundaries || getDefaultZoneBoundaries()
    if (!currentBoundaries) return
    
    // Ensure boundaries stay in order
    let newBoundaries = { ...currentBoundaries, [boundaryKey]: newValue }
    
    // Validate and adjust to maintain order
    const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
    const minPower = Math.min(...sortedData.map(d => d.power))
    const maxPower = Math.max(...sortedData.map(d => d.power))
    
    // Ensure z1End > minPower + 10
    newBoundaries.z1End = Math.max(minPower + 10, newBoundaries.z1End)
    // Ensure z2End > z1End + 10
    newBoundaries.z2End = Math.max(newBoundaries.z1End + 10, newBoundaries.z2End)
    // Ensure z3End > z2End + 10
    newBoundaries.z3End = Math.max(newBoundaries.z2End + 10, newBoundaries.z3End)
    // Ensure z4End > z3End + 10 and < maxPower
    newBoundaries.z4End = Math.max(newBoundaries.z3End + 10, Math.min(maxPower, newBoundaries.z4End))
    
    setCustomZoneBoundaries(newBoundaries)
    
    // Debounced auto-save: clear previous timeout and set new one
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      autoSaveZoneBoundaries(newBoundaries)
    }, 300) // Save 300ms after last change
  }, [customZoneBoundaries, getDefaultZoneBoundaries, webhookData, autoSaveZoneBoundaries])

  // Apply saved adjusted zones
  const applyAdjustedZones = () => {
    if (savedAdjustedBoundaries) {
      setCustomZoneBoundaries(savedAdjustedBoundaries)
      setChartKey(prev => prev + 1)
    }
  }

  // Handle overlay selection
  const handleOverlaySelect = (method: OverlayType) => {
    setActiveOverlay(activeOverlay === method ? null : method)
    setCustomZoneBoundaries(null) // Reset custom boundaries when changing method
    setChartKey(prev => prev + 1) // Force chart re-render
  }

  // Convert pixel position to power value
  const pixelToPower = useCallback((clientX: number): number | null => {
    const chart = chartRef.current?.getEchartsInstance()
    if (!chart || !chartContainerRef.current) return null
    
    try {
      const chartDom = chart.getDom()
      const chartRect = chartDom.getBoundingClientRect()
      
      // Convert client coordinates to chart-local coordinates
      const localX = clientX - chartRect.left
      
      // Use ECharts convertFromPixel to get the data value
      // This properly handles the grid margins and axis scaling
      const dataPoint = chart.convertFromPixel({ seriesIndex: 0 }, [localX, 0])
      
      if (dataPoint && typeof dataPoint[0] === 'number') {
        console.log(`🔄 pixelToPower: clientX=${Math.round(clientX)}, localX=${Math.round(localX)}, power=${Math.round(dataPoint[0])}`)
        return dataPoint[0]
      }
      return null
    } catch (e) {
      console.error('pixelToPower error:', e)
      return null
    }
  }, [])

  // Find which boundary is near the mouse position - returns the CLOSEST boundary
  const findNearBoundary = useCallback((power: number): string | null => {
    const zones = getFiveTrainingZones()
    if (zones.length < 5) return null
    
    // Zone boundaries from the zones array
    // zones[0].range = [z1Start, z1End] - so zones[0].range[1] = z1End = Z1|Z2 boundary
    // zones[1].range = [z1End, z2End] - so zones[1].range[1] = z2End = Z2|Z3 boundary
    // etc.
    const z1End = zones[0].range[1]
    const z2End = zones[1].range[1]
    const z3End = zones[2].range[1]
    const z4End = zones[3].range[1]
    
    const boundaries: { key: string; value: number; label: string }[] = [
      { key: 'z1End', value: z1End, label: 'Z1|Z2' },
      { key: 'z2End', value: z2End, label: 'Z2|Z3' },
      { key: 'z3End', value: z3End, label: 'Z3|Z4' },
      { key: 'z4End', value: z4End, label: 'Z4|Z5' }
    ]
    
    // Debug: log all boundary positions
    console.log('📍 Boundary positions:', {
      'Z1|Z2 (z1End)': Math.round(z1End),
      'Z2|Z3 (z2End)': Math.round(z2End),
      'Z3|Z4 (z3End)': Math.round(z3End),
      'Z4|Z5 (z4End)': Math.round(z4End),
      mousePower: Math.round(power)
    })
    
    const threshold = 15 // Watt tolerance for detection
    
    // Find the closest boundary within threshold
    let closestBoundary: string | null = null
    let closestDistance = Infinity
    let closestLabel = ''
    
    for (const boundary of boundaries) {
      const distance = Math.abs(power - boundary.value)
      console.log(`  → ${boundary.label}: distance = ${Math.round(distance)}W (boundary at ${Math.round(boundary.value)}W)`)
      if (distance < threshold && distance < closestDistance) {
        closestDistance = distance
        closestBoundary = boundary.key
        closestLabel = boundary.label
      }
    }
    
    if (closestBoundary) {
      console.log(`✅ SELECTED: ${closestLabel} (${closestBoundary})`)
    }
    
    return closestBoundary
  }, [getFiveTrainingZones])

  // Native mouse event handlers for smooth dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const power = pixelToPower(e.clientX)
    if (power === null) return
    
    if (isDragging && dragBoundary) {
      // Smoothly update boundary while dragging
      handleZoneBoundaryChange(dragBoundary, Math.round(power))
    } else {
      // Update hover state
      const boundary = findNearBoundary(power)
      setHoverBoundary(boundary)
    }
  }, [isDragging, dragBoundary, pixelToPower, findNearBoundary, handleZoneBoundaryChange])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Left click only (button 0)
    if (e.button !== 0) return
    
    const power = pixelToPower(e.clientX)
    if (power === null) return
    
    const boundary = findNearBoundary(power)
    if (boundary) {
      console.log(`🖱️ CLICK: Starting drag of ${boundary} at ${Math.round(power)}W`)
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
      setDragBoundary(boundary)
    }
  }, [pixelToPower, findNearBoundary])

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setDragBoundary(null)
      // Auto-save is already triggered by debounced handleZoneBoundaryChange
    }
  }, [isDragging])

  // Attach native event listeners to chart container
  useEffect(() => {
    const container = chartContainerRef.current
    if (!container) return
    
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mouseleave', handleMouseUp)
    
    // Also listen on window for mouseup to handle drag outside container
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('mouseleave', handleMouseUp)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseDown, handleMouseUp])

  // Auto-calculate thresholds when data changes
  useEffect(() => {
    if (webhookData.length >= 4) {
      const calculatedThresholds = calculateThresholds(webhookData)
      setThresholds(calculatedThresholds)
    }
  }, [webhookData])

  // Calculate thresholds automatically when new data arrives (using DMAX as default)
  const calculateThresholds = useCallback((data: LactateWebhookData[]) => {
    if (data.length < 4) return null

    // Use DMAX method as default
    return thresholdMethods.dmax.calculate(data)
  }, [])

  const getLactateChartOption = () => {
    if (webhookData.length === 0) return {}

    const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
    const powers = sortedData.map(d => d.power)
    const lactates = sortedData.map(d => d.lactate)
    const fatOxidation = sortedData.map(d => d.fatOxidation || 0)

    const displayThresholds = getActiveThresholds()
    const methodName = activeOverlay ? thresholdMethods[activeOverlay].name : 'Standard'
    const methodColor = activeOverlay ? thresholdMethods[activeOverlay].color : '#6b7280'

    const trainingZones = getFiveTrainingZones()
    
    // Calculate x-axis min: 15W before Z1 (which starts at first data point)
    const minDataPower = Math.min(...powers)
    const xAxisMin = Math.max(0, minDataPower - 15)  // 15W before Z1/first data

    // Debug logging - check this in browser console when switching methods
    console.log('🔄 Chart Update:', {
      activeMethod: activeOverlay,
      minDataPower: minDataPower.toFixed(0),
      xAxisMin: xAxisMin.toFixed(0),
      lt1Power: displayThresholds?.lt1?.power?.toFixed(0),
      lt2Power: displayThresholds?.lt2?.power?.toFixed(0),
      zonesCount: trainingZones.length
    })

    return {
      animation: false,  // Disable animation for smoother zone dragging
      title: {
        text: `5-Zonen Laktat-Leistungskurve${activeOverlay ? ` (${methodName})` : ''}${isSimulating ? ' 🎭 SIMULATION' : ''}`,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: isSimulating ? '#ea580c' : methodColor
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const dataIndex = params[0].dataIndex
          const data = sortedData[dataIndex]
          return `
            <div>
              <strong>Leistung: ${data.power} W</strong><br/>
              Laktat: ${data.lactate} mmol/L<br/>
              ${data.heartRate ? `HF: ${data.heartRate} bpm<br/>` : ''}
              ${data.fatOxidation ? `Fettox: ${data.fatOxidation.toFixed(2)} g/min<br/>` : ''}
              Zeit: ${new Date(data.timestamp).toLocaleTimeString()}
            </div>
          `
        }
      },
      legend: {
        data: [
          { name: 'Laktat', itemStyle: { color: '#ef4444' } },
          { name: 'Fettoxidation', itemStyle: { color: '#22c55e' } },
          { name: 'Zone 1', itemStyle: { color: 'rgba(144, 238, 144, 0.8)' } },
          { name: 'Zone 2', itemStyle: { color: 'rgba(0, 200, 83, 0.8)' } },
          { name: 'Zone 3', itemStyle: { color: 'rgba(255, 235, 59, 0.8)' } },
          { name: 'Zone 4', itemStyle: { color: 'rgba(255, 152, 0, 0.8)' } },
          { name: 'Zone 5', itemStyle: { color: 'rgba(244, 67, 54, 0.8)' } }
        ],
        top: 'bottom'
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%'
      },
      xAxis: {
        type: 'value',
        name: 'Leistung (Watt)',
        min: xAxisMin,
        nameTextStyle: {
          color: '#374151',
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLabel: {
          color: '#6b7280'
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Laktat (mmol/L)',
          nameTextStyle: {
            color: '#374151',
            fontSize: 14,
            fontWeight: 'bold'
          },
          axisLabel: {
            color: '#6b7280'
          },
          splitLine: {
            lineStyle: {
              color: '#e5e7eb',
              opacity: 0.5
            }
          }
        },
        {
          type: 'value',
          name: 'Fettoxidation (g/min)',
          nameTextStyle: {
            color: '#374151',
            fontSize: 14,
            fontWeight: 'bold'
          },
          position: 'right',
          axisLabel: {
            color: '#6b7280'
          }
        }
      ],
      series: [
        // 5 Seamless Training Zone Areas
        ...trainingZones.map((zone: any, index: number) => ({
          name: `Zone ${zone.id}`,
          type: 'line',
          data: [],
          markArea: {
            silent: true,
            data: [[
              {
                xAxis: zone.range[0],
                itemStyle: {
                  color: zone.color,
                  borderColor: zone.borderColor,
                  borderWidth: 1,
                  opacity: 0.4
                }
              },
              { xAxis: zone.range[1] }
            ]],
            label: {
              show: true,
              position: 'insideTop',
              formatter: `Z${zone.id}`,
              fontSize: 11,
              fontWeight: 'bold',
              color: zone.borderColor.replace('0.6', '1.0'),
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: [2, 4],
              borderRadius: 3
            }
          },
          z: -10
        })),
        // Draggable Zone Boundary Lines
        {
          name: 'Zonengrenzen',
          type: 'line',
          data: [],
          markLine: {
            silent: true,  // Don't trigger chart events, we handle them ourselves
            animation: false,  // No animation for smoother updates
            symbol: ['none', 'none'],
            lineStyle: {
              color: '#1e40af',
              width: 4,
              type: 'solid'
            },
            label: {
              show: true,
              position: 'end',
              formatter: (params: any) => {
                const boundaryNames: Record<number, string> = {
                  0: 'Z1|Z2',
                  1: 'Z2|Z3',
                  2: 'Z3|Z4',
                  3: 'Z4|Z5'
                }
                return boundaryNames[params.dataIndex] || ''
              },
              fontSize: 10,
              fontWeight: 'bold',
              backgroundColor: '#1e40af',
              color: '#fff',
              padding: [2, 4],
              borderRadius: 2
            },
            data: [
              { xAxis: trainingZones[0]?.range[1], name: 'z1End' },
              { xAxis: trainingZones[1]?.range[1], name: 'z2End' },
              { xAxis: trainingZones[2]?.range[1], name: 'z3End' },
              { xAxis: trainingZones[3]?.range[1], name: 'z4End' }
            ].filter(d => d.xAxis !== undefined)
          },
          z: 20
        },
        {
          name: 'Laktat',
          type: 'line',
          smooth: true,
          data: powers.map((power, index) => [power, lactates[index]]), // Correct [x, y] format
          itemStyle: {
            color: '#ef4444'
          },
          lineStyle: {
            color: '#ef4444',
            width: 4
          },
          symbol: 'circle',
          symbolSize: 8,
          z: 10
        },
        ...(fatOxidation.some(val => val > 0) ? [{
          name: 'Fettoxidation',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: powers.map((power, index) => [power, fatOxidation[index]]), // Correct [x, y] format
          itemStyle: {
            color: '#10b981'
          },
          lineStyle: {
            color: '#10b981',
            width: 3,
            type: 'dashed'
          },
          symbol: 'circle',
          symbolSize: 6,
          z: 10
        }] : [])
      ],
      backgroundColor: 'transparent'
    }
  }

  // Fetch available sessions from database (filtered by selected customer)
  const fetchAvailableSessions = async () => {
    try {
      if (selectedCustomer) {
        // Fetch sessions for the selected customer
        const response = await fetch(`/api/customer-sessions?customerId=${selectedCustomer.customer_id}`)
        if (response.ok) {
          const sessions = await response.json()
          setAvailableSessions(sessions.map((session: any) => ({
            id: session.session_id,
            lastUpdated: session.last_updated,
            pointCount: session.point_count
          })))
        } else {
          setAvailableSessions([])
        }
      } else {
        // No customer selected, don't show any sessions
        setAvailableSessions([])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      setAvailableSessions([])
    }
  }

  // Load saved zones from database for a session
  const loadSavedZones = async (customerId: string, sessionIdToLoad: string) => {
    try {
      const response = await fetch(`/api/training-zones?customerId=${customerId}&sessionId=${sessionIdToLoad}`)
      if (response.ok) {
        const savedZones = await response.json()
        if (savedZones && savedZones.zone_boundaries) {
          // Parse the saved zone boundaries
          const zoneData = typeof savedZones.zone_boundaries === 'string' 
            ? JSON.parse(savedZones.zone_boundaries) 
            : savedZones.zone_boundaries
          
          if (zoneData.boundaries) {
            console.log('📂 Loaded saved zones for session:', sessionIdToLoad, zoneData.boundaries)
            
            // Store the saved adjusted boundaries - these are always available via "Adjusted" button
            setSavedAdjustedBoundaries(zoneData.boundaries)
            setHasSavedAdjustedZones(true)
            
            // Don't auto-apply - let user choose "Adjusted" button to apply
            // setCustomZoneBoundaries(zoneData.boundaries)
            
            // Restore the saved method if available
            if (savedZones.method && savedZones.method !== 'custom' && savedZones.method !== 'adjusted') {
              setActiveOverlay(savedZones.method as OverlayType)
            }
            return true
          }
        }
      }
      // No saved zones found
      setHasSavedAdjustedZones(false)
      setSavedAdjustedBoundaries(null)
      return false
    } catch (error) {
      console.error('Failed to load saved zones:', error)
      setHasSavedAdjustedZones(false)
      setSavedAdjustedBoundaries(null)
      return false
    }
  }

  // Switch to a different session
  const switchToSession = async (newSessionId: string) => {
    try {
      const response = await fetch(`/api/lactate-webhook?sessionId=${newSessionId}`)
      if (response.ok) {
        const result = await response.json()
        setSessionIdLocal(newSessionId)
        setSelectedSessionId(newSessionId) // Persist in global context
        setWebhookData(result.data || [])
        setThresholds(null) // Reset thresholds for new session
        
        // Reset zone boundaries - will be recalculated or loaded from DB
        setCustomZoneBoundaries(null)
        setHasSavedAdjustedZones(false)
        setSavedAdjustedBoundaries(null)
        setChartKey(prev => prev + 1) // Force chart refresh
        
        // Try to load saved zones for this session
        if (selectedCustomer) {
          await loadSavedZones(selectedCustomer.customer_id, newSessionId)
        }
      }
    } catch (error) {
      console.error('Failed to switch session:', error)
    }
  }

  // Subscribe to global data service
  useEffect(() => {
    const state = lactateDataService.getState()
    setIsReceivingData(state.isReceiving)
    setIsSimulating(state.isSimulating || false)
    
    // If we have a persisted session from context, restore it
    if (selectedSessionId) {
      setSessionIdLocal(selectedSessionId)
      // Load the session data
      fetch(`/api/lactate-webhook?sessionId=${selectedSessionId}`)
        .then(res => res.ok ? res.json() : null)
        .then(result => {
          if (result?.data) {
            setWebhookData(result.data)
          }
        })
        .catch(console.error)
    } else {
      // No persisted session, use lactateDataService state
      setSessionIdLocal(state.sessionId)
    }
    
    // Subscribe to data changes
    const unsubscribe = lactateDataService.subscribe((data) => {
      setWebhookData(data)
      // Update simulation state
      const currentState = lactateDataService.getState()
      setIsSimulating(currentState.isSimulating || false)
    })
    
    // Fetch available sessions on mount
    fetchAvailableSessions()
    
    // Poll for new sessions every 10 seconds
    const sessionInterval = setInterval(fetchAvailableSessions, 10000)
    
    return () => {
      unsubscribe()
      clearInterval(sessionInterval)
    }
  }, [selectedSessionId])

  // Refetch sessions when selected customer changes
  useEffect(() => {
    fetchAvailableSessions()
    // Reset zones when customer changes
    setCustomZoneBoundaries(null)
    setHasSavedAdjustedZones(false)
    setSavedAdjustedBoundaries(null)
  }, [selectedCustomer])

  // Load saved zones when session and customer are available
  useEffect(() => {
    if (selectedCustomer && sessionId && webhookData.length > 0) {
      loadSavedZones(selectedCustomer.customer_id, sessionId)
    }
  }, [selectedCustomer, sessionId, webhookData.length])

  const simulateData = () => {
    lactateDataService.simulateData()
  }

  const clearSimulation = () => {
    lactateDataService.clearSimulation()
    setThresholds(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Laktat-Performance-Kurve
          </h2>
          {selectedCustomer && (
            <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
              👤 {selectedCustomer.name} ({selectedCustomer.customer_id})
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={simulateData}
              disabled={isReceivingData}
              className="button-press px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-md"
            >
              🎭 Simulieren
            </button>
            {isSimulating && (
              <button
                onClick={clearSimulation}
                className="button-press px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md"
              >
                🗑️ Simulation Löschen
              </button>
            )}
          </div>
          
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {isSimulating ? (
              <span className="text-orange-600 dark:text-orange-400">
                🎭 Simulierte Datenpunkte: <span className="font-semibold">{webhookData.length}</span>
                <span className="ml-2 text-xs">(nicht in Datenbank gespeichert)</span>
              </span>
            ) : (
              <span>
                📊 Datenpunkte: <span className="font-semibold">{webhookData.length}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Customer Selection Hint */}
      {!selectedCustomer && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <span className="text-lg">ℹ️</span>
            <div>
              <p className="font-medium">Kein Kunde ausgewählt</p>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Gehen Sie zum "Lactate Input" Tab und wählen Sie einen Kunden aus, um nur deren Sessions anzuzeigen.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session Management */}
      {availableSessions.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              📋 Session {selectedCustomer ? `(${selectedCustomer.name})` : '(Alle Kunden)'}:
            </label>
            <select
              value={sessionId || ''}
              onChange={(e) => switchToSession(e.target.value)}
              title="Session auswählen"
              className="flex-1 min-w-[300px] px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Session auswählen --</option>
              {availableSessions.map((session, index) => (
                <option key={session.id} value={session.id}>
                  {session.id.startsWith('auto_') ? '🤖 Automatisch' : '👤 Manuell'} | {session.pointCount} Punkte | {new Date(session.lastUpdated).toLocaleString()}
                </option>
              ))}
            </select>
            <button
              onClick={fetchAvailableSessions}
              className="px-3 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md"
            >
              🔄 Aktualisieren
            </button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {availableSessions.length} Session{availableSessions.length !== 1 ? 's' : ''} verfügbar
            </span>
          </div>
        </div>
      )}

      {/* Scientific Method Overlay Buttons */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          Wissenschaftliche Schwellenmethoden
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {Object.entries(thresholdMethods).map(([key, method]) => (
            <button
              key={key}
              onClick={() => handleOverlaySelect(key as OverlayType)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 transform ${
                activeOverlay === key && !customZoneBoundaries
                  ? 'border-current shadow-xl scale-95 ring-2 ring-opacity-50 pressed'
                  : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 hover:scale-105 hover:shadow-md'
              } active:scale-90 active:shadow-inner`}
              style={{
                backgroundColor: activeOverlay === key && !customZoneBoundaries ? `${method.color}30` : 'transparent',
                borderColor: activeOverlay === key && !customZoneBoundaries ? method.color : undefined,
                color: activeOverlay === key && !customZoneBoundaries ? method.color : undefined,
                boxShadow: activeOverlay === key && !customZoneBoundaries ? `inset 0 2px 4px rgba(0,0,0,0.15), 0 0 0 2px ${method.color}40` : undefined
              }}
            >
              <div className="text-center">
                <div className="font-bold text-sm mb-1">{method.name}</div>
                <div className="text-xs opacity-80">{method.description.split(' ').slice(0, 3).join(' ')}</div>
              </div>
            </button>
          ))}
          
          {/* Adjusted Button - shows when saved adjusted zones exist OR when user has made manual changes */}
          {(hasSavedAdjustedZones || customZoneBoundaries !== null) && (
            <button
              onClick={applyAdjustedZones}
              disabled={!savedAdjustedBoundaries && !customZoneBoundaries}
              className={`p-3 rounded-lg border-2 transition-all duration-200 transform ${
                customZoneBoundaries !== null
                  ? 'border-purple-500 shadow-xl scale-95 ring-2 ring-purple-300 ring-opacity-50'
                  : 'border-zinc-300 dark:border-zinc-600 hover:border-purple-400 hover:scale-105 hover:shadow-md'
              } active:scale-90 active:shadow-inner`}
              style={{
                backgroundColor: customZoneBoundaries !== null ? 'rgba(147, 51, 234, 0.2)' : 'transparent',
                color: customZoneBoundaries !== null ? '#9333ea' : undefined
              }}
            >
              <div className="text-center">
                <div className="font-bold text-sm mb-1">✏️ Adjusted</div>
                <div className="text-xs opacity-80">Manuell angepasst</div>
              </div>
            </button>
          )}
        </div>
        
        {/* Info about current selection */}
        {customZoneBoundaries && (
          <div className="mt-3 text-sm text-purple-600 dark:text-purple-400 flex items-center gap-2">
            <span>✏️ Manuelle Anpassungen aktiv (automatisch gespeichert)</span>
          </div>
        )}
      </div>

      {/* Chart */}
      {webhookData.length > 0 && (
        <div 
          ref={chartContainerRef}
          className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6"
          style={{ cursor: hoverBoundary ? 'ew-resize' : 'default' }}
        >
          <div className="mb-2 text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
              💡 Klicken + Ziehen auf den blauen Linien verschiebt die Zonengrenzen
            </span>
            {hoverBoundary && !isDragging && (
              <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">
                ← {hoverBoundary === 'z1End' ? 'Z1|Z2' : hoverBoundary === 'z2End' ? 'Z2|Z3' : hoverBoundary === 'z3End' ? 'Z3|Z4' : 'Z4|Z5'} Grenze verschieben
              </span>
            )}
            {isDragging && dragBoundary && (
              <span className="text-green-600 dark:text-green-400 font-bold text-xs">
                ✓ {dragBoundary === 'z1End' ? 'Z1|Z2' : dragBoundary === 'z2End' ? 'Z2|Z3' : dragBoundary === 'z3End' ? 'Z3|Z4' : 'Z4|Z5'} wird verschoben
              </span>
            )}
          </div>
          <ReactEcharts
            key={`chart-${chartKey}`}
            ref={chartRef}
            option={getLactateChartOption()}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
            lazyUpdate={false}
            style={{ 
              height: '500px', 
              width: '100%'
            }}
            theme="light"
          />
        </div>
      )}

      {/* Zone Boundary Status */}
      {webhookData.length > 0 && (() => {
        const zones = getFiveTrainingZones()
        const defaults = getDefaultZoneBoundaries()
        const current = customZoneBoundaries || defaults
        if (!current || zones.length === 0) return null
        
        const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
        const minPower = Math.min(...sortedData.map(d => d.power))
        const maxPower = Math.max(...sortedData.map(d => d.power))
        
        return (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                🎯 Trainingszonen Übersicht
              </h3>
              {customZoneBoundaries && (
                <span className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  ✏️ Manuell angepasst
                  {!selectedCustomer && <span className="text-orange-500">(nicht gespeichert)</span>}
                </span>
              )}
            </div>
            
            {/* Visual zone bar */}
            <div className="mb-4">
              <div className="flex h-12 rounded-lg overflow-hidden border-2 border-zinc-300 dark:border-zinc-600 shadow-inner">
                {zones.map((zone, index) => {
                  const totalRange = maxPower - minPower + 50
                  const zoneWidth = ((zone.range[1] - zone.range[0]) / totalRange) * 100
                  return (
                    <div
                      key={zone.id}
                      className="flex flex-col items-center justify-center text-xs font-bold text-zinc-800 transition-all duration-200 border-r-2 border-white/50 last:border-r-0"
                      style={{ 
                        width: `${zoneWidth}%`, 
                        backgroundColor: zone.color,
                        minWidth: '50px'
                      }}
                    >
                      <span className="text-sm">Z{zone.id}</span>
                      <span className="text-[10px] opacity-75">{Math.round(zone.range[0])}-{Math.round(zone.range[1])}W</span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Zone boundary details in a grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Z1 | Z2</div>
                <div className="text-lg font-bold text-blue-800 dark:text-blue-200">{Math.round(current.z1End)} W</div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">Z2 | Z3 (LT1)</div>
                <div className="text-lg font-bold text-green-800 dark:text-green-200">{Math.round(current.z2End)} W</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Z3 | Z4 (LT2)</div>
                <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">{Math.round(current.z3End)} W</div>
              </div>
              <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Z4 | Z5</div>
                <div className="text-lg font-bold text-orange-800 dark:text-orange-200">{Math.round(current.z4End)} W</div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between text-xs text-zinc-500">
              <span>{Math.round(minPower)} W</span>
              <span>{Math.round(maxPower)} W</span>
            </div>
          </div>
        )
      })()}

      {/* 5-Zone Training Legend */}
      {webhookData.length > 0 && (() => {
        const fiveZones = getFiveTrainingZones()
        const methodName = activeOverlay ? thresholdMethods[activeOverlay].name : 'Standard'

        return (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100 text-center">
              5-Zonen Trainingsmodell (Nahtlos) {activeOverlay ? `(${methodName})` : ''}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {fiveZones.map((zone: any, index: number) => (
                <div 
                  key={index}
                  className="relative p-4 rounded-lg border-2 transition-all hover:scale-105 hover:shadow-lg"
                  style={{ 
                    backgroundColor: zone.color,
                    borderColor: zone.borderColor
                  }}
                >
                  <div className="text-center">
                    <div className="font-bold text-lg text-zinc-800 dark:text-zinc-900 mb-1">
                      Zone {zone.id}
                    </div>
                    <div className="font-medium text-sm text-zinc-700 dark:text-zinc-800 mb-2">
                      {zone.name.split(' - ')[1]}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-700 mb-2">
                      {zone.description}
                    </div>
                    
                    {/* Power Range */}
                    <div className="mb-2">
                      <div className="inline-block px-3 py-1 bg-white dark:bg-zinc-100 rounded-full mb-1">
                        <span className="text-xs font-mono font-bold text-zinc-800">
                          {Math.round(zone.range[0])} - {Math.round(zone.range[1])} W
                        </span>
                      </div>
                    </div>
                    
                    {/* Lactate Range */}
                    <div className="mb-2">
                      <div className="inline-block px-2 py-1 bg-red-100 dark:bg-red-200 rounded-full">
                        <span className="text-xs font-semibold text-red-800">
                          {zone.lactateRange}
                        </span>
                      </div>
                    </div>
                    
                    {/* Heart Rate */}
                    <div className="text-xs text-zinc-600 dark:text-zinc-700">
                      {zone.intensity}
                    </div>
                  </div>
                  
                  {/* Zone number badge */}
                  <div 
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                    style={{ backgroundColor: zone.borderColor.replace('0.6', '1.0') }}
                  >
                    {zone.id}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Scientific explanation */}
            <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <h4 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Nahtlose Zonen-Grenzen:
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Die 5 Zonen grenzen perfekt aneinander an - ohne Lücken oder Überschneidungen. 
                Jede Zone repräsentiert einen spezifischen Trainingsbereich mit unterschiedlichen physiologischen Eigenschaften.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-500 dark:text-zinc-500">
                <div><strong>Zone 1-2:</strong> Fettstoffwechsel dominiert, aerobe Kapazität</div>
                <div><strong>Zone 3:</strong> Übergangsbereich, erste Laktatakkumulation</div>
                <div><strong>Zone 4:</strong> Laktatschwelle, maximaler Steady State</div>
                <div><strong>Zone 5:</strong> Anaerobe Glykolyse, VO₂max Bereich</div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default LactatePerformanceCurve