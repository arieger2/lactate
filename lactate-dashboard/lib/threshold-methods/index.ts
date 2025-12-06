/**
 * Threshold Methods Index
 * 
 * Central export point for all scientifically validated lactate threshold
 * calculation methods. Each method is based on published research and implements
 * the algorithm exactly as described in the original papers.
 * 
 * All methods work identically for both cycling (Watt) and running (km/h) tests,
 * as the calculations are based on geometric principles that are unit-independent.
 */

import { LactateDataPoint } from '../types'
import { ThresholdMethodResult } from './types'

// Import only scientifically validated threshold methods with clear original paper definitions
import { calculateMader } from './mader'           // Heck et al. (1985) - 4 mmol OBLA
import { calculateDMAX } from './dmax'             // Cheng et al. (1992) - Maximum distance method
import { calculateDickhuth } from './dickhuth'     // Dickhuth et al. (1999) - LE + 1.5 mmol
import { calculateModDMAX } from './moddmax'       // Bishop et al. (1998) - Modified DMAX

export type ThresholdMethod = 
  | 'mader'      // 4 mmol OBLA (Heck 1985)
  | 'dmax'       // DMAX (Cheng 1992)
  | 'dickhuth'   // Dickhuth IAT (Dickhuth 1999)
  | 'moddmax'    // Modified DMAX (Bishop 1998)
  | 'adjusted'   // Manual adjustment

/**
 * Calculate thresholds using the specified method
 * @param data - Array of lactate data points (sorted by power/speed)
 * @param method - The threshold calculation method to use
 * @returns Threshold results including LT1, LT2, and method metadata
 */
export function calculateThresholdsByMethod(
  data: LactateDataPoint[],
  method: ThresholdMethod
): ThresholdMethodResult {
  // Sort data by power/speed and ensure numeric values
  const sortedData = [...data]
    .map(d => ({
      ...d,
      power: Number(d.power),
      lactate: Number(d.lactate),
      heartRate: d.heartRate ? Number(d.heartRate) : undefined
    }))
    .sort((a, b) => a.power - b.power)

  switch (method) {
    case 'mader':
      return calculateMader(sortedData)
    
    case 'dmax':
      return calculateDMAX(sortedData)
    
    case 'dickhuth':
      return calculateDickhuth(sortedData)
    
    case 'moddmax':
      return calculateModDMAX(sortedData)
    
    case 'adjusted':
      return {
        lt1: null,
        lt2: null,
        methodName: 'Manually Adjusted',
        reference: 'User-defined',
        notes: 'Thresholds manually adjusted by user'
      }
    
    default:
      return {
        lt1: null,
        lt2: null,
        methodName: 'Unknown',
        reference: 'N/A',
        notes: `Unknown method: ${method}`
      }
  }
}

/**
 * Get human-readable display name for a method
 */
export function getMethodDisplayName(method: ThresholdMethod): string {
  const names: Record<ThresholdMethod, string> = {
    mader: '4 mmol OBLA',
    dmax: 'DMAX',
    dickhuth: 'Dickhuth (IAT)',
    moddmax: 'ModDMAX',
    adjusted: 'Manually Adjusted'
  }
  return names[method] || method
}

/**
 * Get scientific reference for a method
 */
export function getMethodReference(method: ThresholdMethod): string {
  const references: Record<ThresholdMethod, string> = {
    mader: 'Heck et al. (1985)',
    dmax: 'Cheng et al. (1992)',
    dickhuth: 'Dickhuth et al. (1999)',
    moddmax: 'Bishop et al. (1998)',
    adjusted: 'User-defined'
  }
  return references[method] || 'N/A'
}

// Re-export types and helpers
export type { ThresholdMethodResult } from './types'
export { interpolateThreshold, calculateBaseline, findMinLactate } from './types'
