'use client'

import { useState, useEffect, useCallback } from 'react'
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
    
    // Calculate zone boundaries based on thresholds
    const lt1Power = displayThresholds.lt1.power
    const lt2Power = displayThresholds.lt2.power
    
    // Zone boundaries:
    // Z1: First data point to some point before LT1
    // Z2: End of Z1 to LT1  
    // Z3: LT1 to LT2
    // Z4: LT2 to end of Z4
    // Z5: End of Z4 to max
    
    // Calculate raw boundaries
    const rawVt1Power = lt1Power * 0.85
    const rawVt2Power = lt2Power * 1.05
    
    // Ensure all zones have proper boundaries
    // Z1 starts at first data point, ends before LT1
    // Key: ensure each zone has at least some width
    
    const z1Start = minPower
    // Z1 ends at 85% of LT1 OR minPower + 30W (whichever is larger, ensuring Z1 has width)
    const z1End = Math.max(minPower + 30, Math.min(rawVt1Power, lt1Power - 20))
    // Z2 ends at LT1
    const z2End = Math.max(z1End + 20, lt1Power)
    // Z3 ends at LT2
    const z3End = Math.max(z2End + 20, lt2Power)
    // Z4 ends at 105% of LT2
    const z4End = Math.max(z3End + 20, rawVt2Power)
    // Z5 ends at extended max
    const z5End = Math.max(z4End + 20, extendedMaxPower)
    
    // Build zone boundaries
    const zoneBoundaries = [z1Start, z1End, z2End, z3End, z4End, z5End]
    
    // Debug log
    console.log('Zone calculation:', {
      minPower, lt1Power, lt2Power, rawVt1Power,
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
      lt1Power: Math.round(lt1Power),
      lt2Power: Math.round(lt2Power),
      rawVt1Power: Math.round(rawVt1Power),
      boundaries: zoneBoundaries.map(b => Math.round(b)),
      zones: zones.map(z => ({
        id: z.id,
        start: Math.round(z.range[0]),
        end: Math.round(z.range[1]),
        width: Math.round(z.range[1] - z.range[0])
      }))
    })

    return zones
  }, [webhookData, activeOverlay, getActiveThresholds])

  // Handle overlay selection
  const handleOverlaySelect = (method: OverlayType) => {
    setActiveOverlay(activeOverlay === method ? null : method)
    setChartKey(prev => prev + 1) // Force chart re-render
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
    
    // Calculate x-axis min: 50W before Z1 (which starts at first data point)
    const minDataPower = Math.min(...powers)
    const xAxisMin = Math.max(0, minDataPower - 50)  // 50W before Z1/first data

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
  }, [selectedCustomer])

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
            key={`chart-${chartKey}`}
            option={getLactateChartOption()}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
            lazyUpdate={false}
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