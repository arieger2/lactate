import { useCallback } from 'react'
import { TrainingZone } from '@/lib/types'

interface UseManualZonesProps {
  selectedSessionId: string | null
  selectedCustomerId: string | null
}

interface UseManualZonesReturn {
  loadZones: () => Promise<TrainingZone[] | null>
  saveZones: (zones: TrainingZone[]) => Promise<boolean>
}

export function useManualZones({
  selectedSessionId,
  selectedCustomerId
}: UseManualZonesProps): UseManualZonesReturn {
  
  const loadZones = useCallback(async () => {
    if (!selectedSessionId || !selectedCustomerId) return null

    try {
      const response = await fetch(
        `/api/manual-zones?sessionId=${selectedSessionId}&t=${Date.now()}`,
        { cache: 'no-cache' }
      )
      
      if (!response.ok) return null

      const data = await response.json()
      
      if (!data.success || !data.data || data.data.length === 0) return null

      const zoneDefinitions = [
        { name: 'Zone 1 - Regeneration', color: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.8)', description: 'Regeneration & Fettstoffwechsel' },
        { name: 'Zone 2 - Aerobe Basis', color: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 0.8)', description: 'Aerober Grundlagenbereich (bis LT1)' },
        { name: 'Zone 3 - Schwelle', color: 'rgba(251, 191, 36, 0.2)', borderColor: 'rgba(251, 191, 36, 0.8)', description: 'Tempobereich (LT1 bis LT2)' },
        { name: 'Zone 4 - Anaerob', color: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.8)', description: 'Entwicklungsbereich (ab LT2)' },
        { name: 'Zone 5 - Power', color: 'rgba(147, 51, 234, 0.2)', borderColor: 'rgba(147, 51, 234, 0.8)', description: 'Maximale Intensität' }
      ]

      return data.data.map((zone: any) => ({
        id: zone.id,
        name: zoneDefinitions[zone.id - 1].name,
        range: [zone.min, zone.max] as [number, number],
        color: zoneDefinitions[zone.id - 1].color,
        borderColor: zoneDefinitions[zone.id - 1].borderColor,
        description: zoneDefinitions[zone.id - 1].description
      }))
    } catch (error) {
      return null
    }
  }, [selectedSessionId, selectedCustomerId])

  const saveZones = useCallback(async (zones: TrainingZone[]) => {
    if (!selectedSessionId || !selectedCustomerId) return false
    if (!zones || zones.length === 0) return false

    try {
      const zonesPayload = zones.map(zone => ({
        id: zone.id,
        min: zone.range[0],
        max: zone.range[1]
      }))

      const response = await fetch('/api/manual-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          profileId: selectedCustomerId,
          zones: zonesPayload
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
    loadZones,
    saveZones
  }
}
