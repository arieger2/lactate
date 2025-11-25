'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ReactEcharts from 'echarts-for-react'
import { lactateDataService } from '@/lib/lactateDataService'
import { useCustomer } from '@/lib/CustomerContext'

// Types for the webhook data
interface LactateWebhookData {
  timestamp: string
  power: number
  lactate: number
  heartRate?: number
  fatOxidation?: number
}

interface ThresholdData {
  lt1: {
    power: number
    lactate: number
    heartRate?: number
  }
  lt2: {
    power: number
    lactate: number
    heartRate?: number
  }
  fatMax?: {
    power: number
    fatOxidation: number
    heartRate?: number
  }
}

// Zone boundaries type for custom adjustments
interface ZoneBoundaries {
  z1End: number   // End of Z1 / Start of Z2
  z2End: number   // End of Z2 / Start of Z3 (LT1)
  z3End: number   // End of Z3 / Start of Z4 (LT2)
  z4End: number   // End of Z4 / Start of Z5
}

type OverlayType = 'dmax' | 'lt2ians' | 'mader' | 'stegmann' | 'fes' | 'coggan' | 'seiler' | 'inscyd'

const LactatePerformanceCurve = () => {
  // Use global customer context
  const { selectedCustomer } = useCustomer()
  
  const [webhookData, setWebhookData] = useState<LactateWebhookData[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [availableSessions, setAvailableSessions] = useState<{id: string, lastUpdated: string, pointCount: number}[]>([])
  const [isReceivingData, setIsReceivingData] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [thresholds, setThresholds] = useState<ThresholdData | null>(null)
  const [activeOverlay, setActiveOverlay] = useState<OverlayType | null>('dmax')
  const [chartKey, setChartKey] = useState(0)
  
  // Custom zone boundaries (user-adjustable)
  const [customZoneBoundaries, setCustomZoneBoundaries] = useState<ZoneBoundaries | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [dragBoundary, setDragBoundary] = useState<string | null>(null)
  const [hoverBoundary, setHoverBoundary] = useState<string | null>(null)
  const [hasSavedAdjustedZones, setHasSavedAdjustedZones] = useState(false)
  const [savedAdjustedBoundaries, setSavedAdjustedBoundaries] = useState<ZoneBoundaries | null>(null)
  const chartRef = useRef<any>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // Threshold calculation methods
  const thresholdMethods: Record<OverlayType, { name: string; color: string; description: string; calculate: (data: LactateWebhookData[]) => ThresholdData | null }> = {
    dmax: {
      name: 'DMAX',
      color: '#dc2626',
      description: 'Maximum lactate steady state (MLSS) method',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Calculate maximum perpendicular distance from baseline to lactate curve
        const startPoint = sortedData[0]
        const endPoint = sortedData[sortedData.length - 1]
        
        let maxDistance = 0
        let dmaxIndex = Math.floor(sortedData.length / 2)
        
        // Line equation: y = mx + b from start to end point
        const m = (endPoint.lactate - startPoint.lactate) / (endPoint.power - startPoint.power)
        const b = startPoint.lactate - m * startPoint.power
        
        for (let i = 1; i < sortedData.length - 1; i++) {
          const point = sortedData[i]
          const lineY = m * point.power + b
          const distance = Math.abs(point.lactate - lineY)
          
          if (distance > maxDistance) {
            maxDistance = distance
            dmaxIndex = i
          }
        }
        
        // LT1 at ~70% of DMAX power
        const dmaxPower = sortedData[dmaxIndex].power
        const lt1Power = dmaxPower * 0.7
        const lt1Point = sortedData.reduce((prev, curr) => 
          Math.abs(curr.power - lt1Power) < Math.abs(prev.power - lt1Power) ? curr : prev
        )
        
        return {
          lt1: { power: lt1Point.power, lactate: lt1Point.lactate, heartRate: lt1Point.heartRate },
          lt2: { power: sortedData[dmaxIndex].power, lactate: sortedData[dmaxIndex].lactate, heartRate: sortedData[dmaxIndex].heartRate }
        }
      }
    },
    lt2ians: {
      name: 'LT2/IANS',
      color: '#7c2d12',
      description: 'Individual Anaerobic Threshold based on lactate kinetics',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Calculate lactate accumulation rate (IANS method)
        let maxAccumulation = 0
        let iansIndex = sortedData.length - 2
        
        for (let i = 2; i < sortedData.length - 1; i++) {
          // Rate of lactate accumulation over 3 points
          const rate1 = (sortedData[i].lactate - sortedData[i-1].lactate) / (sortedData[i].power - sortedData[i-1].power)
          const rate2 = (sortedData[i+1].lactate - sortedData[i].lactate) / (sortedData[i+1].power - sortedData[i].power)
          const acceleration = rate2 - rate1
          
          if (acceleration > maxAccumulation && sortedData[i].lactate > 2.0) {
            maxAccumulation = acceleration
            iansIndex = i
          }
        }
        
        // LT1 at point where lactate starts rising consistently
        let lt1Index = 1
        for (let i = 1; i < iansIndex; i++) {
          if (sortedData[i].lactate > sortedData[0].lactate + 0.8) {
            lt1Index = i
            break
          }
        }
        
        return {
          lt1: { power: sortedData[lt1Index].power, lactate: sortedData[lt1Index].lactate, heartRate: sortedData[lt1Index].heartRate },
          lt2: { power: sortedData[iansIndex].power, lactate: sortedData[iansIndex].lactate, heartRate: sortedData[iansIndex].heartRate }
        }
      }
    },
    mader: {
      name: 'Mader',
      color: '#ef4444',
      description: 'Fixed 4 mmol/L threshold (classic approach)',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 3) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // LT1 at 2 mmol/L
        const lt1Point = sortedData.find(d => d.lactate >= 2.0) || sortedData[Math.floor(sortedData.length * 0.3)]
        
        // LT2 at 4 mmol/L (Mader threshold)
        const lt2Point = sortedData.find(d => d.lactate >= 4.0) || sortedData[Math.floor(sortedData.length * 0.7)]
        
        return {
          lt1: { power: lt1Point.power, lactate: lt1Point.lactate, heartRate: lt1Point.heartRate },
          lt2: { power: lt2Point.power, lactate: lt2Point.lactate, heartRate: lt2Point.heartRate }
        }
      }
    },
    stegmann: {
      name: 'Stegmann',
      color: '#8b5cf6',
      description: 'Individual threshold based on lactate kinetics',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Find steepest lactate increase
        let maxIncrease = 0
        let lt2Index = sortedData.length - 2
        
        for (let i = 1; i < sortedData.length - 1; i++) {
          const increase = (sortedData[i + 1].lactate - sortedData[i].lactate) / (sortedData[i + 1].power - sortedData[i].power)
          if (increase > maxIncrease) {
            maxIncrease = increase
            lt2Index = i
          }
        }
        
        const lt1Point = sortedData[Math.max(0, lt2Index - 2)]
        const lt2Point = sortedData[lt2Index]
        
        return {
          lt1: { power: lt1Point.power, lactate: lt1Point.lactate, heartRate: lt1Point.heartRate },
          lt2: { power: lt2Point.power, lactate: lt2Point.lactate, heartRate: lt2Point.heartRate }
        }
      }
    },
    fes: {
      name: 'FES',
      color: '#10b981',
      description: 'Federal Sports Science approach with deflection points',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // LT1: First significant rise (deflection point)
        let lt1Index = 1
        for (let i = 1; i < sortedData.length - 1; i++) {
          const slope = (sortedData[i].lactate - sortedData[i-1].lactate) / (sortedData[i].power - sortedData[i-1].power)
          if (slope > 0.03) { // Significant slope increase
            lt1Index = i
            break
          }
        }
        
        // LT2: Second deflection point or exponential rise
        let lt2Index = sortedData.length - 2
        for (let i = lt1Index + 1; i < sortedData.length - 1; i++) {
          const currentSlope = (sortedData[i].lactate - sortedData[i-1].lactate) / (sortedData[i].power - sortedData[i-1].power)
          const nextSlope = (sortedData[i+1].lactate - sortedData[i].lactate) / (sortedData[i+1].power - sortedData[i].power)
          if (nextSlope > currentSlope * 2) {
            lt2Index = i
            break
          }
        }
        
        return {
          lt1: { power: sortedData[lt1Index].power, lactate: sortedData[lt1Index].lactate, heartRate: sortedData[lt1Index].heartRate },
          lt2: { power: sortedData[lt2Index].power, lactate: sortedData[lt2Index].lactate, heartRate: sortedData[lt2Index].heartRate }
        }
      }
    },
    coggan: {
      name: 'Coggan',
      color: '#f59e0b',
      description: 'Power-based threshold at ~85% of LT2 power',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Find power at 4 mmol/L as reference
        const referencePoint = sortedData.find(d => d.lactate >= 4.0) || sortedData[Math.floor(sortedData.length * 0.75)]
        
        // LT1 at ~85% of reference power
        const lt1Power = referencePoint.power * 0.85
        const lt1Point = sortedData.reduce((prev, curr) => 
          Math.abs(curr.power - lt1Power) < Math.abs(prev.power - lt1Power) ? curr : prev
        )
        
        return {
          lt1: { power: lt1Point.power, lactate: lt1Point.lactate, heartRate: lt1Point.heartRate },
          lt2: { power: referencePoint.power, lactate: referencePoint.lactate, heartRate: referencePoint.heartRate }
        }
      }
    },
    seiler: {
      name: 'Seiler',
      color: '#06b6d4',
      description: 'Polarized training zones with ventilatory thresholds',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // VT1 around first lactate rise
        const lt1Point = sortedData.find(d => d.lactate >= 2.0) || sortedData[Math.floor(sortedData.length * 0.4)]
        
        // VT2 at lactate steady state breakpoint
        const lt2Point = sortedData.find(d => d.lactate >= 4.0) || sortedData[Math.floor(sortedData.length * 0.8)]
        
        return {
          lt1: { power: lt1Point.power, lactate: lt1Point.lactate, heartRate: lt1Point.heartRate },
          lt2: { power: lt2Point.power, lactate: lt2Point.lactate, heartRate: lt2Point.heartRate }
        }
      }
    },
    inscyd: {
      name: 'INSCYD',
      color: '#ec4899',
      description: 'Metabolic profiling with FATmax and lactate dynamics',
      calculate: (data: LactateWebhookData[]) => {
        if (data.length < 4) return null
        const sortedData = [...data].sort((a, b) => a.power - b.power)
        
        // Enhanced calculation considering fat oxidation
        let lt1Point = sortedData.find(d => d.lactate >= 2.0) || sortedData[Math.floor(sortedData.length * 0.35)]
        let lt2Point = sortedData.find(d => d.lactate >= 4.5) || sortedData[Math.floor(sortedData.length * 0.75)]
        
        // If fat oxidation data is available, refine thresholds
        if (data.some(d => d.fatOxidation)) {
          const fatMaxPoint = sortedData.reduce((max, current) => 
            (current.fatOxidation || 0) > (max.fatOxidation || 0) ? current : max
          )
          
          return {
            lt1: { power: lt1Point.power, lactate: lt1Point.lactate, heartRate: lt1Point.heartRate },
            lt2: { power: lt2Point.power, lactate: lt2Point.lactate, heartRate: lt2Point.heartRate },
            fatMax: {
              power: fatMaxPoint.power,
              fatOxidation: fatMaxPoint.fatOxidation!,
              heartRate: fatMaxPoint.heartRate
            }
          }
        }
        
        return {
          lt1: { power: lt1Point.power, lactate: lt1Point.lactate, heartRate: lt1Point.heartRate },
          lt2: { power: lt2Point.power, lactate: lt2Point.lactate, heartRate: lt2Point.heartRate }
        }
      }
    }
  }

  // Get thresholds for the active overlay method
  const getActiveThresholds = useCallback(() => {
    if (!webhookData.length || !activeOverlay) return thresholds
    return thresholdMethods[activeOverlay].calculate(webhookData)
  }, [webhookData, activeOverlay, thresholds])

  // Calculate default zone boundaries based on thresholds
  const getDefaultZoneBoundaries = useCallback((): ZoneBoundaries | null => {
    const displayThresholds = getActiveThresholds()
    if (!displayThresholds || webhookData.length === 0) return null
    
    const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
    const minPower = Math.min(...sortedData.map(d => d.power))
    const maxPower = Math.max(...sortedData.map(d => d.power))
    const powerRange = maxPower - minPower
    const extendedMaxPower = maxPower + powerRange * 0.1
    
    const lt1Power = displayThresholds.lt1.power
    const lt2Power = displayThresholds.lt2.power
    const rawVt1Power = lt1Power * 0.85
    const rawVt2Power = lt2Power * 1.05
    
    const z1End = Math.max(minPower + 30, Math.min(rawVt1Power, lt1Power - 20))
    const z2End = Math.max(z1End + 20, lt1Power)
    const z3End = Math.max(z2End + 20, lt2Power)
    const z4End = Math.max(z3End + 20, rawVt2Power)
    
    return { z1End, z2End, z3End, z4End }
  }, [webhookData, getActiveThresholds])

  // Define 5 seamless training zones based on lactate thresholds
  const getFiveTrainingZones = useCallback(() => {
    const displayThresholds = getActiveThresholds()
    if (!displayThresholds || webhookData.length === 0) return []
    
    const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
    const minPower = Math.min(...sortedData.map(d => d.power))
    const maxPower = Math.max(...sortedData.map(d => d.power))
    const powerRange = maxPower - minPower
    const extendedMaxPower = maxPower + powerRange * 0.1
    
    // Use custom boundaries if available, otherwise calculate defaults
    let z1End: number, z2End: number, z3End: number, z4End: number
    
    if (customZoneBoundaries) {
      z1End = customZoneBoundaries.z1End
      z2End = customZoneBoundaries.z2End
      z3End = customZoneBoundaries.z3End
      z4End = customZoneBoundaries.z4End
    } else {
      const defaults = getDefaultZoneBoundaries()
      if (!defaults) return []
      z1End = defaults.z1End
      z2End = defaults.z2End
      z3End = defaults.z3End
      z4End = defaults.z4End
    }
    
    const z1Start = minPower
    const z5End = Math.max(z4End + 20, extendedMaxPower)
    
    // Build zone boundaries
    const zoneBoundaries = [z1Start, z1End, z2End, z3End, z4End, z5End]
    
    // Debug log
    console.log('Zone calculation:', {
      customZoneBoundaries: !!customZoneBoundaries,
      z1: `${Math.round(z1Start)}-${Math.round(z1End)}`,
      z2: `${Math.round(z1End)}-${Math.round(z2End)}`,
      z3: `${Math.round(z2End)}-${Math.round(z3End)}`,
      z4: `${Math.round(z3End)}-${Math.round(z4End)}`,
      z5: `${Math.round(z4End)}-${Math.round(z5End)}`
    })
    
    const zones = [
      {
        id: 1,
        name: 'Zone 1 - Aktive Regeneration',
        color: 'rgba(144, 238, 144, 0.5)',      // Light green
        borderColor: 'rgba(34, 139, 34, 0.8)',
        range: [zoneBoundaries[0], zoneBoundaries[1]],
        lactateRange: '< 2.0 mmol/l',
        description: 'Regeneration & Fettstoffwechsel',
        intensity: '< 65% HFmax'
      },
      {
        id: 2,
        name: 'Zone 2 - Aerobe Basis',
        color: 'rgba(0, 200, 83, 0.4)',          // Green
        borderColor: 'rgba(0, 150, 60, 0.8)',
        range: [zoneBoundaries[1], zoneBoundaries[2]],
        lactateRange: '2.0-2.5 mmol/l',
        description: 'Grundlagenausdauer 1',
        intensity: '65-75% HFmax'
      },
      {
        id: 3,
        name: 'Zone 3 - Aerobe Schwelle',
        color: 'rgba(255, 235, 59, 0.4)',        // Yellow
        borderColor: 'rgba(245, 200, 0, 0.8)',
        range: [zoneBoundaries[2], zoneBoundaries[3]],
        lactateRange: '2.5-4.0 mmol/l',
        description: 'Grundlagenausdauer 2 / Tempo',
        intensity: '75-85% HFmax'
      },
      {
        id: 4,
        name: 'Zone 4 - Laktatschwelle',
        color: 'rgba(255, 152, 0, 0.4)',         // Orange
        borderColor: 'rgba(230, 120, 0, 0.8)',
        range: [zoneBoundaries[3], zoneBoundaries[4]],
        lactateRange: '4.0-8.0 mmol/l',
        description: 'Wettkampftempo / Schwellenbereich',
        intensity: '85-95% HFmax'
      },
      {
        id: 5,
        name: 'Zone 5 - Neuromuskuläre Leistung',
        color: 'rgba(244, 67, 54, 0.4)',         // Red
        borderColor: 'rgba(200, 40, 30, 0.8)',
        range: [zoneBoundaries[4], zoneBoundaries[5]],
        lactateRange: '> 8.0 mmol/l',
        description: 'Anaerobe Kapazität / VO2max',
        intensity: '> 95% HFmax'
      }
    ]

    // Debug: Log seamless zone boundaries
    console.log('Seamless Zone Boundaries:', {
      boundaries: zoneBoundaries.map(b => Math.round(b)),
      zones: zones.map(z => ({
        id: z.id,
        start: Math.round(z.range[0]),
        end: Math.round(z.range[1]),
        width: Math.round(z.range[1] - z.range[0])
      }))
    })

    return zones
  }, [webhookData, activeOverlay, getActiveThresholds, customZoneBoundaries, getDefaultZoneBoundaries])

  // Auto-save zone boundaries to database (silent, no alerts, debounced)
  const autoSaveZoneBoundaries = useCallback(async (boundariesToSave: ZoneBoundaries) => {
    if (!selectedCustomer || !sessionId) {
      console.log('Cannot auto-save: no customer or session selected')
      return
    }
    
    try {
      const response = await fetch('/api/training-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.customer_id,
          sessionId: sessionId,
          method: 'adjusted', // Mark as manually adjusted
          boundaries: boundariesToSave,
          zones: getFiveTrainingZones().map(z => ({
            zoneId: z.id,
            name: z.name,
            powerStart: z.range[0],
            powerEnd: z.range[1]
          }))
        })
      })
      
      if (response.ok) {
        console.log('✅ Zones auto-saved successfully')
        // Update the saved adjusted boundaries so "Adjusted" button appears
        setSavedAdjustedBoundaries(boundariesToSave)
        setHasSavedAdjustedZones(true)
      } else {
        console.error('Failed to auto-save zones')
      }
    } catch (error) {
      console.error('Error auto-saving zones:', error)
    }
  }, [selectedCustomer, sessionId, getFiveTrainingZones])

  // Handle zone boundary change - updates state and triggers debounced auto-save
  const handleZoneBoundaryChange = useCallback((boundaryKey: keyof ZoneBoundaries, newValue: number) => {
    const currentBoundaries = customZoneBoundaries || getDefaultZoneBoundaries()
    if (!currentBoundaries) return
    
    // Ensure boundaries stay in order
    let newBoundaries = { ...currentBoundaries, [boundaryKey]: newValue }
    
    // Validate and adjust to maintain order
    const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
    const minPower = Math.min(...sortedData.map(d => d.power))
    const maxPower = Math.max(...sortedData.map(d => d.power))
    
    // Ensure z1End > minPower + 10
    newBoundaries.z1End = Math.max(minPower + 10, newBoundaries.z1End)
    // Ensure z2End > z1End + 10
    newBoundaries.z2End = Math.max(newBoundaries.z1End + 10, newBoundaries.z2End)
    // Ensure z3End > z2End + 10
    newBoundaries.z3End = Math.max(newBoundaries.z2End + 10, newBoundaries.z3End)
    // Ensure z4End > z3End + 10 and < maxPower
    newBoundaries.z4End = Math.max(newBoundaries.z3End + 10, Math.min(maxPower, newBoundaries.z4End))
    
    setCustomZoneBoundaries(newBoundaries)
    
    // Debounced auto-save: clear previous timeout and set new one
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      autoSaveZoneBoundaries(newBoundaries)
    }, 300) // Save 300ms after last change
  }, [customZoneBoundaries, getDefaultZoneBoundaries, webhookData, autoSaveZoneBoundaries])

  // Apply saved adjusted zones
  const applyAdjustedZones = () => {
    if (savedAdjustedBoundaries) {
      setCustomZoneBoundaries(savedAdjustedBoundaries)
      setChartKey(prev => prev + 1)
    }
  }

  // Handle overlay selection
  const handleOverlaySelect = (method: OverlayType) => {
    setActiveOverlay(activeOverlay === method ? null : method)
    setCustomZoneBoundaries(null) // Reset custom boundaries when changing method
    setChartKey(prev => prev + 1) // Force chart re-render
  }

  // Convert pixel position to power value
  const pixelToPower = useCallback((clientX: number): number | null => {
    const chart = chartRef.current?.getEchartsInstance()
    if (!chart || !chartContainerRef.current) return null
    
    try {
      const chartDom = chart.getDom()
      const chartRect = chartDom.getBoundingClientRect()
      
      // Convert client coordinates to chart-local coordinates
      const localX = clientX - chartRect.left
      
      // Use ECharts convertFromPixel to get the data value
      // This properly handles the grid margins and axis scaling
      const dataPoint = chart.convertFromPixel({ seriesIndex: 0 }, [localX, 0])
      
      if (dataPoint && typeof dataPoint[0] === 'number') {
        console.log(`🔄 pixelToPower: clientX=${Math.round(clientX)}, localX=${Math.round(localX)}, power=${Math.round(dataPoint[0])}`)
        return dataPoint[0]
      }
      return null
    } catch (e) {
      console.error('pixelToPower error:', e)
      return null
    }
  }, [])

  // Find which boundary is near the mouse position - returns the CLOSEST boundary
  const findNearBoundary = useCallback((power: number): string | null => {
    const zones = getFiveTrainingZones()
    if (zones.length < 5) return null
    
    // Zone boundaries from the zones array
    // zones[0].range = [z1Start, z1End] - so zones[0].range[1] = z1End = Z1|Z2 boundary
    // zones[1].range = [z1End, z2End] - so zones[1].range[1] = z2End = Z2|Z3 boundary
    // etc.
    const z1End = zones[0].range[1]
    const z2End = zones[1].range[1]
    const z3End = zones[2].range[1]
    const z4End = zones[3].range[1]
    
    const boundaries: { key: string; value: number; label: string }[] = [
      { key: 'z1End', value: z1End, label: 'Z1|Z2' },
      { key: 'z2End', value: z2End, label: 'Z2|Z3' },
      { key: 'z3End', value: z3End, label: 'Z3|Z4' },
      { key: 'z4End', value: z4End, label: 'Z4|Z5' }
    ]
    
    // Debug: log all boundary positions
    console.log('📍 Boundary positions:', {
      'Z1|Z2 (z1End)': Math.round(z1End),
      'Z2|Z3 (z2End)': Math.round(z2End),
      'Z3|Z4 (z3End)': Math.round(z3End),
      'Z4|Z5 (z4End)': Math.round(z4End),
      mousePower: Math.round(power)
    })
    
    const threshold = 15 // Watt tolerance for detection
    
    // Find the closest boundary within threshold
    let closestBoundary: string | null = null
    let closestDistance = Infinity
    let closestLabel = ''
    
    for (const boundary of boundaries) {
      const distance = Math.abs(power - boundary.value)
      console.log(`  → ${boundary.label}: distance = ${Math.round(distance)}W (boundary at ${Math.round(boundary.value)}W)`)
      if (distance < threshold && distance < closestDistance) {
        closestDistance = distance
        closestBoundary = boundary.key
        closestLabel = boundary.label
      }
    }
    
    if (closestBoundary) {
      console.log(`✅ SELECTED: ${closestLabel} (${closestBoundary})`)
    }
    
    return closestBoundary
  }, [getFiveTrainingZones])

  // Native mouse event handlers for smooth dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const power = pixelToPower(e.clientX)
    if (power === null) return
    
    if (isDragging && dragBoundary) {
      // Smoothly update boundary while dragging
      handleZoneBoundaryChange(dragBoundary, Math.round(power))
    } else {
      // Update hover state
      const boundary = findNearBoundary(power)
      setHoverBoundary(boundary)
    }
  }, [isDragging, dragBoundary, pixelToPower, findNearBoundary, handleZoneBoundaryChange])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Left click only (button 0)
    if (e.button !== 0) return
    
    const power = pixelToPower(e.clientX)
    if (power === null) return
    
    const boundary = findNearBoundary(power)
    if (boundary) {
      console.log(`🖱️ CLICK: Starting drag of ${boundary} at ${Math.round(power)}W`)
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
      setDragBoundary(boundary)
    }
  }, [pixelToPower, findNearBoundary])

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setDragBoundary(null)
      // Auto-save is already triggered by debounced handleZoneBoundaryChange
    }
  }, [isDragging])

  // Attach native event listeners to chart container
  useEffect(() => {
    const container = chartContainerRef.current
    if (!container) return
    
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mouseleave', handleMouseUp)
    
    // Also listen on window for mouseup to handle drag outside container
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('mouseleave', handleMouseUp)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseDown, handleMouseUp])

  // Auto-calculate thresholds when data changes
  useEffect(() => {
    if (webhookData.length >= 4) {
      const calculatedThresholds = calculateThresholds(webhookData)
      setThresholds(calculatedThresholds)
    }
  }, [webhookData])

  // Calculate thresholds automatically when new data arrives (using DMAX as default)
  const calculateThresholds = useCallback((data: LactateWebhookData[]) => {
    if (data.length < 4) return null

    // Use DMAX method as default
    return thresholdMethods.dmax.calculate(data)
  }, [])

  const getLactateChartOption = () => {
    if (webhookData.length === 0) return {}

    const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
    const powers = sortedData.map(d => d.power)
    const lactates = sortedData.map(d => d.lactate)
    const fatOxidation = sortedData.map(d => d.fatOxidation || 0)

    const displayThresholds = getActiveThresholds()
    const methodName = activeOverlay ? thresholdMethods[activeOverlay].name : 'Standard'
    const methodColor = activeOverlay ? thresholdMethods[activeOverlay].color : '#6b7280'

    const trainingZones = getFiveTrainingZones()
    
    // Calculate x-axis min: 15W before Z1 (which starts at first data point)
    const minDataPower = Math.min(...powers)
    const xAxisMin = Math.max(0, minDataPower - 15)  // 15W before Z1/first data

    // Debug logging - check this in browser console when switching methods
    console.log('🔄 Chart Update:', {
      activeMethod: activeOverlay,
      minDataPower: minDataPower.toFixed(0),
      xAxisMin: xAxisMin.toFixed(0),
      lt1Power: displayThresholds?.lt1?.power?.toFixed(0),
      lt2Power: displayThresholds?.lt2?.power?.toFixed(0),
      zonesCount: trainingZones.length
    })

    return {
      animation: false,  // Disable animation for smoother zone dragging
      title: {
        text: `5-Zonen Laktat-Leistungskurve${activeOverlay ? ` (${methodName})` : ''}${isSimulating ? ' 🎭 SIMULATION' : ''}`,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: isSimulating ? '#ea580c' : methodColor
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const dataIndex = params[0].dataIndex
          const data = sortedData[dataIndex]
          return `
            <div>
              <strong>Leistung: ${data.power} W</strong><br/>
              Laktat: ${data.lactate} mmol/L<br/>
              ${data.heartRate ? `HF: ${data.heartRate} bpm<br/>` : ''}
              ${data.fatOxidation ? `Fettox: ${data.fatOxidation.toFixed(2)} g/min<br/>` : ''}
              Zeit: ${new Date(data.timestamp).toLocaleTimeString()}
            </div>
          `
        }
      },
      legend: {
        data: [
          { name: 'Laktat', itemStyle: { color: '#ef4444' } },
          { name: 'Fettoxidation', itemStyle: { color: '#22c55e' } },
          { name: 'Zone 1', itemStyle: { color: 'rgba(144, 238, 144, 0.8)' } },
          { name: 'Zone 2', itemStyle: { color: 'rgba(0, 200, 83, 0.8)' } },
          { name: 'Zone 3', itemStyle: { color: 'rgba(255, 235, 59, 0.8)' } },
          { name: 'Zone 4', itemStyle: { color: 'rgba(255, 152, 0, 0.8)' } },
          { name: 'Zone 5', itemStyle: { color: 'rgba(244, 67, 54, 0.8)' } }
        ],
        top: 'bottom'
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%'
      },
      xAxis: {
        type: 'value',
        name: 'Leistung (Watt)',
        min: xAxisMin,
        nameTextStyle: {
          color: '#374151',
          fontSize: 14,
          fontWeight: 'bold'
        },
        axisLabel: {
          color: '#6b7280'
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Laktat (mmol/L)',
          nameTextStyle: {
            color: '#374151',
            fontSize: 14,
            fontWeight: 'bold'
          },
          axisLabel: {
            color: '#6b7280'
          },
          splitLine: {
            lineStyle: {
              color: '#e5e7eb',
              opacity: 0.5
            }
          }
        },
        {
          type: 'value',
          name: 'Fettoxidation (g/min)',
          nameTextStyle: {
            color: '#374151',
            fontSize: 14,
            fontWeight: 'bold'
          },
          position: 'right',
          axisLabel: {
            color: '#6b7280'
          }
        }
      ],
      series: [
        // 5 Seamless Training Zone Areas
        ...trainingZones.map((zone: any, index: number) => ({
          name: `Zone ${zone.id}`,
          type: 'line',
          data: [],
          markArea: {
            silent: true,
            data: [[
              {
                xAxis: zone.range[0],
                itemStyle: {
                  color: zone.color,
                  borderColor: zone.borderColor,
                  borderWidth: 1,
                  opacity: 0.4
                }
              },
              { xAxis: zone.range[1] }
            ]],
            label: {
              show: true,
              position: 'insideTop',
              formatter: `Z${zone.id}`,
              fontSize: 11,
              fontWeight: 'bold',
              color: zone.borderColor.replace('0.6', '1.0'),
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: [2, 4],
              borderRadius: 3
            }
          },
          z: -10
        })),
        // Draggable Zone Boundary Lines
        {
          name: 'Zonengrenzen',
          type: 'line',
          data: [],
          markLine: {
            silent: true,  // Don't trigger chart events, we handle them ourselves
            animation: false,  // No animation for smoother updates
            symbol: ['none', 'none'],
            lineStyle: {
              color: '#1e40af',
              width: 4,
              type: 'solid'
            },
            label: {
              show: true,
              position: 'end',
              formatter: (params: any) => {
                const boundaryNames: Record<number, string> = {
                  0: 'Z1|Z2',
                  1: 'Z2|Z3',
                  2: 'Z3|Z4',
                  3: 'Z4|Z5'
                }
                return boundaryNames[params.dataIndex] || ''
              },
              fontSize: 10,
              fontWeight: 'bold',
              backgroundColor: '#1e40af',
              color: '#fff',
              padding: [2, 4],
              borderRadius: 2
            },
            data: [
              { xAxis: trainingZones[0]?.range[1], name: 'z1End' },
              { xAxis: trainingZones[1]?.range[1], name: 'z2End' },
              { xAxis: trainingZones[2]?.range[1], name: 'z3End' },
              { xAxis: trainingZones[3]?.range[1], name: 'z4End' }
            ].filter(d => d.xAxis !== undefined)
          },
          z: 20
        },
        {
          name: 'Laktat',
          type: 'line',
          smooth: true,
          data: powers.map((power, index) => [power, lactates[index]]), // Correct [x, y] format
          itemStyle: {
            color: '#ef4444'
          },
          lineStyle: {
            color: '#ef4444',
            width: 4
          },
          symbol: 'circle',
          symbolSize: 8,
          z: 10
        },
        ...(fatOxidation.some(val => val > 0) ? [{
          name: 'Fettoxidation',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: powers.map((power, index) => [power, fatOxidation[index]]), // Correct [x, y] format
          itemStyle: {
            color: '#10b981'
          },
          lineStyle: {
            color: '#10b981',
            width: 3,
            type: 'dashed'
          },
          symbol: 'circle',
          symbolSize: 6,
          z: 10
        }] : [])
      ],
      backgroundColor: 'transparent'
    }
  }

  // Fetch available sessions from database (filtered by selected customer)
  const fetchAvailableSessions = async () => {
    try {
      if (selectedCustomer) {
        // Fetch sessions for the selected customer
        const response = await fetch(`/api/customer-sessions?customerId=${selectedCustomer.customer_id}`)
        if (response.ok) {
          const sessions = await response.json()
          setAvailableSessions(sessions.map((session: any) => ({
            id: session.session_id,
            lastUpdated: session.last_updated,
            pointCount: session.point_count
          })))
        } else {
          setAvailableSessions([])
        }
      } else {
        // No customer selected, don't show any sessions
        setAvailableSessions([])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      setAvailableSessions([])
    }
  }

  // Load saved zones from database for a session
  const loadSavedZones = async (customerId: string, sessionIdToLoad: string) => {
    try {
      const response = await fetch(`/api/training-zones?customerId=${customerId}&sessionId=${sessionIdToLoad}`)
      if (response.ok) {
        const savedZones = await response.json()
        if (savedZones && savedZones.zone_boundaries) {
          // Parse the saved zone boundaries
          const zoneData = typeof savedZones.zone_boundaries === 'string' 
            ? JSON.parse(savedZones.zone_boundaries) 
            : savedZones.zone_boundaries
          
          if (zoneData.boundaries) {
            console.log('📂 Loaded saved zones for session:', sessionIdToLoad, zoneData.boundaries)
            
            // Store the saved adjusted boundaries - these are always available via "Adjusted" button
            setSavedAdjustedBoundaries(zoneData.boundaries)
            setHasSavedAdjustedZones(true)
            
            // Don't auto-apply - let user choose "Adjusted" button to apply
            // setCustomZoneBoundaries(zoneData.boundaries)
            
            // Restore the saved method if available
            if (savedZones.method && savedZones.method !== 'custom' && savedZones.method !== 'adjusted') {
              setActiveOverlay(savedZones.method as OverlayType)
            }
            return true
          }
        }
      }
      // No saved zones found
      setHasSavedAdjustedZones(false)
      setSavedAdjustedBoundaries(null)
      return false
    } catch (error) {
      console.error('Failed to load saved zones:', error)
      setHasSavedAdjustedZones(false)
      setSavedAdjustedBoundaries(null)
      return false
    }
  }

  // Switch to a different session
  const switchToSession = async (newSessionId: string) => {
    try {
      const response = await fetch(`/api/lactate-webhook?sessionId=${newSessionId}`)
      if (response.ok) {
        const result = await response.json()
        setSessionId(newSessionId)
        setWebhookData(result.data || [])
        setThresholds(null) // Reset thresholds for new session
        
        // Reset zone boundaries - will be recalculated or loaded from DB
        setCustomZoneBoundaries(null)
        setHasSavedAdjustedZones(false)
        setSavedAdjustedBoundaries(null)
        setChartKey(prev => prev + 1) // Force chart refresh
        
        // Try to load saved zones for this session
        if (selectedCustomer) {
          await loadSavedZones(selectedCustomer.customer_id, newSessionId)
        }
      }
    } catch (error) {
      console.error('Failed to switch session:', error)
    }
  }

  // Subscribe to global data service
  useEffect(() => {
    const state = lactateDataService.getState()
    setSessionId(state.sessionId)
    setIsReceivingData(state.isReceiving)
    setIsSimulating(state.isSimulating || false)
    
    // Subscribe to data changes
    const unsubscribe = lactateDataService.subscribe((data) => {
      setWebhookData(data)
      // Update simulation state
      const currentState = lactateDataService.getState()
      setIsSimulating(currentState.isSimulating || false)
    })
    
    // Fetch available sessions on mount
    fetchAvailableSessions()
    
    // Poll for new sessions every 10 seconds
    const sessionInterval = setInterval(fetchAvailableSessions, 10000)
    
    return () => {
      unsubscribe()
      clearInterval(sessionInterval)
    }
  }, [])

  // Refetch sessions when selected customer changes
  useEffect(() => {
    fetchAvailableSessions()
    // Reset zones when customer changes
    setCustomZoneBoundaries(null)
    setHasSavedAdjustedZones(false)
    setSavedAdjustedBoundaries(null)
  }, [selectedCustomer])

  // Load saved zones when session and customer are available
  useEffect(() => {
    if (selectedCustomer && sessionId && webhookData.length > 0) {
      loadSavedZones(selectedCustomer.customer_id, sessionId)
    }
  }, [selectedCustomer, sessionId, webhookData.length])

  const simulateData = () => {
    lactateDataService.simulateData()
  }

  const clearSimulation = () => {
    lactateDataService.clearSimulation()
    setThresholds(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Laktat-Performance-Kurve
          </h2>
          {selectedCustomer && (
            <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
              👤 {selectedCustomer.name} ({selectedCustomer.customer_id})
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={simulateData}
              disabled={isReceivingData}
              className="button-press px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-md"
            >
              🎭 Simulieren
            </button>
            {isSimulating && (
              <button
                onClick={clearSimulation}
                className="button-press px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md"
              >
                🗑️ Simulation Löschen
              </button>
            )}
          </div>
          
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {isSimulating ? (
              <span className="text-orange-600 dark:text-orange-400">
                🎭 Simulierte Datenpunkte: <span className="font-semibold">{webhookData.length}</span>
                <span className="ml-2 text-xs">(nicht in Datenbank gespeichert)</span>
              </span>
            ) : (
              <span>
                📊 Datenpunkte: <span className="font-semibold">{webhookData.length}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Customer Selection Hint */}
      {!selectedCustomer && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <span className="text-lg">ℹ️</span>
            <div>
              <p className="font-medium">Kein Kunde ausgewählt</p>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Gehen Sie zum "Lactate Input" Tab und wählen Sie einen Kunden aus, um nur deren Sessions anzuzeigen.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session Management */}
      {availableSessions.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              📋 Session {selectedCustomer ? `(${selectedCustomer.name})` : '(Alle Kunden)'}:
            </label>
            <select
              value={sessionId || ''}
              onChange={(e) => switchToSession(e.target.value)}
              title="Session auswählen"
              className="flex-1 min-w-[300px] px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Session auswählen --</option>
              {availableSessions.map((session, index) => (
                <option key={session.id} value={session.id}>
                  {session.id.startsWith('auto_') ? '🤖 Automatisch' : '👤 Manuell'} | {session.pointCount} Punkte | {new Date(session.lastUpdated).toLocaleString()}
                </option>
              ))}
            </select>
            <button
              onClick={fetchAvailableSessions}
              className="px-3 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md"
            >
              🔄 Aktualisieren
            </button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {availableSessions.length} Session{availableSessions.length !== 1 ? 's' : ''} verfügbar
            </span>
          </div>
        </div>
      )}

      {/* Scientific Method Overlay Buttons */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          Wissenschaftliche Schwellenmethoden
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {Object.entries(thresholdMethods).map(([key, method]) => (
            <button
              key={key}
              onClick={() => handleOverlaySelect(key as OverlayType)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 transform ${
                activeOverlay === key && !customZoneBoundaries
                  ? 'border-current shadow-xl scale-95 ring-2 ring-opacity-50 pressed'
                  : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 hover:scale-105 hover:shadow-md'
              } active:scale-90 active:shadow-inner`}
              style={{
                backgroundColor: activeOverlay === key && !customZoneBoundaries ? `${method.color}30` : 'transparent',
                borderColor: activeOverlay === key && !customZoneBoundaries ? method.color : undefined,
                color: activeOverlay === key && !customZoneBoundaries ? method.color : undefined,
                boxShadow: activeOverlay === key && !customZoneBoundaries ? `inset 0 2px 4px rgba(0,0,0,0.15), 0 0 0 2px ${method.color}40` : undefined
              }}
            >
              <div className="text-center">
                <div className="font-bold text-sm mb-1">{method.name}</div>
                <div className="text-xs opacity-80">{method.description.split(' ').slice(0, 3).join(' ')}</div>
              </div>
            </button>
          ))}
          
          {/* Adjusted Button - shows when saved adjusted zones exist OR when user has made manual changes */}
          {(hasSavedAdjustedZones || customZoneBoundaries !== null) && (
            <button
              onClick={applyAdjustedZones}
              disabled={!savedAdjustedBoundaries && !customZoneBoundaries}
              className={`p-3 rounded-lg border-2 transition-all duration-200 transform ${
                customZoneBoundaries !== null
                  ? 'border-purple-500 shadow-xl scale-95 ring-2 ring-purple-300 ring-opacity-50'
                  : 'border-zinc-300 dark:border-zinc-600 hover:border-purple-400 hover:scale-105 hover:shadow-md'
              } active:scale-90 active:shadow-inner`}
              style={{
                backgroundColor: customZoneBoundaries !== null ? 'rgba(147, 51, 234, 0.2)' : 'transparent',
                color: customZoneBoundaries !== null ? '#9333ea' : undefined
              }}
            >
              <div className="text-center">
                <div className="font-bold text-sm mb-1">✏️ Adjusted</div>
                <div className="text-xs opacity-80">Manuell angepasst</div>
              </div>
            </button>
          )}
        </div>
        
        {/* Info about current selection */}
        {customZoneBoundaries && (
          <div className="mt-3 text-sm text-purple-600 dark:text-purple-400 flex items-center gap-2">
            <span>✏️ Manuelle Anpassungen aktiv (automatisch gespeichert)</span>
          </div>
        )}
      </div>

      {/* Chart */}
      {webhookData.length > 0 && (
        <div 
          ref={chartContainerRef}
          className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6"
          style={{ cursor: hoverBoundary ? 'ew-resize' : 'default' }}
        >
          <div className="mb-2 text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
              💡 Klicken + Ziehen auf den blauen Linien verschiebt die Zonengrenzen
            </span>
            {hoverBoundary && !isDragging && (
              <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">
                ← {hoverBoundary === 'z1End' ? 'Z1|Z2' : hoverBoundary === 'z2End' ? 'Z2|Z3' : hoverBoundary === 'z3End' ? 'Z3|Z4' : 'Z4|Z5'} Grenze verschieben
              </span>
            )}
            {isDragging && dragBoundary && (
              <span className="text-green-600 dark:text-green-400 font-bold text-xs">
                ✓ {dragBoundary === 'z1End' ? 'Z1|Z2' : dragBoundary === 'z2End' ? 'Z2|Z3' : dragBoundary === 'z3End' ? 'Z3|Z4' : 'Z4|Z5'} wird verschoben
              </span>
            )}
          </div>
          <ReactEcharts
            key={`chart-${chartKey}`}
            ref={chartRef}
            option={getLactateChartOption()}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
            lazyUpdate={false}
            style={{ 
              height: '500px', 
              width: '100%'
            }}
            theme="light"
          />
        </div>
      )}

      {/* Zone Boundary Status */}
      {webhookData.length > 0 && (() => {
        const zones = getFiveTrainingZones()
        const defaults = getDefaultZoneBoundaries()
        const current = customZoneBoundaries || defaults
        if (!current || zones.length === 0) return null
        
        const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
        const minPower = Math.min(...sortedData.map(d => d.power))
        const maxPower = Math.max(...sortedData.map(d => d.power))
        
        return (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                🎯 Trainingszonen Übersicht
              </h3>
              {customZoneBoundaries && (
                <span className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  ✏️ Manuell angepasst
                  {!selectedCustomer && <span className="text-orange-500">(nicht gespeichert)</span>}
                </span>
              )}
            </div>
            
            {/* Visual zone bar */}
            <div className="mb-4">
              <div className="flex h-12 rounded-lg overflow-hidden border-2 border-zinc-300 dark:border-zinc-600 shadow-inner">
                {zones.map((zone, index) => {
                  const totalRange = maxPower - minPower + 50
                  const zoneWidth = ((zone.range[1] - zone.range[0]) / totalRange) * 100
                  return (
                    <div
                      key={zone.id}
                      className="flex flex-col items-center justify-center text-xs font-bold text-zinc-800 transition-all duration-200 border-r-2 border-white/50 last:border-r-0"
                      style={{ 
                        width: `${zoneWidth}%`, 
                        backgroundColor: zone.color,
                        minWidth: '50px'
                      }}
                    >
                      <span className="text-sm">Z{zone.id}</span>
                      <span className="text-[10px] opacity-75">{Math.round(zone.range[0])}-{Math.round(zone.range[1])}W</span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Zone boundary details in a grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Z1 | Z2</div>
                <div className="text-lg font-bold text-blue-800 dark:text-blue-200">{Math.round(current.z1End)} W</div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">Z2 | Z3 (LT1)</div>
                <div className="text-lg font-bold text-green-800 dark:text-green-200">{Math.round(current.z2End)} W</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Z3 | Z4 (LT2)</div>
                <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">{Math.round(current.z3End)} W</div>
              </div>
              <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Z4 | Z5</div>
                <div className="text-lg font-bold text-orange-800 dark:text-orange-200">{Math.round(current.z4End)} W</div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between text-xs text-zinc-500">
              <span>{Math.round(minPower)} W</span>
              <span>{Math.round(maxPower)} W</span>
            </div>
          </div>
        )
      })()}

      {/* 5-Zone Training Legend */}
      {webhookData.length > 0 && (() => {
        const fiveZones = getFiveTrainingZones()
        const methodName = activeOverlay ? thresholdMethods[activeOverlay].name : 'Standard'

        return (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100 text-center">
              5-Zonen Trainingsmodell (Nahtlos) {activeOverlay ? `(${methodName})` : ''}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {fiveZones.map((zone: any, index: number) => (
                <div 
                  key={index}
                  className="relative p-4 rounded-lg border-2 transition-all hover:scale-105 hover:shadow-lg"
                  style={{ 
                    backgroundColor: zone.color,
                    borderColor: zone.borderColor
                  }}
                >
                  <div className="text-center">
                    <div className="font-bold text-lg text-zinc-800 dark:text-zinc-900 mb-1">
                      Zone {zone.id}
                    </div>
                    <div className="font-medium text-sm text-zinc-700 dark:text-zinc-800 mb-2">
                      {zone.name.split(' - ')[1]}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-700 mb-2">
                      {zone.description}
                    </div>
                    
                    {/* Power Range */}
                    <div className="mb-2">
                      <div className="inline-block px-3 py-1 bg-white dark:bg-zinc-100 rounded-full mb-1">
                        <span className="text-xs font-mono font-bold text-zinc-800">
                          {Math.round(zone.range[0])} - {Math.round(zone.range[1])} W
                        </span>
                      </div>
                    </div>
                    
                    {/* Lactate Range */}
                    <div className="mb-2">
                      <div className="inline-block px-2 py-1 bg-red-100 dark:bg-red-200 rounded-full">
                        <span className="text-xs font-semibold text-red-800">
                          {zone.lactateRange}
                        </span>
                      </div>
                    </div>
                    
                    {/* Heart Rate */}
                    <div className="text-xs text-zinc-600 dark:text-zinc-700">
                      {zone.intensity}
                    </div>
                  </div>
                  
                  {/* Zone number badge */}
                  <div 
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                    style={{ backgroundColor: zone.borderColor.replace('0.6', '1.0') }}
                  >
                    {zone.id}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Scientific explanation */}
            <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <h4 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Nahtlose Zonen-Grenzen:
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Die 5 Zonen grenzen perfekt aneinander an - ohne Lücken oder Überschneidungen. 
                Jede Zone repräsentiert einen spezifischen Trainingsbereich mit unterschiedlichen physiologischen Eigenschaften.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-500 dark:text-zinc-500">
                <div><strong>Zone 1-2:</strong> Fettstoffwechsel dominiert, aerobe Kapazität</div>
                <div><strong>Zone 3:</strong> Übergangsbereich, erste Laktatakkumulation</div>
                <div><strong>Zone 4:</strong> Laktatschwelle, maximaler Steady State</div>
                <div><strong>Zone 5:</strong> Anaerobe Glykolyse, VO₂max Bereich</div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default LactatePerformanceCurve