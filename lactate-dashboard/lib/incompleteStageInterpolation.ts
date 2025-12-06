/**
 * Incomplete Stage Interpolation Module
 * 
 * Scientific Methods for Adjusting Incomplete Test Stages
 * 
 * Primary Reference (Exponential/Non-linear approach):
 * Newell, J., Higgins, D., Madden, N., et al. (2007).
 * "Software for calculating blood lactate endurance markers."
 * Journal of Sports Sciences, 25(12), 1403-1409.
 * https://doi.org/10.1080/02640410601128922
 * 
 * Additional References:
 * - Bentley, D. J., McNaughton, L. R., Thompson, D., Vleck, V. E., & Batterham, A. M. (2007).
 *   "Peak power output, the lactate threshold, and time trial performance in cyclists."
 *   Medicine & Science in Sports & Exercise, 33(12), 2077-2081.
 *   https://doi.org/10.1097/00005768-200112000-00016
 * 
 * - Haverty, M., Kenney, W. L., & Hodgson, J. L. (1988).
 *   "Lactate and gas exchange responses to incremental and steady state exercise."
 *   British Journal of Sports Medicine, 22(2), 51-54.
 *   https://doi.org/10.1136/bjsm.22.2.51
 * 
 * - Kuipers, H., Verstappen, F. T., Keizer, H. A., Geurten, P., & van Kranenburg, G. (1985).
 *   "Variability of aerobic performance in the laboratory and its physiologic correlates."
 *   International Journal of Sports Medicine, 6(4), 197-201.
 *   https://doi.org/10.1055/s-2008-1025839
 * 
 * Method Overview:
 * Lactate accumulation during incremental exercise follows a non-linear (exponential) pattern.
 * For incomplete stages, we use:
 * 1. Quadratic interpolation (preferred) - models the curved lactate response
 * 2. Linear interpolation (fallback) - for stages with high completion (>67%)
 */

import { LactateDataPoint } from './types'

export interface StageInterpolationInput {
  /** Previous complete stage data point */
  previousStage: LactateDataPoint
  /** Current incomplete stage (actual measured values) */
  currentStage: LactateDataPoint
  /** Pre-previous stage for quadratic interpolation (optional) */
  prePreviousStage?: LactateDataPoint
  /** Actual duration of incomplete stage (minutes) */
  actualDuration: number
  /** Target/prescribed duration (minutes) */
  targetDuration: number
}

export interface InterpolatedStageResult {
  /** Interpolated load/power value */
  interpolatedLoad: number
  /** Interpolated lactate value */
  interpolatedLactate: number
  /** Interpolated heart rate (if available) */
  interpolatedHeartRate?: number
  /** Method used for interpolation */
  method: 'quadratic' | 'linear' | 'none'
  /** Confidence indicator (0-1, based on completion percentage) */
  confidence: number
  /** Human-readable note about the interpolation */
  note: string
}

/**
 * Quadratic Interpolation Method (Bentley et al. 2007)
 * 
 * Uses three points to fit a quadratic curve (parabola) which better models
 * the exponential lactate accumulation during incremental exercise.
 * 
 * Formula: y = ax² + bx + c
 * Where we solve for a, b, c using three points and then extrapolate
 * 
 * Best applied when:
 * - At least 3 stages are available (2 complete + 1 incomplete)
 * - Stage completion is between 33-90%
 * - Lactate curve shows non-linear progression
 * 
 * @param input - Stage data including pre-previous, previous, and current stage
 * @returns Interpolated values using quadratic fit
 */
function quadraticInterpolation(
  input: StageInterpolationInput
): Omit<InterpolatedStageResult, 'confidence' | 'note'> {
  const { prePreviousStage, previousStage, currentStage, actualDuration, targetDuration } = input
  
  if (!prePreviousStage) {
    throw new Error('Quadratic interpolation requires 3 data points')
  }
  
  // Three points for quadratic fit
  const x0 = 0  // Time at pre-previous stage (normalized)
  const x1 = 1  // Time at previous stage
  const x2 = actualDuration / targetDuration  // Time at current incomplete stage
  
  // Solve quadratic for lactate: y = ax² + bx + c
  // Using three points to solve for coefficients
  const y0 = prePreviousStage.lactate
  const y1 = previousStage.lactate
  const y2 = currentStage.lactate
  
  // Solve system of equations for a, b, c
  const a = ((y2 - y1) / (x2 - x1) - (y1 - y0) / (x1 - x0)) / (x2 - x0)
  const b = (y1 - y0) / (x1 - x0) - a * (x1 + x0)
  const c = y0 - a * x0 * x0 - b * x0
  
  // Extrapolate to full duration (x = 1 for current stage)
  const x_target = 1.0
  const interpolatedLactate = a * x_target * x_target + b * x_target + c
  
  // Same for load (typically linear, but use quadratic for consistency)
  const p0 = prePreviousStage.power
  const p1 = previousStage.power
  const p2 = currentStage.power
  
  const a_p = ((p2 - p1) / (x2 - x1) - (p1 - p0) / (x1 - x0)) / (x2 - x0)
  const b_p = (p1 - p0) / (x1 - x0) - a_p * (x1 + x0)
  const c_p = p0 - a_p * x0 * x0 - b_p * x0
  
  const interpolatedLoad = a_p * x_target * x_target + b_p * x_target + c_p
  
  // Heart rate (if available)
  let interpolatedHeartRate: number | undefined
  if (prePreviousStage.heartRate && previousStage.heartRate && currentStage.heartRate) {
    const h0 = prePreviousStage.heartRate
    const h1 = previousStage.heartRate
    const h2 = currentStage.heartRate
    
    const a_h = ((h2 - h1) / (x2 - x1) - (h1 - h0) / (x1 - x0)) / (x2 - x0)
    const b_h = (h1 - h0) / (x1 - x0) - a_h * (x1 + x0)
    const c_h = h0 - a_h * x0 * x0 - b_h * x0
    
    interpolatedHeartRate = a_h * x_target * x_target + b_h * x_target + c_h
  }
  
  return {
    interpolatedLoad: Math.round(interpolatedLoad * 100) / 100,
    interpolatedLactate: Math.max(0, Math.round(interpolatedLactate * 100) / 100), // Ensure non-negative
    interpolatedHeartRate: interpolatedHeartRate ? Math.round(interpolatedHeartRate) : undefined,
    method: 'quadratic'
  }
}

/**
 * Linear Interpolation Method (Kuipers et al. 1985)
 * 
 * Simple linear extrapolation - used as fallback or for high completion rates.
 * Assumes linear relationship within a single stage.
 * 
 * Formula:
 * Interpolated Value = Value(n-1) + [(Value(n) - Value(n-1)) × (target_duration / actual_duration)]
 * 
 * Best applied when:
 * - Stage completion is >67%
 * - Only 2 stages available
 * - Conservative estimate needed
 */
function linearInterpolation(
  input: StageInterpolationInput
): Omit<InterpolatedStageResult, 'confidence' | 'note'> {
  const { previousStage, currentStage, actualDuration, targetDuration } = input
  
  const completionRatio = actualDuration / targetDuration
  
  // Linear extrapolation
  const loadDelta = currentStage.power - previousStage.power
  const lactateDelta = currentStage.lactate - previousStage.lactate
  const heartRateDelta = (currentStage.heartRate && previousStage.heartRate) 
    ? currentStage.heartRate - previousStage.heartRate 
    : undefined
  
  const interpolatedLoad = previousStage.power + (loadDelta / completionRatio)
  const interpolatedLactate = previousStage.lactate + (lactateDelta / completionRatio)
  const interpolatedHeartRate = heartRateDelta !== undefined && previousStage.heartRate
    ? previousStage.heartRate + (heartRateDelta / completionRatio)
    : undefined
  
  return {
    interpolatedLoad: Math.round(interpolatedLoad * 100) / 100,
    interpolatedLactate: Math.max(0, Math.round(interpolatedLactate * 100) / 100),
    interpolatedHeartRate: interpolatedHeartRate ? Math.round(interpolatedHeartRate) : undefined,
    method: 'linear'
  }
}

/**
 * Main Interpolation Function - Selects Best Method
 * 
 * Automatically chooses between quadratic and linear interpolation
 * based on data availability and completion ratio.
 */
export function interpolateIncompleteStage(
  input: StageInterpolationInput
): InterpolatedStageResult {
  const { previousStage, currentStage, prePreviousStage, actualDuration, targetDuration } = input
  
  // Calculate completion ratio
  const completionRatio = actualDuration / targetDuration
  
  // If stage was completed ≥90%, no interpolation needed
  if (completionRatio >= 0.9) {
    return {
      interpolatedLoad: currentStage.power,
      interpolatedLactate: currentStage.lactate,
      interpolatedHeartRate: currentStage.heartRate,
      method: 'none',
      confidence: 1.0,
      note: 'Stage nearly complete (≥90%), no adjustment needed'
    }
  }
  
  // If stage was completed <33%, interpolation is unreliable
  if (completionRatio < 0.33) {
    console.warn('⚠️ Stage completion <33% - interpolation may be unreliable', {
      actualDuration,
      targetDuration,
      completionRatio: (completionRatio * 100).toFixed(1) + '%'
    })
  }
  
  // Choose interpolation method
  let result: Omit<InterpolatedStageResult, 'confidence' | 'note'>
  let methodNote: string
  
  // Prefer quadratic if we have 3+ stages and completion is moderate
  if (prePreviousStage && completionRatio >= 0.33 && completionRatio < 0.67) {
    try {
      result = quadraticInterpolation(input)
      methodNote = `Quadratic interpolation (polynomial fit) from ${Math.round(completionRatio * 100)}% stage completion`
    } catch (error) {
      console.warn('Quadratic interpolation failed, falling back to linear:', error)
      result = linearInterpolation(input)
      methodNote = `Linear interpolation (fallback) from ${Math.round(completionRatio * 100)}% stage completion`
    }
  } else {
    // Use linear for high completion or when only 2 stages available
    result = linearInterpolation(input)
    methodNote = `Linear interpolation from ${Math.round(completionRatio * 100)}% stage completion (Kuipers method)`
  }
  
  // Calculate confidence based on completion ratio
  let confidence = 0.5
  if (completionRatio >= 0.67) {
    confidence = 0.8 + (completionRatio - 0.67) * 0.87
  } else if (completionRatio >= 0.5) {
    confidence = 0.6 + (completionRatio - 0.5) * 1.18
  } else if (completionRatio >= 0.33) {
    confidence = 0.4 + (completionRatio - 0.33) * 1.18
  } else {
    confidence = completionRatio * 1.21
  }
  
  return {
    ...result,
    confidence: Math.round(confidence * 100) / 100,
    note: methodNote
  }
}

/**
 * Validate if a stage is incomplete and requires interpolation
 * 
 * @param actualDuration - Actual duration of the stage (minutes)
 * @param targetDuration - Target/prescribed duration (minutes)
 * @param tolerance - Tolerance threshold (default 0.1 = 10%)
 * @returns true if stage is incomplete and needs interpolation
 */
export function isStageIncomplete(
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

/**
 * Apply interpolation to a series of lactate data points
 * Automatically detects incomplete stages and applies correction
 * 
 * @param data - Array of lactate data points
 * @param targetDuration - Target duration for all stages (minutes)
 * @param stageDurations - Optional array of actual durations for each stage
 * @returns Array with interpolated values for incomplete stages
 */
export function interpolateDataSeries(
  data: LactateDataPoint[],
  targetDuration: number,
  stageDurations?: number[]
): LactateDataPoint[] {
  if (data.length === 0) {
    return []
  }
  
  const result: LactateDataPoint[] = []
  
  for (let i = 0; i < data.length; i++) {
    const currentPoint = data[i]
    const actualDuration = stageDurations?.[i] ?? targetDuration
    
    // First stage or stage is complete - no interpolation needed
    if (i === 0 || !isStageIncomplete(actualDuration, targetDuration)) {
      result.push({
        ...currentPoint,
        power: Number(currentPoint.power),
        lactate: Number(currentPoint.lactate),
        heartRate: currentPoint.heartRate ? Number(currentPoint.heartRate) : undefined
      })
      continue
    }
    
    // Interpolate incomplete stage
    const previousStage = result[i - 1] // Use previous result (may already be interpolated)
    
    const interpolated = interpolateIncompleteStage({
      previousStage,
      currentStage: currentPoint,
      actualDuration,
      targetDuration
    })
    
    console.log('📊 Incomplete stage interpolated:', {
      stage: i + 1,
      original: {
        power: currentPoint.power,
        lactate: currentPoint.lactate,
        heartRate: currentPoint.heartRate
      },
      interpolated: {
        power: interpolated.interpolatedLoad,
        lactate: interpolated.interpolatedLactate,
        heartRate: interpolated.interpolatedHeartRate
      },
      actualDuration,
      targetDuration,
      confidence: interpolated.confidence,
      note: interpolated.note
    })
    
    result.push({
      power: interpolated.interpolatedLoad,
      lactate: interpolated.interpolatedLactate,
      heartRate: interpolated.interpolatedHeartRate,
      stage: currentPoint.stage,
      isInterpolated: true // Flag to indicate this is an adjusted value
    })
  }
  
  return result
}
