/**
 * +1 mmol/L Method
 * 
 * Reference:
 * Faude, O., Kindermann, W., & Meyer, T. (2009).
 * "Lactate threshold concepts: How valid are they?"
 * Sports Medicine, 39(6), 469–490.
 * https://doi.org/10.2165/00007256-200939060-00003
 * 
 * Method:
 * - Find lactate minimum in first half of test (baseline)
 * - LT1: Lactate minimum point
 * - LT2: Lactate minimum + 1.0 mmol/L
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult, interpolateThreshold } from './types'

export function calculatePlus1mmol(data: LactateDataPoint[]): ThresholdMethodResult {
  if (data.length < 4) {
    return {
      lt1: null,
      lt2: null,
      methodName: '+1 mmol/L',
      reference: 'Faude et al. (2009)',
      notes: 'Insufficient data points (minimum 4 required)'
    }
  }

  const halfPoint = Math.floor(data.length / 2)
  const firstHalf = data.slice(0, halfPoint)
  const minLactate = Math.min(...firstHalf.map(d => d.lactate))
  const minPoint = firstHalf.find(d => d.lactate === minLactate)
  
  const lt1 = minPoint ? { power: minPoint.power, lactate: minPoint.lactate } : null
  const lt2 = interpolateThreshold(data, minLactate + 1.0)
  
  return {
    lt1,
    lt2,
    methodName: '+1 mmol/L',
    reference: 'Faude et al. (2009)',
    notes: `Lactate minimum: ${minLactate.toFixed(2)} mmol/L + 1.0`
  }
}
