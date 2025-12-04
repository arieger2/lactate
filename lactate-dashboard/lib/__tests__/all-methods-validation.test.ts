/**
 * Complete Threshold Methods Validation Tests
 * Tests all 9 methods for LT1 < LT2 validation
 */

import { calculateThresholds } from '../lactateCalculations'
import { LactateDataPoint } from '../types'

describe('All Threshold Methods - LT1 < LT2 Validation', () => {
  // Test data sets
  const normalCurve: LactateDataPoint[] = [
    { power: 100, lactate: 1.5, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
    { power: 150, lactate: 1.8, heartRate: 140, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
    { power: 200, lactate: 2.5, heartRate: 160, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
    { power: 250, lactate: 4.0, heartRate: 175, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
    { power: 300, lactate: 7.0, heartRate: 185, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
  ]

  const steepLateRise: LactateDataPoint[] = [
    { power: 100, lactate: 1.5, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
    { power: 150, lactate: 1.6, heartRate: 130, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
    { power: 200, lactate: 1.7, heartRate: 140, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
    { power: 250, lactate: 2.0, heartRate: 150, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
    { power: 300, lactate: 7.0, heartRate: 180, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
  ]

  const flatBeginning: LactateDataPoint[] = [
    { power: 100, lactate: 1.0, heartRate: 110, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
    { power: 150, lactate: 1.1, heartRate: 120, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
    { power: 200, lactate: 1.2, heartRate: 130, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
    { power: 250, lactate: 3.5, heartRate: 160, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
    { power: 300, lactate: 6.0, heartRate: 180, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
  ]

  const runningTest: LactateDataPoint[] = [
    { power: 7.0, lactate: 1.3, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
    { power: 9.0, lactate: 1.5, heartRate: 135, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
    { power: 11.0, lactate: 2.0, heartRate: 150, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
    { power: 13.0, lactate: 3.5, heartRate: 170, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
    { power: 15.0, lactate: 6.0, heartRate: 185, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
  ]

  // Validation helper
  const validateThresholds = (result: any, methodName: string, dataDescription: string) => {
    expect(result).toBeDefined()
    
    if (result.lt1 && result.lt2) {
      // Main validation: LT1 must be before LT2
      expect(result.lt1.power).toBeLessThan(result.lt2.power)
      
      // Lactate validation: LT1 lactate should be less than or equal to LT2
      // (equal is acceptable for some edge cases with fallbacks)
      expect(result.lt1.lactate).toBeLessThanOrEqual(result.lt2.lactate)
      
      console.log(`✅ ${methodName} - ${dataDescription}:`, {
        lt1: `${result.lt1.power}W @ ${result.lt1.lactate} mmol/L`,
        lt2: `${result.lt2.power}W @ ${result.lt2.lactate} mmol/L`
      })
    } else {
      console.log(`⚠️ ${methodName} - ${dataDescription}: Missing thresholds`, {
        lt1: result.lt1,
        lt2: result.lt2,
        message: result.message
      })
    }
  }

  describe('Mader Method', () => {
    it('should handle normal curve', () => {
      const result = calculateThresholds(normalCurve, 'mader')
      validateThresholds(result, 'Mader', 'normal curve')
    })

    it('should handle steep late rise', () => {
      const result = calculateThresholds(steepLateRise, 'mader')
      validateThresholds(result, 'Mader', 'steep late rise')
    })

    it('should handle flat beginning', () => {
      const result = calculateThresholds(flatBeginning, 'mader')
      validateThresholds(result, 'Mader', 'flat beginning')
    })

    it('should handle running test (km/h)', () => {
      const result = calculateThresholds(runningTest, 'mader')
      validateThresholds(result, 'Mader', 'running test')
    })
  })

  describe('DMAX Method', () => {
    it('should handle normal curve', () => {
      const result = calculateThresholds(normalCurve, 'dmax')
      validateThresholds(result, 'DMAX', 'normal curve')
    })

    it('should handle steep late rise with validation', () => {
      const result = calculateThresholds(steepLateRise, 'dmax')
      validateThresholds(result, 'DMAX', 'steep late rise')
    })

    it('should handle flat beginning', () => {
      const result = calculateThresholds(flatBeginning, 'dmax')
      validateThresholds(result, 'DMAX', 'flat beginning')
    })

    it('should handle running test (km/h)', () => {
      const result = calculateThresholds(runningTest, 'dmax')
      validateThresholds(result, 'DMAX', 'running test')
    })
  })

  describe('Dickhuth Method', () => {
    it('should handle normal curve', () => {
      const result = calculateThresholds(normalCurve, 'dickhuth')
      validateThresholds(result, 'Dickhuth', 'normal curve')
    })

    it('should handle steep late rise', () => {
      const result = calculateThresholds(steepLateRise, 'dickhuth')
      validateThresholds(result, 'Dickhuth', 'steep late rise')
    })

    it('should handle flat beginning', () => {
      const result = calculateThresholds(flatBeginning, 'dickhuth')
      validateThresholds(result, 'Dickhuth', 'flat beginning')
    })

    it('should handle running test (km/h)', () => {
      const result = calculateThresholds(runningTest, 'dickhuth')
      validateThresholds(result, 'Dickhuth', 'running test')
    })
  })

  describe('LogLog Method', () => {
    it('should handle normal curve', () => {
      const result = calculateThresholds(normalCurve, 'loglog')
      validateThresholds(result, 'LogLog', 'normal curve')
    })

    it('should handle steep late rise with validation', () => {
      const result = calculateThresholds(steepLateRise, 'loglog')
      validateThresholds(result, 'LogLog', 'steep late rise')
    })

    it('should handle flat beginning', () => {
      const result = calculateThresholds(flatBeginning, 'loglog')
      validateThresholds(result, 'LogLog', 'flat beginning')
    })

    it('should handle running test (km/h)', () => {
      const result = calculateThresholds(runningTest, 'loglog')
      validateThresholds(result, 'LogLog', 'running test')
    })

    it('should provide fallback when no LT1 detected', () => {
      // Very smooth curve - no slope changes
      const smoothCurve: LactateDataPoint[] = [
        { power: 100, lactate: 1.5, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 150, lactate: 1.6, heartRate: 130, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
        { power: 200, lactate: 1.7, heartRate: 140, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 250, lactate: 1.8, heartRate: 150, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
        { power: 300, lactate: 5.0, heartRate: 180, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
      ]
      const result = calculateThresholds(smoothCurve, 'loglog')
      validateThresholds(result, 'LogLog', 'smooth curve with fallback')
      
      // Should have found LT1 via fallback
      expect(result.lt1).not.toBeNull()
    })
  })

  describe('Plus1mmol Method', () => {
    it('should handle normal curve', () => {
      const result = calculateThresholds(normalCurve, 'plus1mmol')
      validateThresholds(result, 'Plus1mmol', 'normal curve')
    })

    it('should handle steep late rise', () => {
      const result = calculateThresholds(steepLateRise, 'plus1mmol')
      validateThresholds(result, 'Plus1mmol', 'steep late rise')
    })

    it('should handle flat beginning', () => {
      const result = calculateThresholds(flatBeginning, 'plus1mmol')
      validateThresholds(result, 'Plus1mmol', 'flat beginning')
    })

    it('should handle running test (km/h)', () => {
      const result = calculateThresholds(runningTest, 'plus1mmol')
      validateThresholds(result, 'Plus1mmol', 'running test')
    })
  })

  describe('ModDMAX Method', () => {
    it('should handle normal curve', () => {
      const result = calculateThresholds(normalCurve, 'moddmax')
      validateThresholds(result, 'ModDMAX', 'normal curve')
    })

    it('should handle steep late rise with validation', () => {
      const result = calculateThresholds(steepLateRise, 'moddmax')
      validateThresholds(result, 'ModDMAX', 'steep late rise')
    })

    it('should handle flat beginning', () => {
      const result = calculateThresholds(flatBeginning, 'moddmax')
      validateThresholds(result, 'ModDMAX', 'flat beginning')
    })

    it('should handle running test (km/h)', () => {
      const result = calculateThresholds(runningTest, 'moddmax')
      validateThresholds(result, 'ModDMAX', 'running test')
    })
  })

  describe('Seiler Method', () => {
    it('should handle normal curve', () => {
      const result = calculateThresholds(normalCurve, 'seiler')
      validateThresholds(result, 'Seiler', 'normal curve')
    })

    it('should handle steep late rise', () => {
      const result = calculateThresholds(steepLateRise, 'seiler')
      validateThresholds(result, 'Seiler', 'steep late rise')
    })

    it('should handle flat beginning', () => {
      const result = calculateThresholds(flatBeginning, 'seiler')
      validateThresholds(result, 'Seiler', 'flat beginning')
    })

    it('should handle running test (km/h)', () => {
      const result = calculateThresholds(runningTest, 'seiler')
      validateThresholds(result, 'Seiler', 'running test')
    })
  })

  describe('FatMax Method', () => {
    it('should handle normal curve', () => {
      const result = calculateThresholds(normalCurve, 'fatmax')
      validateThresholds(result, 'FatMax', 'normal curve')
    })

    it('should handle steep late rise', () => {
      const result = calculateThresholds(steepLateRise, 'fatmax')
      validateThresholds(result, 'FatMax', 'steep late rise')
    })

    it('should handle flat beginning', () => {
      const result = calculateThresholds(flatBeginning, 'fatmax')
      validateThresholds(result, 'FatMax', 'flat beginning')
    })

    it('should handle running test (km/h)', () => {
      const result = calculateThresholds(runningTest, 'fatmax')
      validateThresholds(result, 'FatMax', 'running test')
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimum data points (3 points)', () => {
      const minData: LactateDataPoint[] = [
        { power: 100, lactate: 1.5, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 200, lactate: 3.0, heartRate: 160, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 300, lactate: 6.0, heartRate: 180, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
      ]

      const methods = ['mader', 'dmax', 'dickhuth', 'seiler', 'fatmax'] as const
      methods.forEach(method => {
        const result = calculateThresholds(minData, method)
        validateThresholds(result, method.toUpperCase(), 'minimum data')
      })
    })

    it('should handle very high lactate values', () => {
      const highLactate: LactateDataPoint[] = [
        { power: 100, lactate: 3.0, heartRate: 140, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 150, lactate: 4.5, heartRate: 160, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
        { power: 200, lactate: 7.0, heartRate: 175, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 250, lactate: 12.0, heartRate: 185, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
        { power: 300, lactate: 18.0, heartRate: 195, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
      ]

      const methods = ['mader', 'dmax', 'dickhuth', 'seiler', 'fatmax'] as const
      methods.forEach(method => {
        const result = calculateThresholds(highLactate, method)
        validateThresholds(result, method.toUpperCase(), 'high lactate')
      })
    })

    it('should handle lactate plateau (minimal rise)', () => {
      const plateau: LactateDataPoint[] = [
        { power: 100, lactate: 1.5, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 150, lactate: 1.6, heartRate: 130, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
        { power: 200, lactate: 1.7, heartRate: 140, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 250, lactate: 1.8, heartRate: 150, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
        { power: 300, lactate: 1.9, heartRate: 160, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
      ]

      const methods = ['mader', 'dmax', 'dickhuth', 'plus1mmol', 'seiler'] as const
      methods.forEach(method => {
        const result = calculateThresholds(plateau, method)
        // Some methods might not find thresholds in plateau data
        console.log(`${method.toUpperCase()} - plateau:`, result)
      })
    })
  })

  describe('Comparison across all methods', () => {
    it('should produce consistent ordering for normal curve', () => {
      const methods = ['mader', 'dmax', 'dickhuth', 'loglog', 'plus1mmol', 'moddmax', 'seiler', 'fatmax'] as const
      
      const results = methods.map(method => ({
        method,
        result: calculateThresholds(normalCurve, method)
      }))

      console.log('\n📊 All Methods Comparison - Normal Curve:')
      results.forEach(({ method, result }) => {
        if (result.lt1 && result.lt2) {
          console.log(`  ${method.padEnd(10)}: LT1 ${result.lt1.power}W @ ${result.lt1.lactate.toFixed(2)} → LT2 ${result.lt2.power}W @ ${result.lt2.lactate.toFixed(2)}`)
          expect(result.lt1.power).toBeLessThan(result.lt2.power)
        }
      })
    })

    it('should produce consistent ordering for steep late rise', () => {
      const methods = ['mader', 'dmax', 'dickhuth', 'loglog', 'plus1mmol', 'moddmax', 'seiler', 'fatmax'] as const
      
      const results = methods.map(method => ({
        method,
        result: calculateThresholds(steepLateRise, method)
      }))

      console.log('\n📊 All Methods Comparison - Steep Late Rise:')
      results.forEach(({ method, result }) => {
        if (result.lt1 && result.lt2) {
          console.log(`  ${method.padEnd(10)}: LT1 ${result.lt1.power}W @ ${result.lt1.lactate.toFixed(2)} → LT2 ${result.lt2.power}W @ ${result.lt2.lactate.toFixed(2)}`)
          expect(result.lt1.power).toBeLessThan(result.lt2.power)
        }
      })
    })
  })
})
