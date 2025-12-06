/**
 * Mader 4 mmol (OBLA) Method
 * 
 * References:
 * - Mader, A., Heck, H., & Hollmann, W. (1976). "Evaluation of the lactate steady state by means of a treadmill exercise test." European Journal of Applied Physiology, 34(3), 218–224. https://doi.org/10.1007/BF00423254
 * - Heck, H., Mader, A., Hess, G., Mücke, S., Müller, R., & Hollmann, W. (1985). "Justification of the 4-mmol/l lactate threshold." International Journal of Sports Medicine, 6(3), 117–130. https://doi.org/10.1007/s002210050116
 * 
 * Method:
 * - LT1: Fixed at 2.0 mmol/L
 * - LT2: Fixed at 4.0 mmol/L (OBLA = Onset of Blood Lactate Accumulation)
 * 
 * This is the classical fixed lactate threshold method, widely used despite
 * not accounting for individual baseline variations.
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult, interpolateThreshold } from './types'

export function calculateMader(data: LactateDataPoint[]): ThresholdMethodResult {
  if (data.length < 3) {
    return {
      lt1: null,
      lt2: null,
      methodName: 'Mader 4 mmol (OBLA)',
      reference: 'Mader et al. (1976), Heck et al. (1985)',
      notes: 'Insufficient data points (minimum 3 required)'
    }
  }

  const lt1 = interpolateThreshold(data, 2.0)
  const lt2 = interpolateThreshold(data, 4.0)
  
  return {
    lt1,
    lt2,
    methodName: 'Mader 4 mmol (OBLA)',
    reference: 'Mader et al. (1976), Heck et al. (1985)',
    notes: 'Fixed thresholds: LT1 at 2.0 mmol/L, LT2 at 4.0 mmol/L'
  }
}
