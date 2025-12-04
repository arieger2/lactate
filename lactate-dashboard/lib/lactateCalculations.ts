import { LactateDataPoint, ThresholdPoint, TrainingZone } from './types'

// ===== TYPE DEFINITIONS =====

export type ThresholdMethod = 'mader' | 'dmax' | 'dickhuth' | 'loglog' | 'plus1mmol' | 'moddmax' | 'seiler' | 'fatmax' | 'adjusted'

export interface ThresholdResult {
  lt1: ThresholdPoint | null
  lt2: ThresholdPoint | null
  method?: ThresholdMethod
  lt1Missing?: boolean
  lt2Missing?: boolean
  message?: string
}

// ===== WISSENSCHAFTLICHE SCHWELLENMETHODEN =====
// Exakt nach Requirements-Dokument implementiert
// WICHTIG: Alle Methoden funktionieren identisch für Watt (Radfahren) und km/h (Laufen)
// Die Berechnungen basieren auf geometrischen Prinzipien und sind einheitenunabhängig

/**
 * Berechnet LT1 und LT2 Schwellen basierend auf der gewählten wissenschaftlichen Methode
 * @param data - Sortierte Laktatdaten (Belastung vs. Laktat) - Belastung kann Watt oder km/h sein
 * @param method - Gewählte Schwellenmethode
 * @returns ThresholdResult mit LT1 und LT2 Punkten
 * @remarks Die Berechnungen funktionieren sowohl für Radtests (Watt) als auch Lauftests (km/h)
 */
export function calculateThresholds(
  data: LactateDataPoint[], 
  method: ThresholdMethod = 'dmax'
): ThresholdResult {
  if (data.length === 0) {
    return { 
      lt1: null, 
      lt2: null,
      method,
      lt1Missing: true,
      lt2Missing: true,
      message: 'Keine Daten vorhanden'
    }
  }

  const sortedData = [...data].sort((a, b) => a.power - b.power)
  let lt1Point: ThresholdPoint | null = null
  let lt2Point: ThresholdPoint | null = null

  switch (method) {
    case 'mader':
      // Mader 4mmol/L Methode (OBLA) - Mader (1976)
      // LT1 = 2.0 mmol/L
      lt1Point = interpolateThreshold(sortedData, 2.0)
      // LT2 = 4.0 mmol/L
      lt2Point = interpolateThreshold(sortedData, 4.0)
      break

    case 'dmax':
      // DMAX - Cheng et al. (1992)
      // LT2 = Max. Distanz zur Baseline
      lt2Point = calculateDMax(sortedData)
      // LT1 = Erster Deflektionspunkt (Steigung +50% über Baseline)
      lt1Point = calculateDMaxLT1(sortedData)
      
      // VALIDATION: LT1 must occur before LT2 (physiologically correct)
      if (lt1Point && lt2Point) {
        if (lt1Point.power >= lt2Point.power) {
          console.warn('⚠️ DMAX Validation: LT1 >= LT2 detected, recalculating LT1...', {
            original_LT1: lt1Point,
            original_LT2: lt2Point
          })
          
          // Fallback strategy: Use 2.0 mmol/L for LT1 (Mader-like approach)
          const fallbackLT1 = interpolateThreshold(sortedData, 2.0)
          
          // If fallback is still >= LT2, use half of LT2's lactate value
          if (fallbackLT1 && fallbackLT1.power >= lt2Point.power) {
            const halfLactate = lt2Point.lactate * 0.6 // 60% of LT2 lactate
            lt1Point = interpolateThreshold(sortedData, Math.max(halfLactate, 1.5))
            console.log('✅ DMAX: Using 60% of LT2 lactate for LT1:', lt1Point)
          } else {
            lt1Point = fallbackLT1
            console.log('✅ DMAX: Using 2.0 mmol/L fallback for LT1:', lt1Point)
          }
        }
      }
      break

    case 'dickhuth':
      // Dickhuth et al. (1999) - IANS Methode
      // Baseline = Mittelwert der ersten 2-3 Punkte
      const dickhuthK = Math.min(3, Math.floor(sortedData.length / 3))
      const dickhuthBaseline = sortedData.slice(0, dickhuthK).reduce((sum, d) => sum + d.lactate, 0) / dickhuthK
      console.log('🔍 Dickhuth Baseline:', { k: dickhuthK, baseline: dickhuthBaseline, firstPoints: sortedData.slice(0, dickhuthK).map(d => d.lactate) })
      // LT1 = Baseline + 0.5 mmol/L
      lt1Point = interpolateThreshold(sortedData, dickhuthBaseline + 0.5)
      // LT2 = Baseline + 1.5 mmol/L
      lt2Point = interpolateThreshold(sortedData, dickhuthBaseline + 1.5)
      break

    case 'loglog':
      // Log-Log Methode - Beaver et al. (1985)
      // Zwei-Linien-Regression mit variablem Breakpoint
      const loglogResult = calculateLogLogBreakpoint(sortedData)
      lt2Point = loglogResult.lt2
      lt1Point = loglogResult.lt1
      
      // VALIDATION: Handle null LT1 and ensure LT1 < LT2
      if (lt1Point === null && lt2Point !== null) {
        console.warn('⚠️ LogLog: No LT1 found via slope detection, using fallback...')
        // Fallback: Use 2.0 mmol/L or point at 1/3 of test range
        const fallbackLT1 = interpolateThreshold(sortedData, 2.0)
        if (fallbackLT1 && fallbackLT1.power < lt2Point.power) {
          lt1Point = fallbackLT1
          console.log('✅ LogLog: Using 2.0 mmol/L fallback for LT1:', lt1Point)
        } else {
          const oneThirdIndex = Math.floor(sortedData.length / 3)
          lt1Point = { power: sortedData[oneThirdIndex].power, lactate: sortedData[oneThirdIndex].lactate }
          console.log('✅ LogLog: Using 1/3 test range fallback for LT1:', lt1Point)
        }
      }
      
      if (lt1Point && lt2Point && lt1Point.power >= lt2Point.power) {
        console.warn('⚠️ LogLog Validation: LT1 >= LT2 detected, recalculating LT1...', {
          original_LT1: lt1Point,
          original_LT2: lt2Point
        })
        const fallbackLactate = lt2Point.lactate * 0.6
        lt1Point = interpolateThreshold(sortedData, Math.max(fallbackLactate, 1.5))
        console.log('✅ LogLog: Using 60% of LT2 lactate for LT1:', lt1Point)
      }
      break

    case 'plus1mmol':
      // +1.0 mmol/L - Faude et al. (2009)
      // LT1 = Laktat-Minimum in erster Testhälfte
      const halfPoint = Math.floor(sortedData.length / 2)
      const firstHalf = sortedData.slice(0, halfPoint)
      const minLactate = Math.min(...firstHalf.map(d => d.lactate))
      const minPoint = firstHalf.find(d => d.lactate === minLactate)
      lt1Point = minPoint ? { power: minPoint.power, lactate: minPoint.lactate } : null
      // LT2 = Baseline + 1.0 mmol/L
      lt2Point = interpolateThreshold(sortedData, minLactate + 1.0)
      break

    case 'moddmax':
      // ModDMAX - Bishop et al. (1998)
      // LT1 = Laktat-Minimum in erster Testhälfte
      const halfIdx = Math.floor(sortedData.length / 2)
      const firstHalfData = sortedData.slice(0, halfIdx)
      const minLac = Math.min(...firstHalfData.map(d => d.lactate))
      const minPt = firstHalfData.find(d => d.lactate === minLac)
      lt1Point = minPt ? { power: minPt.power, lactate: minPt.lactate } : null
      // LT2 = Max. Distanz ab Laktat-Minimum
      lt2Point = calculateModDMax(sortedData)
      
      // VALIDATION: Ensure LT1 < LT2 (edge case prevention)
      if (lt1Point && lt2Point && lt1Point.power >= lt2Point.power) {
        console.warn('⚠️ ModDMAX Validation: LT1 >= LT2 detected, using earlier point...', {
          original_LT1: lt1Point,
          original_LT2: lt2Point
        })
        const oneThirdIndex = Math.floor(sortedData.length / 3)
        lt1Point = { power: sortedData[oneThirdIndex].power, lactate: sortedData[oneThirdIndex].lactate }
        console.log('✅ ModDMAX: Using 1/3 test range for LT1:', lt1Point)
      }
      break

    case 'seiler':
      // Seiler 3-Zone Model - Seiler & Kjerland (2006)
      // Baseline = min der ersten 3 Punkte
      const seilerFirstThree = sortedData.slice(0, Math.min(3, sortedData.length))
      const baselineSeiler = Math.min(...seilerFirstThree.map(d => d.lactate))
      console.log('🔍 Seiler Baseline:', { baseline: baselineSeiler, firstThree: seilerFirstThree.map(d => d.lactate) })
      // VT1 = max(Baseline + 0.5, 1.8 mmol/L)
      const vt1Target = Math.max(baselineSeiler + 0.5, 1.8)
      console.log('🔍 Seiler VT1 target:', vt1Target)
      lt1Point = interpolateThreshold(sortedData, vt1Target)
      // VT2 = max(Baseline + 2.0, 3.5 mmol/L)
      const vt2Target = Math.max(baselineSeiler + 2.0, 3.5)
      console.log('🔍 Seiler VT2 target:', vt2Target)
      lt2Point = interpolateThreshold(sortedData, vt2Target)
      break

    case 'fatmax':
      // FatMax/LT - San-Millán & Brooks (2018)
      // Baseline = min der ersten 3 Punkte (wie bei Dickhuth)
      const fatmaxFirstThree = sortedData.slice(0, Math.min(3, sortedData.length))
      const baselineFatmax = Math.min(...fatmaxFirstThree.map(d => d.lactate))
      console.log('🔍 FatMax Baseline:', { baseline: baselineFatmax, firstThree: fatmaxFirstThree.map(d => d.lactate) })
      // LT1 = Baseline + 0.5 mmol/L (FatMax-Approximation)
      lt1Point = interpolateThreshold(sortedData, baselineFatmax + 0.5)
      // LT2 = Baseline + 1.5 mmol/L (MLSS-Approximation)
      lt2Point = interpolateThreshold(sortedData, baselineFatmax + 1.5)
      break

    case 'adjusted':
      // Manuelle Anpassung - wird extern gesetzt
      return { 
        lt1: null, 
        lt2: null,
        method,
        lt1Missing: true,
        lt2Missing: true,
        message: 'Manuelle Anpassung erforderlich'
      }
  }

  // GLOBAL VALIDATION: Ensure LT1 < LT2 for all methods (safety net)
  if (lt1Point && lt2Point) {
    if (lt1Point.power >= lt2Point.power || lt1Point.lactate > lt2Point.lactate) {
      console.error(`❌ ${method.toUpperCase()} GLOBAL VALIDATION FAILED:`, {
        lt1: lt1Point,
        lt2: lt2Point,
        issue: lt1Point.power >= lt2Point.power ? 'LT1 power >= LT2 power' : 'LT1 lactate > LT2 lactate'
      })
      
      // Apply universal fallback strategy
      const fallbackLactate = Math.min(lt2Point.lactate * 0.6, 2.0)
      const newLT1 = interpolateThreshold(sortedData, Math.max(fallbackLactate, 1.5))
      
      if (newLT1 && newLT1.power < lt2Point.power) {
        console.log(`✅ ${method.toUpperCase()}: Applied global fallback for LT1`, newLT1)
        lt1Point = newLT1
      } else {
        // Last resort: use first third of data
        const oneThirdIndex = Math.floor(sortedData.length / 3)
        const lastResortLT1 = { power: sortedData[oneThirdIndex].power, lactate: sortedData[oneThirdIndex].lactate }
        if (lastResortLT1.power < lt2Point.power) {
          console.log(`✅ ${method.toUpperCase()}: Applied last resort LT1 at 1/3 range`, lastResortLT1)
          lt1Point = lastResortLT1
        } else {
          console.error(`❌ ${method.toUpperCase()}: Could not fix LT1, setting to null`)
          lt1Point = null
        }
      }
    }
  }
  
  // Prüfe ob Schwellen gefunden wurden und erstelle Metadaten
  const lt1Missing = lt1Point === null
  const lt2Missing = lt2Point === null
  let message: string | undefined

  if (lt1Missing && lt2Missing) {
    message = `Methode "${method}" konnte keine Schwellen berechnen. Messdaten liegen möglicherweise außerhalb des erforderlichen Bereichs.`
  } else if (lt1Missing) {
    message = `Methode "${method}" konnte LT1 nicht berechnen. Messdaten liegen möglicherweise außerhalb des erforderlichen Bereichs.`
  } else if (lt2Missing) {
    message = `Methode "${method}" konnte LT2 nicht berechnen. Messdaten liegen möglicherweise außerhalb des erforderlichen Bereichs.`
  }

  console.log('🔍 Threshold Calculation Result:', {
    method,
    lt1Found: !lt1Missing,
    lt2Found: !lt2Missing,
    lt1: lt1Point,
    lt2: lt2Point,
    message
  })

  return { 
    lt1: lt1Point, 
    lt2: lt2Point,
    method,
    lt1Missing,
    lt2Missing,
    message
  }
}

/**
 * Interpoliert einen Schwellenpunkt bei einem gegebenen Laktatwert
 */
export function interpolateThreshold(
  data: LactateDataPoint[], 
  targetLactate: number
): ThresholdPoint | null {
  if (data.length < 2) {
    console.warn('⚠️ interpolateThreshold: Not enough data points', { dataLength: data.length, targetLactate })
    return null
  }
  
  const minLactate = Math.min(...data.map(d => d.lactate))
  const maxLactate = Math.max(...data.map(d => d.lactate))
  
  // Check if target lactate is within the measured range
  if (targetLactate < minLactate) {
    // Wenn Zielwert knapp unter Minimum liegt (< 10% Abweichung), extrapoliere vom ersten Punkt
    const deviation = (minLactate - targetLactate) / minLactate
    if (deviation < 0.1 && data.length >= 2) {
      // Lineare Extrapolation vom ersten zum zweiten Punkt
      const slope = (data[1].lactate - data[0].lactate) / (data[1].power - data[0].power)
      const extrapolatedPower = data[0].power - (data[0].lactate - targetLactate) / slope
      if (extrapolatedPower > 0) {
        console.log('✅ interpolateThreshold: Extrapolated below minimum', {
          targetLactate,
          minLactate,
          extrapolatedPower: Math.round(extrapolatedPower * 100) / 100
        })
        return { power: Math.round(extrapolatedPower * 100) / 100, lactate: targetLactate }
      }
    }
    console.warn('⚠️ interpolateThreshold: Target lactate below measured range', {
      targetLactate,
      minLactate,
      deviation: (deviation * 100).toFixed(1) + '%'
    })
    return null
  }
  
  if (targetLactate > maxLactate) {
    console.warn('⚠️ interpolateThreshold: Target lactate above maximum', {
      targetLactate,
      maxLactate
    })
    return null
  }
  
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].lactate <= targetLactate && data[i + 1].lactate >= targetLactate) {
      const lactateDiff = data[i + 1].lactate - data[i].lactate
      
      // Verhindere Division durch Null
      if (lactateDiff === 0) {
        console.warn('⚠️ interpolateThreshold: Zero lactate difference', {
          i,
          point1: data[i],
          point2: data[i + 1]
        })
        return null
      }
      
      const ratio = (targetLactate - data[i].lactate) / lactateDiff
      const power = data[i].power + ratio * (data[i + 1].power - data[i].power)
      
      // Validiere das Ergebnis
      if (isNaN(power) || !isFinite(power) || power < 0) {
        console.warn('⚠️ interpolateThreshold: Invalid power calculated', {
          power: typeof power === 'number' ? power.toFixed(2) : String(power),
          ratio: typeof ratio === 'number' ? ratio.toFixed(4) : String(ratio),
          targetLactate,
          point1: data[i],
          point2: data[i + 1]
        })
        return null
      }
      
      const result = { power: Math.round(power * 100) / 100, lactate: targetLactate }
      console.log('✅ interpolateThreshold found:', {
        power: result.power,
        lactate: result.lactate,
        interpolatedBetween: `${data[i].power} - ${data[i + 1].power}`
      })
      return result
    }
  }
  
  console.warn('⚠️ interpolateThreshold: No interpolation point found', {
    targetLactate,
    dataPoints: data.map(d => ({ power: d.power, lactate: d.lactate }))
  })
  return null
}

/**
 * DMAX Methode - Cheng et al.
 * Findet den Punkt mit maximalem Abstand zur Linie zwischen erstem und letztem Punkt
 * 
 * EINHEITENUNABHÄNGIG: Diese geometrische Berechnung funktioniert identisch für:
 * - Radfahren: Belastung in Watt
 * - Laufen: Geschwindigkeit in km/h
 * 
 * Die Formel berechnet den senkrechten Abstand eines Punktes (x, y) zu einer Geraden:
 * distance = |Ax + By + C| / sqrt(A² + B²)
 * Diese Berechnung ist rein geometrisch und unabhängig von den Einheiten der x-Achse.
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
 * ModDMAX - Bishop et al.
 * Modifizierte DMAX mit exponentieller Anpassung
 * 
 * EINHEITENUNABHÄNGIG: Verwendet relative Abstände mit exponentieller Kurvenanpassung:
 * expectedY = y₁ + (y₂ - y₁) * ((x - x₁)/(x₂ - x₁))^1.5
 * 
 * Die Formel arbeitet mit relativen Positionen und funktioniert für Watt und km/h identisch.
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
 * DMAX LT1 - Erster Deflektionspunkt (Steigung +50% über Baseline)
 * Nach Cheng et al. (1992) Dokumentation
 * 
 * IMPROVED: Only searches in first 70% of data to ensure LT1 < LT2
 */
export function calculateDMaxLT1(data: LactateDataPoint[]): ThresholdPoint | null {
  if (data.length < 3) return null
  
  const first = data[0]
  const last = data[data.length - 1]
  
  // Baseline-Steigung berechnen
  const baselineSlope = (last.lactate - first.lactate) / (last.power - first.power)
  const targetSlope = baselineSlope * 1.5 // +50% über Baseline
  
  // Only search in first 70% to ensure LT1 comes before LT2
  const searchLimit = Math.floor(data.length * 0.7)
  
  console.log('🔍 DMAX LT1 search:', {
    baselineSlope: baselineSlope.toFixed(4),
    targetSlope: targetSlope.toFixed(4),
    searchLimit,
    totalPoints: data.length
  })
  
  // Finde ersten Punkt mit Steigung > targetSlope
  for (let i = 1; i < searchLimit; i++) {
    const slope = (data[i + 1].lactate - data[i].lactate) / (data[i + 1].power - data[i].power)
    if (slope > targetSlope) {
      console.log('✅ DMAX LT1: Found deflection point', {
        power: data[i].power,
        lactate: data[i].lactate,
        slope: slope.toFixed(4),
        targetSlope: targetSlope.toFixed(4),
        index: i
      })
      return { power: data[i].power, lactate: data[i].lactate }
    }
  }
  
  // Fallback: Use 2.0 mmol/L or lactate at 1/3 of test range
  const oneThirdIndex = Math.floor(data.length / 3)
  const fallbackPoint = data[oneThirdIndex]
  console.log('⚠️ DMAX LT1: Using fallback at 1/3 of test range:', fallbackPoint)
  return { power: fallbackPoint.power, lactate: fallbackPoint.lactate }
}

/**
 * Log-Log Breakpoint Methode - Beaver et al. (1985)
 * Zwei-Linien-Regression mit variablem Breakpoint
 */
export function calculateLogLogBreakpoint(data: LactateDataPoint[]): { lt1: ThresholdPoint | null, lt2: ThresholdPoint | null } {
  if (data.length < 5) {
    return { lt1: null, lt2: null }
  }
  
  // Logarithmische Transformation
  const logData = data.map(d => ({
    logPower: Math.log(d.power),
    logLactate: Math.log(d.lactate),
    power: d.power,
    lactate: d.lactate
  }))
  
  let minSSE = Infinity
  let bestBreakpoint = 2
  
  // Finde optimalen Breakpoint
  for (let bp = 2; bp < logData.length - 2; bp++) {
    const segment1 = logData.slice(0, bp + 1)
    const segment2 = logData.slice(bp)
    
    // Lineare Regression für beide Segmente
    const reg1 = linearRegression(segment1.map(d => d.logPower), segment1.map(d => d.logLactate))
    const reg2 = linearRegression(segment2.map(d => d.logPower), segment2.map(d => d.logLactate))
    
    // Berechne Sum of Squared Errors
    let sse = 0
    for (let i = 0; i <= bp; i++) {
      const predicted = reg1.slope * logData[i].logPower + reg1.intercept
      sse += Math.pow(logData[i].logLactate - predicted, 2)
    }
    for (let i = bp; i < logData.length; i++) {
      const predicted = reg2.slope * logData[i].logPower + reg2.intercept
      sse += Math.pow(logData[i].logLactate - predicted, 2)
    }
    
    if (sse < minSSE) {
      minSSE = sse
      bestBreakpoint = bp
    }
  }
  
  // LT2 = Leistung am Breakpoint
  const lt2Point = { power: data[bestBreakpoint].power, lactate: data[bestBreakpoint].lactate }
  
  // LT1 = Erster Punkt mit signifikanter Steigungsänderung vor Breakpoint
  let lt1Point: ThresholdPoint | null = null
  for (let i = 1; i < bestBreakpoint; i++) {
    const slope1 = (logData[i].logLactate - logData[i-1].logLactate) / (logData[i].logPower - logData[i-1].logPower)
    const slope2 = (logData[i+1].logLactate - logData[i].logLactate) / (logData[i+1].logPower - logData[i].logPower)
    
    if (Math.abs(slope2 - slope1) > 0.5) {
      lt1Point = { power: data[i].power, lactate: data[i].lactate }
      break
    }
  }
  
  console.log('✅ Log-Log Breakpoint:', {
    breakpoint: bestBreakpoint,
    lt1: lt1Point,
    lt2: lt2Point
  })
  
  return { lt1: lt1Point, lt2: lt2Point }
}

/**
 * Lineare Regression Hilfsfunktion
 */
function linearRegression(x: number[], y: number[]): { slope: number, intercept: number } {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  return { slope, intercept }
}

// ===== 5-ZONEN TRAININGSSYSTEM =====
// Wissenschaftlich basierte Trainingszonen nach internationalen Standards

/**
 * Berechnet Trainingszonen basierend auf LT1/LT2 und gewählter Methode
 * @param lt1 - LT1 Schwellenpunkt
 * @param lt2 - LT2 Schwellenpunkt
 * @param maxPower - Maximale gemessene Belastung (Watt für Rad, km/h für Laufband)
 * @param method - Gewählte Schwellenmethode
 * @returns Array von Trainingszonen
 * @remarks Die Zonenbereiche funktionieren für beide Einheiten (Watt/km/h)
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
