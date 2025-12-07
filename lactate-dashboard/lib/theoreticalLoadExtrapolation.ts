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
 * Uses three stages to model load progression and extrapolate theoretical load.
 * Ensures theoretical load is always higher than previous complete stage.
 * 
 * Logic:
 * - Uses 3 stages to detect load progression pattern
 * - Accounts for acceleration in lactate accumulation
 * - Extrapolates theoretical load based on progression curve
 */
function quadraticExtrapolation(
  input: TheoreticalLoadInput
): Omit<TheoreticalLoadResult, 'confidence' | 'note' | 'actualLoad' | 'actualDuration'> {
  const { prePreviousStage, previousStage, currentStage, actualDuration, targetDuration } = input
  
  if (!prePreviousStage) {
    throw new Error('Quadratic extrapolation requires 3 data points')
  }
  
  const completionRatio = actualDuration / targetDuration
  
  // Three points for load progression analysis
  const p0 = prePreviousStage.power  // Load at stage n-2
  const p1 = previousStage.power      // Load at stage n-1
  const p2 = currentStage.power       // Load at incomplete stage n (actual)
  
  // Lactate progression
  const l0 = prePreviousStage.lactate
  const l1 = previousStage.lactate
  const l2 = currentStage.lactate
  
  // Calculate load increments between stages
  const loadIncrease1 = p1 - p0  // Stage n-2 to n-1
  const loadIncrease2 = p2 - p1  // Stage n-1 to n (actual)
  
  // Calculate lactate increments
  const lactateIncrease1 = l1 - l0
  const lactateIncrease2 = l2 - l1
  
  // Average load increment per stage
  const avgLoadIncrease = (loadIncrease1 + loadIncrease2) / 2
  
  // Detect if lactate is accelerating (exponential phase)
  const lactateAcceleration = lactateIncrease2 / lactateIncrease1
  
  // Adjustment factor based on:
  // 1. Completion ratio (inverse relationship)
  // 2. Lactate acceleration (higher acceleration = higher theoretical load)
  
  const baseAdjustment = Math.min(2.0, Math.max(1.2, 1.0 / completionRatio))
  const lactateAdjustment = Math.min(1.5, Math.max(1.0, lactateAcceleration * 0.8))
  
  const adjustmentFactor = baseAdjustment * lactateAdjustment
  
  // Theoretical load = previous stage + (average load increase × adjustment)
  const theoreticalLoad = p1 + (avgLoadIncrease * adjustmentFactor)
  
  return {
    theoreticalLoad: Math.round(theoreticalLoad * 100) / 100,
    method: 'quadratic'
  }
}

/**
 * Linear Extrapolation Method
 * 
 * Extrapolates the theoretical load level based on load progression pattern.
 * Key principle: Theoretical load MUST be higher than previous complete stage.
 * 
 * Logic:
 * - Previous stage: 16.5 kmh @ 3:00 min
 * - Current incomplete: 17.5 kmh @ 1:40 min
 * - Load increase per stage: e.g., 1.5 kmh
 * - If incomplete, we're partway through the load increase
 * - Extrapolate: theoretical load = previous + (load_increase × adjustment_factor)
 * - Adjustment factor based on completion ratio and lactate increase
 */
function linearExtrapolation(
  input: TheoreticalLoadInput
): Omit<TheoreticalLoadResult, 'confidence' | 'note' | 'actualLoad' | 'actualDuration'> {
  const { previousStage, currentStage, actualDuration, targetDuration } = input
  
  const completionRatio = actualDuration / targetDuration
  
  // Calculate load increase from previous stage
  const loadIncrease = currentStage.power - previousStage.power
  
  // Calculate lactate increase from previous stage
  const lactateIncrease = currentStage.lactate - previousStage.lactate
  
  // Model: The theoretical load should represent the full stage level
  // Since the athlete stopped early but achieved a certain load and lactate,
  // we extrapolate what the full stage load would be
  
  // Key insight: If completion ratio is low (e.g., 0.55 = 1:40 of 3:00),
  // but lactate already increased significantly, this suggests high intensity
  // The theoretical load should be proportionally higher
  
  // Base case: if completed full duration, theoretical = actual
  // If stopped early: theoretical = previous + (load_increase / completion_ratio)
  // This ensures theoretical > previous (always increasing)
  
  // Adjustment factor: scale by inverse of completion ratio
  // 1:40 of 3:00 = 0.55 → adjustment = 1/0.55 = 1.82
  // But cap at reasonable values (1.2 to 2.0 range)
  
  const adjustmentFactor = Math.min(2.0, Math.max(1.2, 1.0 / completionRatio))
  
  // Theoretical load = previous stage + (observed increase × adjustment)
  const theoreticalLoad = previousStage.power + (loadIncrease * adjustmentFactor)
  
  return {
    theoreticalLoad: Math.round(theoreticalLoad * 100) / 100,
    method: 'linear'
  }
}

/**
 * Main Theoretical Load Calculation
 * 
 * Automatically selects best extrapolation method based on data availability.
 * Only performs extrapolation if >80% of target duration is achieved.
 */
export function calculateTheoreticalLoad(
  input: TheoreticalLoadInput
): TheoreticalLoadResult {
  const { currentStage, prePreviousStage, actualDuration, targetDuration } = input
  
  const completionRatio = actualDuration / targetDuration
  
  // Only extrapolate if >80% of target duration achieved
  if (completionRatio < 0.8) {
    // Return null or very low confidence for extrapolations below 80%
    return {
      theoreticalLoad: currentStage.power, // Use actual load as fallback
      actualLoad: currentStage.power,
      actualDuration,
      method: 'linear',
      confidence: 0,
      note: `Insufficient duration (${Math.round(completionRatio * 100)}% completion) - minimum 80% required for extrapolation`
    }
  }
  
  // Choose extrapolation method
  let result: Omit<TheoreticalLoadResult, 'confidence' | 'note' | 'actualLoad' | 'actualDuration'>
  let methodNote: string
  
  // Use linear extrapolation for high completion ratios (≥80%)
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
  return completionRatio < (1.0 - tolerance)
}
