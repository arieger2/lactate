'use client'

import { useState, useEffect, useCallback } from 'react'
import ReactEcharts from 'echarts-for-react'
import { lactateDataService } from '@/lib/lactateDataService'

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

type OverlayType = 'dmax' | 'lt2ians' | 'mader' | 'stegmann' | 'fes' | 'coggan' | 'seiler' | 'inscyd'

const LactatePerformanceCurve = () => {
  const [webhookData, setWebhookData] = useState<LactateWebhookData[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [availableSessions, setAvailableSessions] = useState<{id: string, lastUpdated: string, pointCount: number}[]>([])
  const [isReceivingData, setIsReceivingData] = useState(false)
  const [thresholds, setThresholds] = useState<ThresholdData | null>(null)
  const [activeOverlay, setActiveOverlay] = useState<OverlayType | null>('dmax')

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

  // Define 5 seamless training zones based on lactate thresholds
  const getFiveTrainingZones = useCallback(() => {
    const displayThresholds = getActiveThresholds()
    if (!displayThresholds || webhookData.length === 0) return []
    
    const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
    const minPower = Math.min(...sortedData.map(d => d.power))
    const maxPower = Math.max(...sortedData.map(d => d.power))
    const powerRange = maxPower - minPower
    const extendedMaxPower = maxPower + powerRange * 0.1
    
    // Calculate seamless zone boundaries
    const lt1Power = displayThresholds.lt1.power
    const lt2Power = displayThresholds.lt2.power
    const vt1Power = lt1Power * 0.85
    const vt2Power = lt2Power * 1.05
    
    // Ensure seamless boundaries (no gaps)
    const zoneBoundaries = [
      minPower,
      vt1Power,
      lt1Power,
      lt2Power,
      vt2Power,
      extendedMaxPower
    ]
    
    const zones = [
      {
        id: 1,
        name: 'Zone 1 - Aktive Regeneration',
        color: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 0.6)',
        range: [zoneBoundaries[0], zoneBoundaries[1]],
        lactateRange: '< 2.0 mmol/l',
        description: 'Regeneration & Fettstoffwechsel',
        intensity: '< 65% HFmax'
      },
      {
        id: 2,
        name: 'Zone 2 - Aerobe Basis',
        color: 'rgba(34, 197, 94, 0.15)',
        borderColor: 'rgba(34, 197, 94, 0.5)',
        range: [zoneBoundaries[1], zoneBoundaries[2]],
        lactateRange: '2.0-2.5 mmol/l',
        description: 'Grundlagenausdauer 1',
        intensity: '65-75% HFmax'
      },
      {
        id: 3,
        name: 'Zone 3 - Aerobe Schwelle',
        color: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 0.6)',
        range: [zoneBoundaries[2], zoneBoundaries[3]],
        lactateRange: '2.5-4.0 mmol/l',
        description: 'Grundlagenausdauer 2 / Tempo',
        intensity: '75-85% HFmax'
      },
      {
        id: 4,
        name: 'Zone 4 - Laktatschwelle',
        color: 'rgba(245, 158, 11, 0.2)',
        borderColor: 'rgba(245, 158, 11, 0.6)',
        range: [zoneBoundaries[3], zoneBoundaries[4]],
        lactateRange: '4.0-8.0 mmol/l',
        description: 'Wettkampftempo / Schwellenbereich',
        intensity: '85-95% HFmax'
      },
      {
        id: 5,
        name: 'Zone 5 - Neuromuskuläre Leistung',
        color: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 0.6)',
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
      })),
      gaps: zones.slice(1).map((zone, i) => ({
        between: `Zone ${i+1} and ${zone.id}`,
        gap: zones[i].range[1] - zone.range[0]
      }))
    })

    return zones
  }, [webhookData, activeOverlay, getActiveThresholds])

  // Handle overlay selection
  const handleOverlaySelect = (method: OverlayType) => {
    setActiveOverlay(activeOverlay === method ? null : method)
  }

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

    // Debug logging
    console.log('Chart Debug:', {
      dataLength: webhookData.length,
      powers,
      lactates,
      zonesCount: trainingZones.length,
      hasThresholds: !!displayThresholds
    })

    return {
      title: {
        text: `5-Zonen Laktat-Leistungskurve${activeOverlay ? ` (${methodName})` : ''}`,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: methodColor
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
        data: ['Laktat', 'Fettoxidation', ...trainingZones.map(z => `Zone ${z.id}`)],
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

  // Fetch available sessions from database
  const fetchAvailableSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const sessions = await response.json()
        setAvailableSessions(sessions)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
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
    
    // Subscribe to data changes
    const unsubscribe = lactateDataService.subscribe((data) => {
      setWebhookData(data)
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

  const startReceiving = () => {
    lactateDataService.startReceiving()
    setIsReceivingData(true)
  }

  const stopReceiving = () => {
    lactateDataService.stopReceiving()
    setIsReceivingData(false)
  }

  const simulateData = () => {
    lactateDataService.simulateData()
  }

  const clearData = async () => {
    await lactateDataService.clearData()
    setThresholds(null)
  }

  return (
    <div className="space-y-6">
      {/* Webhook Controls */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          Laktat-Performance-Kurve (Live Daten)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Webhook URL:
            </label>
            <input
              type="text"
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/lactate-webhook?sessionId=${sessionId}`}
              readOnly
              className="w-full p-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-zinc-50 dark:bg-zinc-800 text-sm"
            />
          </div>
          
          <div className="flex items-end gap-2">
            <button
              onClick={startReceiving}
              disabled={isReceivingData}
              className="button-press px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md"
            >
              {isReceivingData ? 'Empfängt...' : 'Start Empfang'}
            </button>
            <button
              onClick={stopReceiving}
              disabled={!isReceivingData}
              className="button-press px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-md"
            >
              Stop
            </button>
            <button
              onClick={simulateData}
              disabled={isReceivingData}
              className="button-press px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-md"
            >
              Simulieren
            </button>
            <button
              onClick={clearData}
              className="button-press px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-md"
            >
              Löschen
            </button>
          </div>
        </div>
        
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Empfangene Datenpunkte: <span className="font-semibold">{webhookData.length}</span>
          {isReceivingData && <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
        </p>
      </div>

      {/* Session Management */}
      {availableSessions.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Verfügbare Sessions
          </h3>
          <div className="space-y-2">
            {availableSessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  sessionId === session.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400'
                }`}
                onClick={() => switchToSession(session.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">
                      {session.id.startsWith('auto_') ? '🤖 Automatische Session' : '👤 Manuelle Session'}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Session ID: {session.id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {session.pointCount} Datenpunkte
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(session.lastUpdated).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={fetchAvailableSessions}
            className="mt-3 px-3 py-1 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md"
          >
            🔄 Sessions aktualisieren
          </button>
        </div>
      )}

      {/* Scientific Method Overlay Buttons */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          Wissenschaftliche Schwellenmethoden
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Object.entries(thresholdMethods).map(([key, method]) => (
            <button
              key={key}
              onClick={() => handleOverlaySelect(key as OverlayType)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 transform ${
                activeOverlay === key
                  ? 'border-current shadow-xl scale-95 ring-2 ring-opacity-50 pressed'
                  : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 hover:scale-105 hover:shadow-md'
              } active:scale-90 active:shadow-inner`}
              style={{
                backgroundColor: activeOverlay === key ? `${method.color}30` : 'transparent',
                borderColor: activeOverlay === key ? method.color : undefined,
                color: activeOverlay === key ? method.color : undefined,
                boxShadow: activeOverlay === key ? `inset 0 2px 4px rgba(0,0,0,0.15), 0 0 0 2px ${method.color}40` : undefined
              }}
            >
              <div className="text-center">
                <div className="font-bold text-sm mb-1">{method.name}</div>
                <div className="text-xs opacity-80">{method.description.split(' ').slice(0, 3).join(' ')}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {webhookData.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <ReactEcharts
            option={getLactateChartOption()}
            style={{ height: '500px', width: '100%' }}
            theme="light"
          />
        </div>
      )}

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