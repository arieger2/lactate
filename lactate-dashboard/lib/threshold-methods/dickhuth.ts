/**
 * Dickhuth Method - Individuelle anaerobe Schwelle (IAS)
 * 
 * Reference:
 * Dickhuth, H.-H., Yin, L., Niess, A., Röcker, K., Mayer, F., Heitkamp, H.-C., et al. (1999).
 * "Ventilatory and lactate thresholds in endurance athletes."
 * European Journal of Applied Physiology, 79, 9–16.
 * https://doi.org/10.1007/s004210050457
 * 
 * Method:
 * - Calculate individual baseline from first 2-3 measurement points
 * - LT1 (Aerobic Threshold): Baseline + 0.5 mmol/L
 * - LT2 (IAS): Baseline + 1.5 mmol/L
 * 
 * This method is particularly suited for endurance athletes and uses
 * individual baseline values rather than fixed lactate concentrations.
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult, calculateBaseline, interpolateThreshold } from './types'

export function calculateDickhuth(data: LactateDataPoint[]): ThresholdMethodResult {
  if (data.length < 3) {
    return {
      lt1: null,
      lt2: null,
      methodName: 'Dickhuth (IAS)',
      reference: 'Dickhuth et al. (1999)',
      notes: 'Insufficient data points (minimum 3 required)'
    }
  }

  // Calculate individual baseline from first 2-3 points
  const k = Math.min(3, Math.floor(data.length / 3))
  const baseline = calculateBaseline(data, k)
  
  console.log('🔍 Dickhuth Input:', {
    dataLength: data.length,
    allLactates: data.map(d => d.lactate),
    allPowers: data.map(d => d.power),
    minLactate: Math.min(...data.map(d => d.lactate)),
    maxLactate: Math.max(...data.map(d => d.lactate))
  })
  
  console.log('🔍 Dickhuth Baseline:', { 
    k, 
    baseline: baseline.toFixed(3), 
    firstPoints: data.slice(0, k).map(d => d.lactate) 
  })
  
  const lt1Target = baseline + 0.5
  const lt2Target = baseline + 1.5
  
  console.log('🔍 Dickhuth Targets:', {
    lt1Target: lt1Target.toFixed(3),
    lt2Target: lt2Target.toFixed(3)
  })
  
  // LT1: Baseline + 0.5 mmol/L (Aerobic Threshold)
  const lt1 = interpolateThreshold(data, lt1Target)
  console.log('🔍 Dickhuth LT1 Result:', lt1)
  
  // LT2: Baseline + 1.5 mmol/L (Individual Anaerobic Threshold)
  const lt2 = interpolateThreshold(data, lt2Target)
  console.log('🔍 Dickhuth LT2 Result:', lt2)
  
  return {
    lt1,
    lt2,
    methodName: 'Dickhuth (IAS)',
    reference: 'Dickhuth et al. (1999)',
    notes: `Baseline: ${baseline.toFixed(2)} mmol/L (mean of first ${k} points)`
  }
}
