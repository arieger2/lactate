import { LactateDataPoint, ThresholdPoint, TrainingZone } from './types'

// ===== TYPE DEFINITIONS =====

export type ThresholdMethod = 'mader' | 'dmax' | 'dickhuth' | 'loglog' | 'plus1mmol' | 'moddmax' | 'seiler' | 'fatmax' | 'adjusted'

export interface ThresholdResult {
  lt1: ThresholdPoint | null
  lt2: ThresholdPoint | null
}

// ===== WISSENSCHAFTLICHE SCHWELLENMETHODEN =====
// Exakt nach Requirements-Dokument implementiert

/**
 * Berechnet LT1 und LT2 Schwellen basierend auf der gewählten wissenschaftlichen Methode
 * @param data - Sortierte Laktatdaten (Power vs. Laktat)
 * @param method - Gewählte Schwellenmethode
 * @returns ThresholdResult mit LT1 und LT2 Punkten
 */
export function calculateThresholds(
  data: LactateDataPoint[], 
  method: ThresholdMethod = 'dmax'
): ThresholdResult {
  if (data.length === 0) {
    return { lt1: null, lt2: null }
  }

  const sortedData = [...data].sort((a, b) => a.power - b.power)
  let lt1Point: ThresholdPoint | null = null
  let lt2Point: ThresholdPoint | null = null

  switch (method) {
    case 'mader':
      // Mader 4mmol/L Methode (OBLA) - Mader (1976)
      const baseline = Math.min(...sortedData.map(d => d.lactate))
      lt1Point = interpolateThreshold(sortedData, baseline + 0.3)
      lt2Point = interpolateThreshold(sortedData, 4.0)
      break

    case 'dmax':
      // DMAX - Cheng et al.
      lt2Point = calculateDMax(sortedData)
      lt1Point = calculateLT1FromLT2(sortedData, lt2Point, 'dmax')
      break

    case 'dickhuth':
      // Dickhuth et al. - Minimum + 1.5 mmol/L
      const minLactate = Math.min(...sortedData.map(d => d.lactate))
      lt1Point = interpolateThreshold(sortedData, minLactate + 1.5)
      lt2Point = interpolateThreshold(sortedData, minLactate + 2.5)
      break

    case 'loglog':
      // Log-Log Methode - Beaver et al.
      lt2Point = calculateLogLog(sortedData)
      lt1Point = calculateLT1FromLT2(sortedData, lt2Point, 'loglog')
      break

    case 'plus1mmol':
      // +1.0 mmol/L - Faude et al.
      const baseLactate = Math.min(...sortedData.map(d => d.lactate))
      lt1Point = interpolateThreshold(sortedData, baseLactate + 1.0)
      lt2Point = interpolateThreshold(sortedData, baseLactate + 4.0)
      break

    case 'moddmax':
      // ModDMAX - Bishop et al.
      lt2Point = calculateModDMax(sortedData)
      lt1Point = calculateLT1FromLT2(sortedData, lt2Point, 'moddmax')
      break

    case 'seiler':
      // Seiler 3-Zone Model - Seiler-Polarisiertes Training
      lt1Point = calculateSeilerLT1(sortedData)
      lt2Point = calculateSeilerLT2(sortedData)
      break

    case 'fatmax':
      // FatMax/LT - San-Millán - FatMax
      lt1Point = calculateFatMax(sortedData)
      lt2Point = interpolateThreshold(sortedData, 4.0)
      break

    case 'adjusted':
      // Manuelle Anpassung - wird extern gesetzt
      return { lt1: null, lt2: null }
  }

  return { lt1: lt1Point, lt2: lt2Point }
}

/**
 * Interpoliert einen Schwellenpunkt bei einem gegebenen Laktatwert
 */
export function interpolateThreshold(
  data: LactateDataPoint[], 
  targetLactate: number
): ThresholdPoint | null {
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].lactate <= targetLactate && data[i + 1].lactate >= targetLactate) {
      const ratio = (targetLactate - data[i].lactate) / (data[i + 1].lactate - data[i].lactate)
      const power = data[i].power + ratio * (data[i + 1].power - data[i].power)
      return { power: Math.round(power * 100) / 100, lactate: targetLactate }
    }
  }
  return null
}

/**
 * DMAX Methode - Cheng et al.
 * Findet den Punkt mit maximalem Abstand zur Linie zwischen erstem und letztem Punkt
 */
export function calculateDMax(data: LactateDataPoint[]): ThresholdPoint | null {
  if (data.length < 3) return null
  
  const first = data[0]
  const last = data[data.length - 1]
  let maxDistance = 0
  let maxIndex = 0

  for (let i = 1; i < data.length - 1; i++) {
    const point = data[i]
    const A = last.lactate - first.lactate
    const B = first.power - last.power
    const C = last.power * first.lactate - first.power * last.lactate
    const distance = Math.abs(A * point.power + B * point.lactate + C) / Math.sqrt(A * A + B * B)
    
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  return { power: data[maxIndex].power, lactate: data[maxIndex].lactate }
}

/**
 * Log-Log Methode - Beaver et al.
 * Findet den Punkt mit maximaler Änderung des logarithmischen Anstiegs
 */
export function calculateLogLog(data: LactateDataPoint[]): ThresholdPoint | null {
  if (data.length < 3) return null
  
  let maxSlope = 0
  let maxIndex = 0

  for (let i = 1; i < data.length - 1; i++) {
    if (data[i].lactate > 0 && data[i].power > 0) {
      const slope1 = Math.log(data[i].lactate) / Math.log(data[i].power)
      const slope2 = Math.log(data[i + 1].lactate) / Math.log(data[i + 1].power)
      const slopeChange = Math.abs(slope2 - slope1)
      
      if (slopeChange > maxSlope) {
        maxSlope = slopeChange
        maxIndex = i
      }
    }
  }

  return { power: data[maxIndex].power, lactate: data[maxIndex].lactate }
}

/**
 * ModDMAX - Bishop et al.
 * Modifizierte DMAX mit exponentieller Anpassung
 */
export function calculateModDMax(data: LactateDataPoint[]): ThresholdPoint | null {
  if (data.length < 4) return null
  
  const first = data[0]
  const last = data[data.length - 1]
  let maxDistance = 0
  let maxIndex = 0

  // Exponentieller Fit für bessere Kurvenanpassung
  for (let i = 1; i < data.length - 1; i++) {
    const point = data[i]
    const expectedY = first.lactate + (last.lactate - first.lactate) * 
      Math.pow((point.power - first.power) / (last.power - first.power), 1.5)
    const distance = Math.abs(point.lactate - expectedY)
    
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  return { power: data[maxIndex].power, lactate: data[maxIndex].lactate }
}

/**
 * Seiler VT1 - Erste deutliche Erhöhung über Baseline
 */
export function calculateSeilerLT1(data: LactateDataPoint[]): ThresholdPoint | null {
  const baseline = Math.min(...data.map(d => d.lactate))
  return interpolateThreshold(data, baseline + 0.5)
}

/**
 * Seiler VT2 - Steiler Anstieg, oft um 2.5-3.0 mmol/L
 */
export function calculateSeilerLT2(data: LactateDataPoint[]): ThresholdPoint | null {
  const baseline = Math.min(...data.map(d => d.lactate))
  return interpolateThreshold(data, baseline + 2.8)
}

/**
 * FatMax - San-Millán
 * Approximiert bei niedriger Intensität, oft um baseline + 0.3
 */
export function calculateFatMax(data: LactateDataPoint[]): ThresholdPoint | null {
  const baseline = Math.min(...data.map(d => d.lactate))
  return interpolateThreshold(data, baseline + 0.3)
}

/**
 * Berechnet LT1 basierend auf LT2 für verschiedene Methoden
 */
export function calculateLT1FromLT2(
  data: LactateDataPoint[], 
  lt2: ThresholdPoint | null, 
  method: string
): ThresholdPoint | null {
  if (!lt2) return null
  
  switch (method) {
    case 'dmax':
    case 'moddmax':
      return interpolateThreshold(data, lt2.lactate * 0.6)
    case 'loglog':
      return interpolateThreshold(data, lt2.lactate * 0.65)
    default:
      return interpolateThreshold(data, 2.0)
  }
}

// ===== 5-ZONEN TRAININGSSYSTEM =====
// Wissenschaftlich basierte Trainingszonen nach internationalen Standards

/**
 * Berechnet Trainingszonen basierend auf LT1/LT2 und gewählter Methode
 * @param lt1 - LT1 Schwellenpunkt
 * @param lt2 - LT2 Schwellenpunkt
 * @param maxPower - Maximale gemessene Leistung
 * @param method - Gewählte Schwellenmethode
 * @returns Array von Trainingszonen
 */
export function calculateTrainingZones(
  lt1: ThresholdPoint | null, 
  lt2: ThresholdPoint | null, 
  maxPower: number, 
  method: ThresholdMethod = 'mader'
): TrainingZone[] {
  const lt1Power = lt1?.power || maxPower * 0.65
  const lt2Power = lt2?.power || maxPower * 0.85

  // Methodenspezifische Zonenberechnung
  switch (method) {
    case 'seiler':
      // Seiler 3-Zonen Modell: Zone 1 (<LT1), Zone 2 (LT1-LT2), Zone 3 (>LT2)
      return [
        {
          id: 1,
          name: 'Zone 1 - Aerob',
          range: [0, lt1Power],
          color: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 0.8)',
          description: 'Aerobe Zone (bis LT1 ~2mmol/L)'
        },
        {
          id: 2,
          name: 'Zone 2 - Schwelle',
          range: [lt1Power, lt2Power],
          color: 'rgba(251, 191, 36, 0.2)',
          borderColor: 'rgba(251, 191, 36, 0.8)',
          description: 'Schwellenzone (LT1 bis LT2 ~4mmol/L)'
        },
        {
          id: 3,
          name: 'Zone 3 - Anaerob',
          range: [lt2Power, maxPower * 1.1],
          color: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 0.8)',
          description: 'Anaerobe Zone (>LT2)'
        }
      ]

    case 'dickhuth':
      // Dickhuth: LT1 bei +1.5mmol, LT2 bei +2.5mmol (geringerer Abstand)
      return [
        {
          id: 1,
          name: 'Zone 1 - Regeneration',
          range: [0, lt1Power * 0.75],
          color: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 0.8)',
          description: 'Regenerationsbereich'
        },
        {
          id: 2,
          name: 'Zone 2 - Aerobe Basis',
          range: [lt1Power * 0.75, lt1Power],
          color: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 0.8)',
          description: 'Aerob bis LT1 (+1.5mmol/L)'
        },
        {
          id: 3,
          name: 'Zone 3 - Schwelle',
          range: [lt1Power, lt2Power],
          color: 'rgba(251, 191, 36, 0.2)',
          borderColor: 'rgba(251, 191, 36, 0.8)',
          description: 'LT1 bis LT2 (+2.5mmol/L)'
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

    default:
      // Standard 5-Zonen Model für alle anderen Methoden
      // LT1 = Ende Zone 2, LT2 = Ende Zone 3
      return [
        {
          id: 1,
          name: 'Zone 1 - Regeneration',
          range: [0, lt1Power * 0.68],
          color: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 0.8)',
          description: 'Regeneration & Fettstoffwechsel'
        },
        {
          id: 2,
          name: 'Zone 2 - Aerobe Basis',
          range: [lt1Power * 0.68, lt1Power],
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
}

/**
 * Gibt den Anzeigenamen für eine Schwellenmethode zurück
 */
export function getMethodDisplayName(method: ThresholdMethod): string {
  const methodNames: Record<ThresholdMethod, string> = {
    'mader': 'Mader 4mmol/L (OBLA)',
    'dmax': 'DMAX (Cheng et al.)',
    'dickhuth': 'Dickhuth et al.',
    'loglog': 'Log-Log (Beaver et al.)',
    'plus1mmol': '+1.0 mmol/L (Faude et al.)',
    'moddmax': 'ModDMAX (Bishop et al.)',
    'seiler': 'Seiler 3-Zone',
    'fatmax': 'FatMax/LT (San-Millán)',
    'adjusted': '🔧 Adjusted (Manuell angepasst)'
  }
  return methodNames[method] || method.toUpperCase()
}
