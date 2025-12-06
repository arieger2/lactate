/**
 * DMAX Method
 * 
 * Reference:
 * Cheng, B., Kuipers, H., Snyder, A. C., Keizer, H. A., Jeukendrup, A., & Hesselink, M. K. C. (1992).
 * "A new approach for the determination of ventilatory and lactate thresholds."
 * International Journal of Sports Medicine, 13(7), 518–522.
 * https://doi.org/10.1055/s-2007-1021309
 * 
 * Method:
 * - LT2: Point with maximum perpendicular distance from baseline to end point line
 * - LT1: First deflection point where slope increases ≥50% from baseline
 * 
 * This geometric method is unit-independent and works for both cycling (Watt)
 * and running (km/h) tests.
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult, interpolateThreshold } from './types'
import { calculateDMaxPoint, calculateDMaxLT1Point } from './helpers'

export function calculateDMAX(data: LactateDataPoint[]): ThresholdMethodResult {
  if (data.length < 3) {
    return {
      lt1: null,
      lt2: null,
      methodName: 'DMAX',
      reference: 'Cheng et al. (1992)',
      notes: 'Insufficient data points (minimum 3 required)'
    }
  }

  let lt2 = calculateDMaxPoint(data)
  let lt1 = calculateDMaxLT1Point(data)
  
  // Validation: LT1 must occur before LT2
  if (lt1 && lt2 && lt1.power >= lt2.power) {
    console.warn('⚠️ DMAX Validation: LT1 >= LT2, recalculating LT1...')
    
    const fallbackLT1 = interpolateThreshold(data, 2.0)
    if (fallbackLT1 && fallbackLT1.power < lt2.power) {
      lt1 = fallbackLT1
      console.log('✅ DMAX: Using 2.0 mmol/L fallback for LT1')
    } else {
      const halfLactate = lt2.lactate * 0.6
      lt1 = interpolateThreshold(data, Math.max(halfLactate, 1.5))
      console.log('✅ DMAX: Using 60% of LT2 lactate for LT1')
    }
  }
  
  return {
    lt1,
    lt2,
    methodName: 'DMAX',
    reference: 'Cheng et al. (1992)',
    notes: 'Maximum distance from baseline to end-point line'
  }
}
