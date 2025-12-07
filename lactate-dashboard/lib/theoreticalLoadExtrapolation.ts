/**
 * Theoretical Load Extrapolation Module
 * 
 * Calculates the theoretical load at the prescribed stage level based on 
 * an incomplete stage that was terminated early.
 * 
 * Core Logic:
 * - If stage is incomplete (e.g., 1:40 min instead of 3:00 min)
 * - The athlete achieved some load at that duration (e.g., 17.5 kmh)
 * - We extrapolate what the NEXT stage's load would be (must be HIGHER than previous stage)
 * - The actual measured lactate still corresponds to this extrapolated load
 * 
 * Example: 
 * - Stage 7 complete: 16.5 kmh @ 3:00 min → 8.0 mmol/L
 * - Stage 8 incomplete: 17.5 kmh @ 1:40 min → 9.0 mmol/L
 * - Theoretical Stage 8 load: 18.5 kmh (extrapolated, must be > 16.5)
 * - This represents the load level at which the lactate was measured
 */

import { LactateDataPoint } from './types'

export interface TheoreticalLoadInput {
  /** Previous complete stage data point */
  previousStage: LactateDataPoint
  /** Current incomplete stage (actual measured values at early termination) */
  currentStage: LactateDataPoint
  /** Pre-previous stage for quadratic extrapolation (optional) */
  prePreviousStage?: LactateDataPoint
  /** Actual duration achieved (minutes as decimal, e.g., 0.833 for 50 seconds) */
  actualDuration: number
  /** Target/prescribed full duration (minutes, e.g., 3.0) */
  targetDuration: number
}

export interface TheoreticalLoadResult {
  /** Theoretical maximum load sustainable for full duration */
  theoreticalLoad: number
  /** Actual load achieved at early termination */
  actualLoad: number
  /** Actual duration achieved (minutes as decimal) */
  actualDuration: number
  /** Method used for extrapolation */
  method: 'quadratic' | 'linear'
  /** Confidence indicator (0-1, based on completion percentage) */
  confidence: number
  /** Human-readable note about the calculation */
  note: string
}

/**
 * Quadratic Extrapolation Method
 * 
 * Legt eine PARABEL durch 3 Punkte (Load vs Laktat) und findet den theoretischen Punkt.
 * 
 * Die Parabel geht durch:
 * - Punkt 1: (p0, l0) = Stage n-2
 * - Punkt 2: (p1, l1) = Stage n-1  
 * - Punkt 3: (p2, l2) = Stage n (incomplete)
 * 
 * Formel: lactate = a·load² + b·load + c
 * 
 * Der theoretische Load-Punkt liegt auf dieser Parabel bei einem interpolierten Laktat-Wert.
 */
function quadraticExtrapolation(
  input: TheoreticalLoadInput
): Omit<TheoreticalLoadResult, 'confidence' | 'note' | 'actualLoad' | 'actualDuration'> {
  const { prePreviousStage, previousStage, currentStage, actualDuration, targetDuration } = input
  
  if (!prePreviousStage) {
    throw new Error('Quadratic extrapolation requires 3 data points')
  }
  
  const completionRatio = actualDuration / targetDuration
  
  // Drei Punkte: (load, lactate)
  const x0 = prePreviousStage.power   // z.B. 16.0
  const y0 = prePreviousStage.lactate // z.B. 3.49
  
  const x1 = previousStage.power      // z.B. 18.0
  const y1 = previousStage.lactate    // z.B. 6.45
  
  const x2 = currentStage.power       // z.B. 20.0
  const y2 = currentStage.lactate     // z.B. 8.24
  
  // Berechne Parabel-Koeffizienten: y = a·x² + b·x + c
  // Löse 3x3 Gleichungssystem
  const denom = (x0 - x1) * (x0 - x2) * (x1 - x2)
  
  if (Math.abs(denom) < 0.001) {
    // Punkte sind kollinear, verwende lineare Interpolation
    const theoreticalLoad = x1 + ((x2 - x1) * completionRatio)
    return {
      theoreticalLoad: Math.round(theoreticalLoad * 100) / 100,
      method: 'quadratic'
    }
  }
  
  const a = (x2 * (y1 - y0) + x1 * (y0 - y2) + x0 * (y2 - y1)) / denom
  const b = (x2*x2 * (y0 - y1) + x1*x1 * (y2 - y0) + x0*x0 * (y1 - y2)) / denom
  const c = (x1*x2 * (x1 - x2) * y0 + x2*x0 * (x2 - x0) * y1 + x0*x1 * (x0 - x1) * y2) / denom
  
  // Interpoliere den Laktat-Wert basierend auf Completion Ratio
  // Bei 100% completion: theoretisches Laktat = aktuelles Laktat (y2)
  // Bei 0% completion: theoretisches Laktat = vorheriges Laktat (y1)
  const theoreticalLactate = y1 + ((y2 - y1) * completionRatio)
  
  // Finde den Load-Wert, der diesem Laktat auf der Parabel entspricht
  // Löse: theoreticalLactate = a·x² + b·x + c
  // → a·x² + b·x + (c - theoreticalLactate) = 0
  
  const A = a
  const B = b
  const C = c - theoreticalLactate
  
  // Quadratische Formel: x = (-B ± √(B² - 4AC)) / 2A
  const discriminant = B*B - 4*A*C
  
  if (discriminant < 0 || Math.abs(A) < 0.0001) {
    // Keine reelle Lösung oder quasi-linear, verwende lineare Interpolation
    const theoreticalLoad = x1 + ((x2 - x1) * completionRatio)
    return {
      theoreticalLoad: Math.round(theoreticalLoad * 100) / 100,
      method: 'quadratic'
    }
  }
  
  const sqrtDiscriminant = Math.sqrt(discriminant)
  const solution1 = (-B + sqrtDiscriminant) / (2 * A)
  const solution2 = (-B - sqrtDiscriminant) / (2 * A)
  
  // Wähle die Lösung, die zwischen x1 und x2 liegt
  let theoreticalLoad: number
  
  if (solution1 >= x1 && solution1 <= x2) {
    theoreticalLoad = solution1
  } else if (solution2 >= x1 && solution2 <= x2) {
    theoreticalLoad = solution2
  } else {
    // Keine Lösung im erwarteten Bereich, verwende die nähere
    theoreticalLoad = Math.abs(solution1 - x1) < Math.abs(solution2 - x1) ? solution1 : solution2
  }
  
  // Stelle sicher, dass theoreticalLoad zwischen x1 und x2 liegt
  theoreticalLoad = Math.max(x1, Math.min(x2, theoreticalLoad))
  
  return {
    theoreticalLoad: Math.round(theoreticalLoad * 100) / 100,
    method: 'quadratic'
  }
}

/**
 * Linear Extrapolation Method
 * 
 * WICHTIG: Bei Ermüdung (< 100% Zielzeit) liegt die theoretische Load
 * ZWISCHEN vorheriger Stage (Minimum) und aktueller Load (Maximum).
 * 
 * Logic:
 * - Vorherige Stage: 16.5 kmh @ 3:00 min (vollständig)
 * - Aktuelle incomplete: 17.5 kmh @ 1:40 min (55% completion)
 * - Theoretische Load: 16.5 + ((17.5 - 16.5) × 0.55) = ~17.05 kmh
 * - NIEMALS höher als 17.5, weil Person ermüdet ist!
 */
function linearExtrapolation(
  input: TheoreticalLoadInput
): Omit<TheoreticalLoadResult, 'confidence' | 'note' | 'actualLoad' | 'actualDuration'> {
  const { previousStage, currentStage, actualDuration, targetDuration } = input
  
  const completionRatio = actualDuration / targetDuration
  
  // KRITISCH: Theoretische Load liegt zwischen vorheriger und aktueller Load
  // Linear interpoliert basierend auf Completion Ratio
  
  const previousLoad = previousStage.power
  const currentLoad = currentStage.power
  
  // Theoretische Load = vorherige + (Differenz × completionRatio)
  // Bei 100% completion → theoretische = aktuelle
  // Bei 0% completion → theoretische = vorherige
  const theoreticalLoad = previousLoad + ((currentLoad - previousLoad) * completionRatio)
  
  return {
    theoreticalLoad: Math.round(theoreticalLoad * 100) / 100,
    method: 'linear'
  }
}

/**
 * Main Theoretical Load Calculation
 * 
 * Automatically selects extrapolation method based on completion ratio:
 * - ≥ 80% completion: Linear extrapolation
 * - < 80% completion: Quadratic extrapolation (requires 3 stages)
 */
export function calculateTheoreticalLoad(
  input: TheoreticalLoadInput
): TheoreticalLoadResult {
  const { currentStage, prePreviousStage, actualDuration, targetDuration } = input
  
  const completionRatio = actualDuration / targetDuration
  
  // Choose extrapolation method based on completion ratio
  let result: Omit<TheoreticalLoadResult, 'confidence' | 'note' | 'actualLoad' | 'actualDuration'>
  let methodNote: string
  
  if (completionRatio >= 0.8) {
    // ≥ 80% completion: Use LINEAR extrapolation
    result = linearExtrapolation(input)
    methodNote = `Theoretical load calculated using linear extrapolation (${Math.round(completionRatio * 100)}% completion)`
  } else {
    // < 80% completion: Use QUADRATIC extrapolation
    if (prePreviousStage) {
      result = quadraticExtrapolation(input)
      methodNote = `Theoretical load calculated using quadratic extrapolation (${Math.round(completionRatio * 100)}% completion)`
    } else {
      // Fallback to linear if we don't have 3 stages
      result = linearExtrapolation(input)
      methodNote = `Theoretical load calculated using linear extrapolation (${Math.round(completionRatio * 100)}% completion, quadratic not available - requires 3 stages)`
    }
  }
  
  // Calculate confidence based on completion ratio
  // Higher completion = higher confidence in theoretical estimate
  let confidence = 0.5
  if (completionRatio >= 0.9) {
    confidence = 0.95
  } else if (completionRatio >= 0.85) {
    confidence = 0.90
  } else if (completionRatio >= 0.8) {
    confidence = 0.85
  } else if (completionRatio >= 0.7) {
    confidence = 0.75
  } else if (completionRatio >= 0.6) {
    confidence = 0.65
  } else if (completionRatio >= 0.5) {
    confidence = 0.55
  } else {
    confidence = 0.40
  }
  
  return {
    ...result,
    actualLoad: currentStage.power,
    actualDuration,
    confidence: Math.round(confidence * 100) / 100,
    note: methodNote
  }
}

/**
 * Check if theoretical load calculation is needed
 */
export function needsTheoreticalLoad(
  actualDuration: number,
  targetDuration: number,
  tolerance: number = 0.1
): boolean {
  if (actualDuration <= 0 || targetDuration <= 0) {
    return false
  }
  
  const completionRatio = actualDuration / targetDuration
  // Calculate theoretical load if stage is incomplete (< 100%)
  return completionRatio < (1.0 - tolerance)
}
