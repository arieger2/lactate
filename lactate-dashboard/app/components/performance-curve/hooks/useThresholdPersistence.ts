import { useState, useEffect, useCallback } from 'react'
import { ThresholdPoint, TrainingZone } from '@/lib/types'
import { ThresholdMethod, calculateTrainingZones } from '@/lib/lactateCalculations'

interface UseThresholdPersistenceProps {
  selectedSessionId: string | null
  selectedCustomer: any
  webhookData: any[]
  lt1: ThresholdPoint | null
  lt2: ThresholdPoint | null
  selectedMethod: ThresholdMethod
  setLt1: (threshold: ThresholdPoint | null) => void
  setLt2: (threshold: ThresholdPoint | null) => void
  setTrainingZones: (zones: TrainingZone[]) => void
  setSelectedMethod: (method: ThresholdMethod) => void
  calculateThresholdsWrapper: (data: any[], method: ThresholdMethod, unit: string) => void
}

interface UseThresholdPersistenceReturn {
  isAdjusted: boolean
  isManuallyLoading: boolean
  setIsAdjusted: (adjusted: boolean) => void
  setIsManuallyLoading: (loading: boolean) => void
  saveAdjustedThresholds: () => Promise<void>
  saveAdjustedThresholdsWithValues: (lt1: ThresholdPoint, lt2: ThresholdPoint) => Promise<void>
  loadAdjustedThresholds: () => Promise<boolean>
}

export function useThresholdPersistence({
  selectedSessionId,
  selectedCustomer,
  webhookData,
  lt1,
  lt2,
  selectedMethod,
  setLt1,
  setLt2,
  setTrainingZones,
  setSelectedMethod,
  calculateThresholdsWrapper
}: UseThresholdPersistenceProps): UseThresholdPersistenceReturn {
  const [isAdjusted, setIsAdjusted] = useState(false)
  const [isManuallyLoading, setIsManuallyLoading] = useState(false)

  // Save adjusted thresholds with specific values
  const saveAdjustedThresholdsWithValues = useCallback(async (lt1Value: ThresholdPoint, lt2Value: ThresholdPoint) => {
    if (!selectedSessionId || !selectedCustomer) {
      console.warn('⚠️ Cannot save: missing session or customer')
      return
    }
    
    // Validate threshold values
    if (!lt1Value || !lt2Value ||
        typeof lt1Value.power !== 'number' || typeof lt1Value.lactate !== 'number' || 
        typeof lt2Value.power !== 'number' || typeof lt2Value.lactate !== 'number') {
      console.warn('⚠️ Cannot save: invalid threshold values', { lt1Value, lt2Value })
      return
    }
    
    try {
      const response = await fetch('/api/adjusted-thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          profileId: selectedCustomer.customer_id,
          lt1Power: lt1Value.power,
          lt1Lactate: lt1Value.lactate,
          lt2Power: lt2Value.power,
          lt2Lactate: lt2Value.lactate,
          adjustedAt: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          console.log('✅ Successfully saved adjusted thresholds')
          setIsAdjusted(true)
        } else {
          console.error('❌ Failed to save adjusted thresholds:', result.message)
        }
      } else {
        const errorText = await response.text()
        console.error('❌ HTTP error saving adjusted thresholds:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ Error saving adjusted thresholds:', error)
    }
  }, [selectedSessionId, selectedCustomer])

  // Save current lt1/lt2 from state
  const saveAdjustedThresholds = useCallback(async () => {
    if (!selectedSessionId || !lt1 || !lt2 || !selectedCustomer) {
      console.warn('⚠️ Cannot save: missing session, customer, or threshold data')
      return
    }
    
    // Additional null checks for threshold properties
    if (typeof lt1.power !== 'number' || typeof lt1.lactate !== 'number' || 
        typeof lt2.power !== 'number' || typeof lt2.lactate !== 'number') {
      console.warn('⚠️ Cannot save: invalid threshold values')
      return
    }
    
    await saveAdjustedThresholdsWithValues(lt1, lt2)
  }, [selectedSessionId, lt1, lt2, selectedCustomer, saveAdjustedThresholdsWithValues])

  // Load adjusted thresholds from database
  const loadAdjustedThresholds = useCallback(async (): Promise<boolean> => {
    if (!selectedSessionId || !selectedCustomer) {
      console.log('📊 Cannot load adjusted thresholds: missing session or customer')
      return false
    }
    
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now()
      const response = await fetch(`/api/adjusted-thresholds?sessionId=${selectedSessionId}&customerId=${selectedCustomer.customer_id}&t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && result.data.lt1 && result.data.lt2) {
          const data = result.data
          
          const lt1Data = { power: parseFloat(data.lt1.power), lactate: parseFloat(data.lt1.lactate) }
          const lt2Data = { power: parseFloat(data.lt2.power), lactate: parseFloat(data.lt2.lactate) }
          
          console.log('✅ Loaded adjusted thresholds:', { lt1Data, lt2Data })
          
          // Only update state if we're in adjusted mode or checking for existence
          if (selectedMethod === 'adjusted') {
            setLt1(lt1Data)
            setLt2(lt2Data)
            
            // Berechne Trainingszonen mit den geladenen Werten
            if (webhookData.length > 0) {
              const maxPower = Math.max(...webhookData.map(d => d.power), 400)
              const zones = calculateTrainingZones(
                lt1Data,
                lt2Data,
                maxPower,
                'adjusted'
              )
              setTrainingZones(zones)
            }
          }
          
          return true
        } else {
          console.log('📊 No adjusted thresholds found for session:', selectedSessionId)
          return false
        }
      } else {
        console.log('📊 No adjusted thresholds response for session:', selectedSessionId)
        return false
      }
    } catch (error) {
      console.error('❌ Error loading adjusted thresholds:', error)
      return false
    }
  }, [selectedSessionId, selectedCustomer, selectedMethod, setLt1, setLt2, setTrainingZones, webhookData])

  // Check for adjusted thresholds whenever session or customer changes
  useEffect(() => {
    const checkAdjustedThresholds = async () => {
      if (selectedSessionId && selectedCustomer && !isManuallyLoading) {
        const hasAdjusted = await loadAdjustedThresholds()
        setIsAdjusted(hasAdjusted)
        
        // If we're currently on adjusted method and no adjusted data exists, switch to default method
        if (selectedMethod === 'adjusted') {
          if (hasAdjusted) {
            // Always load and apply manual values when switching sessions in adjusted mode
            await loadAdjustedThresholds()
          } else {
            setSelectedMethod('dmax')
            if (webhookData.length > 0) {
              calculateThresholdsWrapper(webhookData, 'dmax', 'watt')
            }
          }
        }
      }
    }
    checkAdjustedThresholds()
  }, [selectedSessionId, selectedCustomer, isManuallyLoading])

  // Auto-load adjusted thresholds when switching to adjusted method
  useEffect(() => {
    if (selectedMethod === 'adjusted' && selectedSessionId && selectedCustomer && webhookData.length > 0 && !isManuallyLoading) {
      loadAdjustedThresholds()
    }
  }, [selectedMethod, selectedSessionId, selectedCustomer, webhookData.length, isManuallyLoading, loadAdjustedThresholds])

  return {
    isAdjusted,
    isManuallyLoading,
    setIsAdjusted,
    setIsManuallyLoading,
    saveAdjustedThresholds,
    saveAdjustedThresholdsWithValues,
    loadAdjustedThresholds
  }
}
