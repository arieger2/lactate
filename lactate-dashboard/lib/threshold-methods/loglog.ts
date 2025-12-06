/**
 * Log-Log Method
 * 
 * Reference:
 * Beaver, W. L., Wasserman, K., & Whipp, B. J. (1985).
 * "A new method for detecting anaerobic threshold by gas exchange."
 * Journal of Applied Physiology, 60(6), 2020–2027.
 * https://doi.org/10.1152/jappl.1985.60.6.2020
 * 
 * Method:
 * - Transform data to log-log space
 * - Find breakpoint using two-line regression
 * - LT2: Breakpoint in log-log space
 * - LT1: First significant slope change before breakpoint
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult, interpolateThreshold } from './types'
import { calculateLogLogBreakpoint } from './helpers'

export function calculateLogLog(data: LactateDataPoint[]): ThresholdMethodResult {
  if (data.length < 5) {
    return {
      lt1: null,
      lt2: null,
      methodName: 'Log-Log',
      reference: 'Beaver et al. (1985)',
      notes: 'Insufficient data points (minimum 5 required)'
    }
  }

  const result = calculateLogLogBreakpoint(data)
  let lt1 = result.lt1
  let lt2 = result.lt2
  
  // Handle null LT1
  if (lt1 === null && lt2 !== null) {
    console.warn('⚠️ LogLog: No LT1 found, using fallback...')
    const fallbackLT1 = interpolateThreshold(data, 2.0)
    if (fallbackLT1 && fallbackLT1.power < lt2.power) {
      lt1 = fallbackLT1
      console.log('✅ LogLog: Using 2.0 mmol/L fallback for LT1')
    } else {
      const oneThirdIndex = Math.floor(data.length / 3)
      lt1 = { power: data[oneThirdIndex].power, lactate: data[oneThirdIndex].lactate }
      console.log('✅ LogLog: Using 1/3 test range fallback for LT1')
    }
  }
  
  // Validation: LT1 must be before LT2
  if (lt1 && lt2 && lt1.power >= lt2.power) {
    console.warn('⚠️ LogLog Validation: LT1 >= LT2, recalculating LT1...')
    const fallbackLactate = lt2.lactate * 0.6
    lt1 = interpolateThreshold(data, Math.max(fallbackLactate, 1.5))
    console.log('✅ LogLog: Using 60% of LT2 lactate for LT1')
  }
  
  return {
    lt1,
    lt2,
    methodName: 'Log-Log',
    reference: 'Beaver et al. (1985)',
    notes: 'Two-line regression breakpoint in log-log space'
  }
}
