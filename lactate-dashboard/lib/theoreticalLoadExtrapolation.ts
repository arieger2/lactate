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
 * Verwendet die mittlere Änderungsrate der letzten beiden Inkremente.
 * Bei konstantem Inkrement entspricht dies der linearen Methode.
 * 
 * Beispiel:
 * - Stage 6: 16 km/h
 * - Stage 7: 18 km/h (Inkrement: +2)
 * - Stage 8: 20 km/h @ 27.8% (Inkrement: +2)
 * - Theoretische Load: 18 + (2 × 0.278) = 18.556 km/h
 */
function quadraticExtrapolation(
  input: TheoreticalLoadInput
): Omit<TheoreticalLoadResult, 'confidence' | 'note' | 'actualLoad' | 'actualDuration'> {
  const { prePreviousStage, previousStage, currentStage, actualDuration, targetDuration } = input
  
  if (!prePreviousStage) {
    throw new Error('Quadratic extrapolation requires 3 data points')
  }
  
  const completionRatio = actualDuration / targetDuration
  
  const load0 = prePreviousStage.power
  const load1 = previousStage.power
  const load2 = currentStage.power
  
  // Inkremente
  const increment1 = load1 - load0
  const increment2 = load2 - load1
  
  // Mittleres Inkrement
  const avgIncrement = (increment1 + increment2) / 2
  
  // Theoretische Load = vorherige + (mittleres Inkrement × completionRatio)
  const theoreticalLoad = load1 + (avgIncrement * completionRatio)
  
  return {
    theoreticalLoad: Math.round(theoreticalLoad * 100) / 100,
    method: 'quadratic'
  }
}

/**
 * Linear Extrapolation Method
 * 
 * Berechnet die theoretische Load basierend auf dem Inkrement und der erreichten Zeit.
 * 
 * Logic:
 * - Vorherige Stage: 18 kmh @ 3:00 min (vollständig)
 * - Aktuelle incomplete: 20 kmh @ 0:50 min (27.8% completion)
 * - Inkrement: 20 - 18 = 2 kmh
 * - Theoretische Load: 18 + (2 × 0.278) = 18.556 kmh ≈ 18.6 kmh
 * 
 * Formel: theoreticalLoad = previousLoad + (increment × completionRatio)
 */
function linearExtrapolation(
  input: TheoreticalLoadInput
): Omit<TheoreticalLoadResult, 'confidence' | 'note' | 'actualLoad' | 'actualDuration'> {
  const { previousStage, currentStage, actualDuration, targetDuration } = input
  
  const completionRatio = actualDuration / targetDuration
  
  const previousLoad = previousStage.power
  const currentLoad = currentStage.power
  
  // Inkrement = Differenz zwischen aktueller und vorheriger Stage
  const increment = currentLoad - previousLoad
  
  // Theoretische Load = vorherige Load + (Inkrement × completionRatio)
  // Beispiel: 18 + (2 × 0.278) = 18.556 kmh
  const theoreticalLoad = previousLoad + (increment * completionRatio)
  
  return {
    theoreticalLoad: Math.round(theoreticalLoad * 100) / 100,
    method: 'linear'
  }
}

/**
 * Main Theoretical Load Calculation
 * 
 * Verwendet immer die einfache lineare Formel:
 * theoreticalLoad = previousLoad + (increment × completionRatio)
 * 
 * Diese Formel ist korrekt und gibt z.B. 18.6 km/h bei:
 * - Stage 7: 18 km/h
 * - Stage 8: 20 km/h @ 27.8% completion
 * - Ergebnis: 18 + (2 × 0.278) = 18.556 ≈ 18.6 km/h
 */
export function calculateTheoreticalLoad(
  input: TheoreticalLoadInput
): TheoreticalLoadResult {
  const { currentStage, prePreviousStage, actualDuration, targetDuration } = input
  
  const completionRatio = actualDuration / targetDuration
  
  // Always use linear extrapolation - it's correct and simple
  let result: Omit<TheoreticalLoadResult, 'confidence' | 'note' | 'actualLoad' | 'actualDuration'>
  let methodNote: string
  
  result = linearExtrapolation(input)
  methodNote = `Theoretical load calculated using linear extrapolation (${Math.round(completionRatio * 100)}% completion)`
  
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
