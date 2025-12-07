import { useCallback } from 'react'
import { ThresholdPoint } from '@/lib/types'

interface UseManualThresholdsProps {
  selectedSessionId: string | null
  selectedCustomerId: string | null
}

interface UseManualThresholdsReturn {
  loadThresholds: () => Promise<{ lt1: ThresholdPoint; lt2: ThresholdPoint } | null>
  saveThresholds: (lt1: ThresholdPoint, lt2: ThresholdPoint) => Promise<boolean>
}

export function useManualThresholds({
  selectedSessionId,
  selectedCustomerId
}: UseManualThresholdsProps): UseManualThresholdsReturn {
  
  const loadThresholds = useCallback(async () => {
    if (!selectedSessionId || !selectedCustomerId) return null

    try {
      const response = await fetch(
        `/api/adjusted-thresholds?sessionId=${selectedSessionId}&customerId=${selectedCustomerId}&t=${Date.now()}`,
        { cache: 'no-cache' }
      )
      
      if (!response.ok) return null

      const data = await response.json()
      
      if (!data.success || !data.data?.lt1 || !data.data?.lt2) return null

      return {
        lt1: {
          power: parseFloat(data.data.lt1.power),
          lactate: parseFloat(data.data.lt1.lactate)
        },
        lt2: {
          power: parseFloat(data.data.lt2.power),
          lactate: parseFloat(data.data.lt2.lactate)
        }
      }
    } catch (error) {
      return null
    }
  }, [selectedSessionId, selectedCustomerId])

  const saveThresholds = useCallback(async (lt1: ThresholdPoint, lt2: ThresholdPoint) => {
    if (!selectedSessionId || !selectedCustomerId) return false

    if (!lt1 || !lt2 ||
        typeof lt1.power !== 'number' || typeof lt1.lactate !== 'number' ||
        typeof lt2.power !== 'number' || typeof lt2.lactate !== 'number') {
      return false
    }

    try {
      const response = await fetch('/api/adjusted-thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          profileId: selectedCustomerId,
          lt1Power: lt1.power,
          lt1Lactate: lt1.lactate,
          lt2Power: lt2.power,
          lt2Lactate: lt2.lactate,
          adjustedAt: new Date().toISOString()
        })
      })

      if (!response.ok) return false

      const result = await response.json()
      return result.success
    } catch (error) {
      return false
    }
  }, [selectedSessionId, selectedCustomerId])

  return {
    loadThresholds,
    saveThresholds
  }
}
