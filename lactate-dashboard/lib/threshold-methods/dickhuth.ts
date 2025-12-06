/**
 * Dickhuth Method - Individuelle anaerobe Schwelle (IAS)
 * 
 * Reference:
 * Dickhuth, H.-H. et al. (1999). "Assessment of the Lactate Threshold by Means of Basal Blood Lactate Concentration."
 * Int J Sports Med 1999.
 * 
 * ORIGINAL PAPER DEFINITION:
 * (A) Lactate Equivalent Point (LEP / LT1) = Punkt minimaler Laktat/Leistung-Ratio
 *     "The lactate equivalent (LE) was defined as the workload at the lowest lactate-to-power ratio."
 * 
 * (B) Individual Anaerobic Threshold (IAT / LT2) = Laktat am LE + 1,5 mmol/l
 *     "The individual anaerobic threshold was calculated as the lactate concentration at LE plus 1.5 mmol/L."
 * 
 * IMPORTANT: NOT "Baseline + 1.5" but "LE + 1.5" according to original paper.
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult, interpolateThreshold } from './types'

export function calculateDickhuth(data: LactateDataPoint[]): ThresholdMethodResult {
  if (data.length < 3) {
    return {
      lt1: null,
      lt2: null,
      methodName: 'Dickhuth (IAT)',
      reference: 'Dickhuth et al. (1999)',
      notes: 'Insufficient data points (minimum 3 required)'
    }
  }

  // (A) Find Lactate Equivalent Point (LEP) = minimum lactate/power ratio
  let minRatio = Infinity
  let lePoint: LactateDataPoint | null = null
  
  for (const point of data) {
    const ratio = point.lactate / point.power
    if (ratio < minRatio) {
      minRatio = ratio
      lePoint = point
    }
  }
  
  if (!lePoint) {
    return {
      lt1: null,
      lt2: null,
      methodName: 'Dickhuth (IAT)',
      reference: 'Dickhuth et al. (1999)',
      notes: 'Could not determine Lactate Equivalent Point'
    }
  }
  
  console.log('🔍 Dickhuth LE Point:', {
    power: lePoint.power,
    lactate: lePoint.lactate,
    ratio: minRatio
  })
  
  // LT1 = LE Point (minimum lactate/power ratio)
  const lt1 = {
    power: lePoint.power,
    lactate: lePoint.lactate
  }
  
  // (B) IAT = LE lactate + 1.5 mmol/L
  const iatTarget = lePoint.lactate + 1.5
  const lt2 = interpolateThreshold(data, iatTarget)
  
  console.log('🔍 Dickhuth IAT Target:', {
    lePointLactate: lePoint.lactate.toFixed(2),
    iatTarget: iatTarget.toFixed(2),
    lt2Result: lt2
  })
  
  return {
    lt1,
    lt2,
    methodName: 'Dickhuth (IAT)',
    reference: 'Dickhuth et al. (1999)',
    notes: `LE at ${lePoint.lactate.toFixed(2)} mmol/L, IAT at LE + 1.5 = ${iatTarget.toFixed(2)} mmol/L`
  }
}
