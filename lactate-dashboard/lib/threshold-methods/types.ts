/**
 * Common types and helper functions for threshold calculation methods
 */

import { LactateDataPoint, ThresholdPoint } from '../types'

export interface ThresholdMethodResult {
  lt1: ThresholdPoint | null
  lt2: ThresholdPoint | null
  methodName: string
  reference: string
  notes?: string
}

export type ThresholdCalculator = (data: LactateDataPoint[]) => ThresholdMethodResult

/**
 * Helper: Linear interpolation between two points to find threshold at specific lactate level
 * WITH EXTRAPOLATION AND VALIDATION (from original working version)
 */
export function interpolateThreshold(
  data: LactateDataPoint[], 
  targetLactate: number
): ThresholdPoint | null {
  if (data.length < 2) {
    return null
  }
  
  const minLactate = Math.min(...data.map(d => d.lactate))
  const maxLactate = Math.max(...data.map(d => d.lactate))
  
  // Check if target lactate is within the measured range
  if (targetLactate < minLactate) {
    // Wenn Zielwert knapp unter Minimum liegt (< 10% Abweichung), extrapoliere vom ersten Punkt
    const deviation = (minLactate - targetLactate) / minLactate
    if (deviation < 0.1 && data.length >= 2) {
      // Lineare Extrapolation vom ersten zum zweiten Punkt
      const slope = (data[1].lactate - data[0].lactate) / (data[1].power - data[0].power)
      const extrapolatedPower = data[0].power - (data[0].lactate - targetLactate) / slope
      if (extrapolatedPower > 0) {
        return { power: Math.round(extrapolatedPower * 100) / 100, lactate: targetLactate }
      }
    }
    return null
  }
  
  if (targetLactate > maxLactate) {
    return null
  }
  
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].lactate <= targetLactate && data[i + 1].lactate >= targetLactate) {
      const lactateDiff = data[i + 1].lactate - data[i].lactate
      
      // Verhindere Division durch Null
      if (lactateDiff === 0) {
        return null
      }
      
      const ratio = (targetLactate - data[i].lactate) / lactateDiff
      const power = data[i].power + ratio * (data[i + 1].power - data[i].power)
      
      // Validiere das Ergebnis
      if (isNaN(power) || !isFinite(power) || power < 0) {
        return null
      }
      
      const result = { power: Math.round(power * 100) / 100, lactate: targetLactate }
      return result
    }
  }
  
  return null
}

/**
 * Helper: Calculate baseline as mean of first k points
 */
export function calculateBaseline(data: LactateDataPoint[], k: number = 3): number {
  const points = Math.min(k, data.length)
  const sum = data.slice(0, points).reduce((acc, d) => acc + d.lactate, 0)
  return sum / points
}

/**
 * Helper: Calculate minimum lactate in a range
 */
export function findMinLactate(data: LactateDataPoint[]): ThresholdPoint | null {
  if (data.length === 0) return null
  
  let minPoint = data[0]
  for (const point of data) {
    if (point.lactate < minPoint.lactate) {
      minPoint = point
    }
  }
  return { power: minPoint.power, lactate: minPoint.lactate }
}
