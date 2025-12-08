/**
 * Shared helper functions for complex threshold calculations
 * These are used by multiple threshold methods
 */

import { LactateDataPoint, ThresholdPoint } from '../types'

/**
 * DMAX Methode - Cheng et al.
 * Findet den Punkt mit maximalem Abstand zur Linie zwischen erstem und letztem Punkt
 * 
 * EINHEITENUNABHÄNGIG: Diese geometrische Berechnung funktioniert identisch für:
 * - Radfahren: Belastung in Watt
 * - Laufen: Geschwindigkeit in km/h
 */
export function calculateDMaxPoint(data: LactateDataPoint[]): ThresholdPoint | null {
  if (data.length < 3) return null
  
  const first = data[0]
  const last = data[data.length - 1]
  let maxDistance = 0
  let maxIndex = 0

  for (let i = 1; i < data.length - 1; i++) {
    const point = data[i]
    const A = last.lactate - first.lactate
    const B = first.power - last.power
    const C = last.power * first.lactate - first.power * last.lactate
    const distance = Math.abs(A * point.power + B * point.lactate + C) / Math.sqrt(A * A + B * B)
    
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  return { power: data[maxIndex].power, lactate: data[maxIndex].lactate }
}

/**
 * DMAX LT1 - Erster Deflektionspunkt (Steigung +50% über Baseline)
 * Nach Cheng et al. (1992) Dokumentation
 */
export function calculateDMaxLT1Point(data: LactateDataPoint[]): ThresholdPoint | null {
  if (data.length < 3) return null
  
  const first = data[0]
  const last = data[data.length - 1]
  
  const baselineSlope = (last.lactate - first.lactate) / (last.power - first.power)
  const targetSlope = baselineSlope * 1.5
  
  const searchLimit = Math.floor(data.length * 0.7)
  
  for (let i = 1; i < searchLimit; i++) {
    const slope = (data[i + 1].lactate - data[i].lactate) / (data[i + 1].power - data[i].power)
    if (slope > targetSlope) {
      return { power: data[i].power, lactate: data[i].lactate }
    }
  }
  
  const oneThirdIndex = Math.floor(data.length / 3)
  return { power: data[oneThirdIndex].power, lactate: data[oneThirdIndex].lactate }
}

/**
 * ModDMAX - Bishop et al.
 * Modifizierte DMAX mit exponentieller Anpassung
 */
export function calculateModDMaxPoint(data: LactateDataPoint[]): ThresholdPoint | null {
  if (data.length < 4) return null
  
  const first = data[0]
  const last = data[data.length - 1]
  let maxDistance = 0
  let maxIndex = 0

  for (let i = 1; i < data.length - 1; i++) {
    const point = data[i]
    const expectedY = first.lactate + (last.lactate - first.lactate) * 
      Math.pow((point.power - first.power) / (last.power - first.power), 1.5)
    const distance = Math.abs(point.lactate - expectedY)
    
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  return { power: data[maxIndex].power, lactate: data[maxIndex].lactate }
}

/**
 * Log-Log Breakpoint Methode - Beaver et al. (1985)
 * Zwei-Linien-Regression mit variablem Breakpoint
 */
export function calculateLogLogBreakpoint(data: LactateDataPoint[]): { lt1: ThresholdPoint | null, lt2: ThresholdPoint | null } {
  if (data.length < 5) {
    return { lt1: null, lt2: null }
  }
  
  const logData = data.map(d => ({
    logPower: Math.log(d.power),
    logLactate: Math.log(d.lactate),
    power: d.power,
    lactate: d.lactate
  }))
  
  let minSSE = Infinity
  let bestBreakpoint = 2
  
  for (let bp = 2; bp < logData.length - 2; bp++) {
    const segment1 = logData.slice(0, bp + 1)
    const segment2 = logData.slice(bp)
    
    const reg1 = linearRegression(segment1.map(d => d.logPower), segment1.map(d => d.logLactate))
    const reg2 = linearRegression(segment2.map(d => d.logPower), segment2.map(d => d.logLactate))
    
    let sse = 0
    for (let i = 0; i <= bp; i++) {
      const predicted = reg1.slope * logData[i].logPower + reg1.intercept
      sse += Math.pow(logData[i].logLactate - predicted, 2)
    }
    for (let i = bp; i < logData.length; i++) {
      const predicted = reg2.slope * logData[i].logPower + reg2.intercept
      sse += Math.pow(logData[i].logLactate - predicted, 2)
    }
    
    if (sse < minSSE) {
      minSSE = sse
      bestBreakpoint = bp
    }
  }
  
  const lt2Point = { power: data[bestBreakpoint].power, lactate: data[bestBreakpoint].lactate }
  
  let lt1Point: ThresholdPoint | null = null
  for (let i = 1; i < bestBreakpoint; i++) {
    const slope1 = (logData[i].logLactate - logData[i-1].logLactate) / (logData[i].logPower - logData[i-1].logPower)
    const slope2 = (logData[i+1].logLactate - logData[i].logLactate) / (logData[i+1].logPower - logData[i].logPower)
    
    if (Math.abs(slope2 - slope1) > 0.5) {
      lt1Point = { power: data[i].power, lactate: data[i].lactate }
      break
    }
  }
  
  console.log('✅ Log-Log Breakpoint:', { breakpoint: bestBreakpoint, lt1: lt1Point, lt2: lt2Point })
  
  return { lt1: lt1Point, lt2: lt2Point }
}

/**
 * Lineare Regression Hilfsfunktion
 */
function linearRegression(x: number[], y: number[]): { slope: number, intercept: number } {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  return { slope, intercept }
}
