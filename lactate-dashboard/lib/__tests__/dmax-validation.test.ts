/**
 * DMAX Threshold Validation Tests
 * Tests the fix for LT1/LT2 order validation
 */

import { calculateThresholds, calculateDMax, calculateDMaxLT1 } from '../lactateCalculations'
import { LactateDataPoint } from '../types'

describe('DMAX Threshold Calculation', () => {
  describe('Normal lactate curve', () => {
    it('should calculate LT1 < LT2 for typical curve', () => {
      const data: LactateDataPoint[] = [
        { power: 100, lactate: 1.5, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 150, lactate: 1.8, heartRate: 140, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
        { power: 200, lactate: 2.5, heartRate: 160, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 250, lactate: 4.0, heartRate: 175, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
        { power: 300, lactate: 7.0, heartRate: 185, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
      ]

      const result = calculateThresholds(data, 'dmax')

      expect(result.lt1).not.toBeNull()
      expect(result.lt2).not.toBeNull()
      
      if (result.lt1 && result.lt2) {
        expect(result.lt1.power).toBeLessThan(result.lt2.power)
        expect(result.lt1.lactate).toBeLessThan(result.lt2.lactate)
        console.log('✅ Normal curve:', { lt1: result.lt1, lt2: result.lt2 })
      }
    })
  })

  describe('Steep late rise (problematic scenario)', () => {
    it('should handle steep late rise with validation', () => {
      const data: LactateDataPoint[] = [
        { power: 100, lactate: 1.5, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 150, lactate: 1.7, heartRate: 130, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
        { power: 200, lactate: 1.9, heartRate: 140, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 250, lactate: 2.2, heartRate: 150, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
        { power: 300, lactate: 8.0, heartRate: 180, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
      ]

      const result = calculateThresholds(data, 'dmax')

      expect(result.lt1).not.toBeNull()
      expect(result.lt2).not.toBeNull()
      
      if (result.lt1 && result.lt2) {
        // VALIDATION: LT1 must be before LT2
        expect(result.lt1.power).toBeLessThan(result.lt2.power)
        expect(result.lt1.lactate).toBeLessThan(result.lt2.lactate)
        console.log('✅ Steep rise handled:', { lt1: result.lt1, lt2: result.lt2 })
      }
    })
  })

  describe('Flat beginning (edge case)', () => {
    it('should handle flat beginning curve', () => {
      const data: LactateDataPoint[] = [
        { power: 100, lactate: 1.0, heartRate: 110, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 150, lactate: 1.1, heartRate: 120, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
        { power: 200, lactate: 1.2, heartRate: 130, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 250, lactate: 3.5, heartRate: 160, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
        { power: 300, lactate: 6.0, heartRate: 180, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
      ]

      const result = calculateThresholds(data, 'dmax')

      expect(result.lt1).not.toBeNull()
      expect(result.lt2).not.toBeNull()
      
      if (result.lt1 && result.lt2) {
        expect(result.lt1.power).toBeLessThan(result.lt2.power)
        expect(result.lt1.lactate).toBeLessThanOrEqual(result.lt2.lactate)
        console.log('✅ Flat beginning handled:', { lt1: result.lt1, lt2: result.lt2 })
      }
    })
  })

  describe('Running test (km/h units)', () => {
    it('should work with km/h instead of watts', () => {
      // Typical running test with speeds in km/h
      const data: LactateDataPoint[] = [
        { power: 7.0, lactate: 1.3, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 9.0, lactate: 1.5, heartRate: 135, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
        { power: 11.0, lactate: 2.0, heartRate: 150, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 13.0, lactate: 3.5, heartRate: 170, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
        { power: 15.0, lactate: 6.0, heartRate: 185, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
      ]

      const result = calculateThresholds(data, 'dmax')

      expect(result.lt1).not.toBeNull()
      expect(result.lt2).not.toBeNull()
      
      if (result.lt1 && result.lt2) {
        expect(result.lt1.power).toBeLessThan(result.lt2.power)
        expect(result.lt1.lactate).toBeLessThan(result.lt2.lactate)
        console.log('✅ Running test (km/h):', { lt1: result.lt1, lt2: result.lt2 })
      }
    })
  })

  describe('Screenshot scenario (from user report)', () => {
    it('should fix the reported issue with LT2 before LT1', () => {
      // Approximating the data from the screenshot
      const data: LactateDataPoint[] = [
        { power: 7.0, lactate: 1.5, heartRate: 110, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 9.0, lactate: 1.6, heartRate: 125, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
        { power: 11.0, lactate: 1.8, heartRate: 140, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 13.0, lactate: 4.0, heartRate: 165, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
        { power: 15.0, lactate: 6.5, heartRate: 180, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
      ]

      const result = calculateThresholds(data, 'dmax')

      expect(result.lt1).not.toBeNull()
      expect(result.lt2).not.toBeNull()
      
      if (result.lt1 && result.lt2) {
        // This was failing before: LT2 at 11 km/h, LT1 at 13 km/h
        // After fix: LT1 should be before LT2
        expect(result.lt1.power).toBeLessThan(result.lt2.power)
        expect(result.lt1.lactate).toBeLessThan(result.lt2.lactate)
        
        console.log('✅ Screenshot scenario fixed:', {
          lt1: result.lt1,
          lt2: result.lt2,
          validation: 'PASSED'
        })
      }
    })
  })

  describe('Component functions', () => {
    it('calculateDMax should find maximum distance point', () => {
      const data: LactateDataPoint[] = [
        { power: 100, lactate: 1.5, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 150, lactate: 2.0, heartRate: 140, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
        { power: 200, lactate: 4.0, heartRate: 160, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 250, lactate: 6.0, heartRate: 175, timestamp: new Date('2024-01-01T10:09:00').toISOString() }
      ]

      const lt2 = calculateDMax(data)
      expect(lt2).not.toBeNull()
      
      if (lt2) {
        // Maximum distance should be around the inflection point
        expect(lt2.power).toBeGreaterThan(100)
        expect(lt2.power).toBeLessThan(250)
        console.log('✅ DMAX LT2:', lt2)
      }
    })

    it('calculateDMaxLT1 should find early deflection in first 70%', () => {
      const data: LactateDataPoint[] = [
        { power: 100, lactate: 1.5, heartRate: 120, timestamp: new Date('2024-01-01T10:00:00').toISOString() },
        { power: 150, lactate: 1.7, heartRate: 130, timestamp: new Date('2024-01-01T10:03:00').toISOString() },
        { power: 200, lactate: 2.5, heartRate: 145, timestamp: new Date('2024-01-01T10:06:00').toISOString() },
        { power: 250, lactate: 4.0, heartRate: 165, timestamp: new Date('2024-01-01T10:09:00').toISOString() },
        { power: 300, lactate: 7.0, heartRate: 180, timestamp: new Date('2024-01-01T10:12:00').toISOString() }
      ]

      const lt1 = calculateDMaxLT1(data)
      expect(lt1).not.toBeNull()
      
      if (lt1) {
        // Should be in first 70% of range
        const maxSearchPower = 100 + (300 - 100) * 0.7 // = 240
        expect(lt1.power).toBeLessThanOrEqual(maxSearchPower)
        console.log('✅ DMAX LT1 (limited search):', lt1)
      }
    })
  })
})
