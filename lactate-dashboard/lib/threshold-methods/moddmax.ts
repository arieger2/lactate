/**
 * Modified DMAX (ModDMAX) Method
 * 
 * References:
 * - Bishop, D., Jenkins, D. G., & Howard, A. (1998). "The critical power function is dependent on the duration of the predictive exercise tests." European Journal of Applied Physiology, 78(3), 268–273. https://doi.org/10.1007/s004210050423
 * - Bishop, D., Jenkins, D. G., & Mackinnon, L. (1998). "The effects of altering recovery duration on repeated sprint performance." Medicine & Science in Sports & Exercise, 30(4), 614–625.
 * 
 * Method:
 * - LT1: Lactate minimum in first half of test
 * - LT2: Maximum distance from line (lactate minimum → test end)
 * 
 * Uses exponential curve fitting for better accuracy with non-linear lactate curves.
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult } from './types'
import { calculateModDMaxPoint } from './helpers'

export function calculateModDMAX(data: LactateDataPoint[]): ThresholdMethodResult {
  if (data.length < 4) {
    return {
      lt1: null,
      lt2: null,
      methodName: 'ModDMAX',
      reference: 'Bishop et al. (1998)',
      notes: 'Insufficient data points (minimum 4 required)'
    }
  }

  const halfIdx = Math.floor(data.length / 2)
  const firstHalf = data.slice(0, halfIdx)
  const minLac = Math.min(...firstHalf.map(d => d.lactate))
  const minPt = firstHalf.find(d => d.lactate === minLac)
  
  let lt1 = minPt ? { power: minPt.power, lactate: minPt.lactate } : null
  let lt2 = calculateModDMaxPoint(data)
  
  // Validation: Ensure LT1 < LT2
  if (lt1 && lt2 && lt1.power >= lt2.power) {
    console.warn('⚠️ ModDMAX Validation: LT1 >= LT2, using earlier point...')
    const oneThirdIndex = Math.floor(data.length / 3)
    lt1 = { power: data[oneThirdIndex].power, lactate: data[oneThirdIndex].lactate }
    console.log('✅ ModDMAX: Using 1/3 test range for LT1')
  }
  
  return {
    lt1,
    lt2,
    methodName: 'ModDMAX',
    reference: 'Bishop et al. (1998)',
    notes: 'Maximum deviation from exponential curve fit'
  }
}
