/**
 * 4 mmol OBLA Method
 * 
 * Reference:
 * Heck, H. et al. (1985). "Justification of the 4-mmol/L lactate threshold."
 * Int J Sports Med, 1985.
 * 
 * ORIGINAL PAPER DEFINITION:
 * "OBLA was defined as the workload corresponding to a blood lactate concentration of 4 mmol/L."
 * 
 * NOTE: Mader et al. (1976) did NOT define a fixed 4-mmol threshold.
 * The 4-mmol point was introduced by Heck et al. (1985).
 * 
 * This is a pure fixed threshold at exactly 4.0 mmol/L.
 * No LT1 is defined in the original paper.
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult, interpolateThreshold } from './types'

export function calculateMader(data: LactateDataPoint[]): ThresholdMethodResult {
  if (data.length < 3) {
    return {
      lt1: null,
      lt2: null,
      methodName: '4 mmol OBLA',
      reference: 'Heck et al. (1985)',
      notes: 'Insufficient data points (minimum 3 required)'
    }
  }

  // OBLA = fixed 4.0 mmol/L threshold
  const lt2 = interpolateThreshold(data, 4.0)
  
  // No LT1 defined in original paper - using null
  const lt1 = null
  
  return {
    lt1,
    lt2,
    methodName: '4 mmol OBLA',
    reference: 'Heck et al. (1985)',
    notes: 'Fixed threshold at 4.0 mmol/L (no LT1 defined in original paper)'
  }
}
