/**
 * FatMax/LT Method
 * 
 * References:
 * - San-Millán, I., & Brooks, G. A. (2018). "Assessment of metabolic flexibility and metabolic health in athletes: The role of lactate." Sports Medicine, 48(1), 23–32. https://doi.org/10.1007/s40279-017-0751-9
 * - Achten, J., & Jeukendrup, A. E. (2003). "Maximal fat oxidation during exercise in trained men." International Journal of Sports Medicine, 24(1), 2–8. https://doi.org/10.1055/s-2003-37273
 * 
 * Method:
 * - Baseline: Minimum of first 3 points
 * - LT1 (FatMax approximation): Baseline + 0.5 mmol/L
 * - LT2 (MLSS approximation): Baseline + 1.5 mmol/L
 * 
 * This method estimates FatMax (maximal fat oxidation rate) and MLSS (maximal
 * lactate steady state) based on lactate kinetics.
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult, interpolateThreshold } from './types'

export function calculateFatMax(data: LactateDataPoint[]): ThresholdMethodResult {
  if (data.length < 3) {
    return {
      lt1: null,
      lt2: null,
      methodName: 'FatMax/LT',
      reference: 'San-Millán & Brooks (2018), Achten & Jeukendrup (2003)',
      notes: 'Insufficient data points (minimum 3 required)'
    }
  }

  const firstThree = data.slice(0, Math.min(3, data.length))
  const baseline = Math.min(...firstThree.map(d => d.lactate))
  
  console.log('🔍 FatMax Baseline:', { 
    baseline: baseline.toFixed(3), 
    firstThree: firstThree.map(d => d.lactate) 
  })
  
  // LT1 (FatMax approximation): Baseline + 0.5 mmol/L
  const lt1 = interpolateThreshold(data, baseline + 0.5)
  
  // LT2 (MLSS approximation): Baseline + 1.5 mmol/L
  const lt2 = interpolateThreshold(data, baseline + 1.5)
  
  return {
    lt1,
    lt2,
    methodName: 'FatMax/LT',
    reference: 'San-Millán & Brooks (2018), Achten & Jeukendrup (2003)',
    notes: `Baseline: ${baseline.toFixed(2)} mmol/L, FatMax at +0.5, MLSS at +1.5`
  }
}
