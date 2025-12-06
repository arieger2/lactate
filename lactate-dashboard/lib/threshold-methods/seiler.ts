/**
 * Seiler 3-Zone Model
 * 
 * Reference:
 * Seiler, S. & Kjerland, G. Ø. (2006).
 * "Quantifying training intensity distribution in elite endurance athletes: Is there evidence for an optimal distribution?"
 * Scandinavian Journal of Medicine & Science in Sports, 16(1), 49–56.
 * https://doi.org/10.1111/j.1600-0838.2004.00418.x
 * 
 * Method:
 * - Baseline: Minimum of first 3 points
 * - VT1 (Zone 1/2 boundary): max(Baseline + 0.5, 1.8 mmol/L)
 * - VT2 (Zone 2/3 boundary): max(Baseline + 2.0, 3.5 mmol/L)
 * 
 * This method defines 3 training zones for polarized training approach.
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult, interpolateThreshold } from './types'

export function calculateSeiler(data: LactateDataPoint[]): ThresholdMethodResult {
  if (data.length < 3) {
    return {
      lt1: null,
      lt2: null,
      methodName: 'Seiler 3-Zone',
      reference: 'Seiler & Kjerland (2006)',
      notes: 'Insufficient data points (minimum 3 required)'
    }
  }

  const firstThree = data.slice(0, Math.min(3, data.length))
  const baseline = Math.min(...firstThree.map(d => d.lactate))
  
  console.log('🔍 Seiler Baseline:', { 
    baseline: baseline.toFixed(3), 
    firstThree: firstThree.map(d => d.lactate) 
  })
  
  // VT1 = max(Baseline + 0.5, 1.8 mmol/L)
  const vt1Target = Math.max(baseline + 0.5, 1.8)
  console.log('🔍 Seiler VT1 target:', vt1Target.toFixed(3))
  const lt1 = interpolateThreshold(data, vt1Target)
  
  // VT2 = max(Baseline + 2.0, 3.5 mmol/L)
  const vt2Target = Math.max(baseline + 2.0, 3.5)
  console.log('🔍 Seiler VT2 target:', vt2Target.toFixed(3))
  const lt2 = interpolateThreshold(data, vt2Target)
  
  return {
    lt1,
    lt2,
    methodName: 'Seiler 3-Zone',
    reference: 'Seiler & Kjerland (2006)',
    notes: `Baseline: ${baseline.toFixed(2)} mmol/L, VT1: ${vt1Target.toFixed(2)}, VT2: ${vt2Target.toFixed(2)}`
  }
}
