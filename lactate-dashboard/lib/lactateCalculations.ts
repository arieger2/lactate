/**
 * Lactate Threshold Calculations
 * 
 * This module provides the main interface for lactate threshold calculations.
 * All threshold methods are implemented in separate modules under lib/threshold-methods/
 * based on published scientific research.
 * 
 * All calculations work identically for:
 * - Cycling: Power in Watts
 * - Running: Speed in km/h
 * 
 * The geometric principles used are unit-independent.
 */

import { LactateDataPoint, ThresholdPoint, TrainingZone } from './types'
import { 
  calculateThresholdsByMethod,
  getMethodDisplayName as getMethodName,
  getMethodReference,
  type ThresholdMethod as TMethod
} from './threshold-methods'

// ===== TYPE DEFINITIONS =====

export type ThresholdMethod = TMethod

export interface ThresholdResult {
  lt1: ThresholdPoint | null
  lt2: ThresholdPoint | null
  method?: ThresholdMethod
  lt1Missing?: boolean
  lt2Missing?: boolean
  message?: string
  reference?: string
}

// ===== THRESHOLD CALCULATION =====

/**
 * Calculate LT1 and LT2 thresholds using the specified scientific method
 * @param data - Lactate data points (load vs. lactate) - load can be Watts or km/h
 * @param method - Selected threshold method
 * @returns ThresholdResult with LT1 and LT2 points
 * @remarks Works identically for cycling tests (Watt) and running tests (km/h)
 */
export function calculateThresholds(
  data: LactateDataPoint[], 
  method: ThresholdMethod = 'dickhuth'
): ThresholdResult {
  if (data.length === 0) {
    return { 
      lt1: null, 
      lt2: null,
      method,
      lt1Missing: true,
      lt2Missing: true,
      message: 'No data available'
    }
  }

  // Use the modular threshold calculation
  const result = calculateThresholdsByMethod(data, method)
  
  return {
    lt1: result.lt1,
    lt2: result.lt2,
    method,
    lt1Missing: result.lt1 === null,
    lt2Missing: result.lt2 === null,
    message: result.notes || (result.lt1 && result.lt2 ? undefined : 'Threshold calculation not possible'),
    reference: result.reference
  }
}

/**
 * Get human-readable display name for threshold method
 */
export function getMethodDisplayName(method: ThresholdMethod): string {
  return getMethodName(method)
}

// Re-export interpolateThreshold for backward compatibility
export { interpolateThreshold } from './threshold-methods'

// ===== TRAINING ZONE MODELS =====

export type ZoneModel = '5-zones' | '3-zones-a' | '3-zones-b'

/**
 * Calculate training zones based on LT1/LT2 and selected model
 * @param lt1 - LT1 threshold point
 * @param lt2 - LT2 threshold point
 * @param maxPower - Maximum measured load (Watt for cycling, km/h for running)
 * @param method - Selected threshold method
 * @param unit - Unit of measurement ('watt' or 'kmh')
 * @param zoneModel - Zone model: '5-zones', '3-zones-a', or '3-zones-b'
 * @returns Array of training zones
 * @remarks Zone ranges work for both units (Watt/km/h)
 */
export function calculateTrainingZones(
  lt1: ThresholdPoint | null,
  lt2: ThresholdPoint | null,
  maxPower: number,
  method: ThresholdMethod = 'dickhuth',
  unit: string = 'watt',
  zoneModel: ZoneModel = '5-zones'
): TrainingZone[] {
  const lt1Power = lt1?.power || maxPower * 0.65
  const lt2Power = lt2?.power || maxPower * 0.85

  // Handle 3-Zone Models
  if (zoneModel === '3-zones-a') {
    return calculate3ZonesModelA(lt1Power, lt2Power, maxPower)
  }
  
  if (zoneModel === '3-zones-b') {
    return calculate3ZonesModelB(lt1Power, lt2Power, maxPower)
  }

  // 5-Zone Model calculation
  // Dynamically calculate Zone 1 start
  const zone2StartDickhuth = lt1Power * 0.75;
  const zone2StartStandard = lt1Power * 0.68;

  let zone1Start = 0;
  if (method === 'dickhuth') {
    if (unit === 'watt') {
      zone1Start = Math.max(0, zone2StartDickhuth - 50);
    } else if (unit === 'kmh') {
      zone1Start = Math.max(0, zone2StartDickhuth - 3);
    }
  } else {
    if (unit === 'watt') {
      zone1Start = Math.max(0, zone2StartStandard - 50);
    } else if (unit === 'kmh') {
      zone1Start = Math.max(0, zone2StartStandard - 3);
    }
  }


  // Method-specific zone calculation - only for valid methods
  // For dickhuth, use 5-zone model, for others use standard 5-zone
  if (method === 'dickhuth') {
    // Dickhuth: LT1 at LE, LT2 at LE +1.5mmol (smaller spacing)
    return [
      {
        id: 1,
        name: 'Zone 1 - Regeneration',
        range: [zone1Start, zone2StartDickhuth],
        color: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 0.8)',
        description: 'Regenerationsbereich'
      },
      {
        id: 2,
        name: 'Zone 2 - Aerobe Basis',
        range: [zone2StartDickhuth, lt1Power],
        color: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 0.8)',
        description: 'Aerob bis LT1 (LE)'
      },
      {
        id: 3,
        name: 'Zone 3 - Schwelle',
        range: [lt1Power, lt2Power],
        color: 'rgba(251, 191, 36, 0.2)',
        borderColor: 'rgba(251, 191, 36, 0.8)',
        description: 'LT1 bis LT2 (LE + 1.5mmol/L)'
      },
      {
        id: 4,
        name: 'Zone 4 - Anaerob',
        range: [lt2Power, lt2Power * 1.15],
        color: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 0.8)',
        description: 'Anaerober Bereich'
      },
      {
        id: 5,
        name: 'Zone 5 - Power',
        range: [lt2Power * 1.15, maxPower * 1.1],
        color: 'rgba(147, 51, 234, 0.2)',
        borderColor: 'rgba(147, 51, 234, 0.8)',
        description: 'Maximale Power'
      }
    ]
  }

  // Default: Standard 5-zone model (all other methods)
  // Standard 5-Zone Model for all other methods
  // LT1 = End of Zone 2, LT2 = End of Zone 3
  return [
    {
      id: 1,
      name: 'Zone 1 - Regeneration',
      range: [zone1Start, zone2StartStandard],
      color: 'rgba(34, 197, 94, 0.2)',
      borderColor: 'rgba(34, 197, 94, 0.8)',
      description: 'Regeneration & Fettstoffwechsel'
    },
    {
      id: 2,
      name: 'Zone 2 - Aerobe Basis',
      range: [zone2StartStandard, lt1Power],
      color: 'rgba(59, 130, 246, 0.2)',
      borderColor: 'rgba(59, 130, 246, 0.8)',
      description: 'Aerober Grundlagenbereich (bis LT1)'
    },
    {
      id: 3,
      name: 'Zone 3 - Schwelle',
      range: [lt1Power, lt2Power],
      color: 'rgba(251, 191, 36, 0.2)',
      borderColor: 'rgba(251, 191, 36, 0.8)',
      description: 'Tempobereich (LT1 bis LT2)'
    },
    {
      id: 4,
      name: 'Zone 4 - Anaerob',
      range: [lt2Power, lt2Power * 1.08],
      color: 'rgba(239, 68, 68, 0.2)',
      borderColor: 'rgba(239, 68, 68, 0.8)',
      description: 'Schwellenbereich (um LT2)'
    },
    {
      id: 5,
      name: 'Zone 5 - Power',
      range: [lt2Power * 1.08, maxPower * 1.1],
      color: 'rgba(147, 51, 234, 0.2)',
      borderColor: 'rgba(147, 51, 234, 0.8)',
      description: 'Maximale anaerobe Leistung (>LT2)'
    }
  ]
}

// ===== 3-ZONE MODEL A =====
/**
 * 3-Zone Model A: Simple division by LT1 and LT2
 * - Zone 1: bis LT1 (aerobe Basis)
 * - Zone 2: LT1 bis LT2 (Schwellenbereich)
 * - Zone 3: ab LT2 (anaerober Bereich)
 */
function calculate3ZonesModelA(
  lt1Power: number,
  lt2Power: number,
  maxPower: number
): TrainingZone[] {
  return [
    {
      id: 1,
      name: 'Zone 1 - Aerobe Basis',
      range: [0, lt1Power],
      color: 'rgba(34, 197, 94, 0.2)',
      borderColor: 'rgba(34, 197, 94, 0.8)',
      description: 'Aerober Grundlagenbereich (bis LT1)'
    },
    {
      id: 2,
      name: 'Zone 2 - Schwellenbereich',
      range: [lt1Power, lt2Power],
      color: 'rgba(251, 191, 36, 0.2)',
      borderColor: 'rgba(251, 191, 36, 0.8)',
      description: 'Tempobereich (LT1 bis LT2)'
    },
    {
      id: 3,
      name: 'Zone 3 - Anaerober Bereich',
      range: [lt2Power, maxPower * 1.1],
      color: 'rgba(239, 68, 68, 0.2)',
      borderColor: 'rgba(239, 68, 68, 0.8)',
      description: 'Anaerober Bereich (ab LT2)'
    }
  ]
}

// ===== 3-ZONE MODEL B (Polarized Training / Seiler) =====
/**
 * 3-Zone Model B: Polarized training model
 * - Zone 1: bis ~80% von LT1 (niedrige Intensität)
 * - Zone 2: ~80% LT1 bis ~105% LT2 (Schwellenbereich)
 * - Zone 3: ab ~105% LT2 (hohe Intensität)
 */
function calculate3ZonesModelB(
  lt1Power: number,
  lt2Power: number,
  maxPower: number
): TrainingZone[] {
  const zone1End = lt1Power * 0.80  // 80% of LT1
  const zone2End = lt2Power * 1.05  // 105% of LT2
  
  return [
    {
      id: 1,
      name: 'Zone 1 - Niedrige Intensität',
      range: [0, zone1End],
      color: 'rgba(34, 197, 94, 0.2)',
      borderColor: 'rgba(34, 197, 94, 0.8)',
      description: 'Niedrige Intensität, hoher Umfang (bis ~80% LT1)'
    },
    {
      id: 2,
      name: 'Zone 2 - Schwellenbereich',
      range: [zone1End, zone2End],
      color: 'rgba(251, 191, 36, 0.2)',
      borderColor: 'rgba(251, 191, 36, 0.8)',
      description: 'Schwellenbereich (~80% LT1 bis ~105% LT2)'
    },
    {
      id: 3,
      name: 'Zone 3 - Hohe Intensität',
      range: [zone2End, maxPower * 1.1],
      color: 'rgba(239, 68, 68, 0.2)',
      borderColor: 'rgba(239, 68, 68, 0.8)',
      description: 'Hohe Intensität, kurze Intervalle (ab ~105% LT2)'
    }
  ]
}
