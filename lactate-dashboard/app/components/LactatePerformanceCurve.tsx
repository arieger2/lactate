'use client'

import { useState, useEffect, useRef } from 'react'
import { useCustomer } from '@/lib/CustomerContext'
import * as echarts from 'echarts'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// ===== WISSENSCHAFTLICHE SCHWELLENMETHODEN =====
// Exakt nach Requirements-Dokument implementiert

interface LactateDataPoint {
  power: number
  lactate: number
  heartRate?: number
  vo2?: number
  timestamp: string
}

interface ThresholdPoint {
  power: number
  lactate: number
}

interface TrainingZone {
  id: number
  name: string
  range: [number, number]
  color: string
  borderColor: string
  description: string
}

type ThresholdMethod = 'mader' | 'dmax' | 'dickhuth' | 'loglog' | 'plus1mmol' | 'moddmax' | 'seiler' | 'fatmax' | 'adjusted'

export default function LactatePerformanceCurve() {
  const { selectedCustomer, selectedSessionId, setSelectedSessionId } = useCustomer()
  const [availableSessions, setAvailableSessions] = useState<any[]>([])
  const [webhookData, setWebhookData] = useState<LactateDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [lt1, setLt1] = useState<ThresholdPoint | null>(null)
  const [lt2, setLt2] = useState<ThresholdPoint | null>(null)
  const [trainingZones, setTrainingZones] = useState<TrainingZone[]>([])
  const [selectedMethod, setSelectedMethod] = useState<ThresholdMethod>('dmax')
  const [isDragging, setIsDragging] = useState<{ type: 'LT1' | 'LT2' | null }>({ type: null })
  const [isAdjusted, setIsAdjusted] = useState(false)
  const [isManuallyLoading, setIsManuallyLoading] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const currentLt1Ref = useRef<ThresholdPoint | null>(null)
  const currentLt2Ref = useRef<ThresholdPoint | null>(null)
  const lastMouseMoveTime = useRef<number>(0)
  const smoothingBuffer = useRef<{power: number, lactate: number}[]>([])

  // Update refs when values change
  useEffect(() => {
    currentLt1Ref.current = lt1
    currentLt2Ref.current = lt2
  }, [lt1, lt2])



  // Load sessions when customer changes
  useEffect(() => {
    if (!selectedCustomer) {
      setAvailableSessions([])
      return
    }

    const loadSessions = async () => {
      try {
        const response = await fetch(`/api/customer-sessions?customerId=${selectedCustomer.customer_id}`)
        if (response.ok) {
          const data = await response.json()
          const sessionData = data.success ? data.sessions : data
          setAvailableSessions(sessionData || [])
          if (sessionData?.length > 0 && !selectedSessionId) {
            setSelectedSessionId(sessionData[0].id)
          }
        }
      } catch (error) {
        console.error('Error loading sessions:', error)
      }
    }

    loadSessions()
  }, [selectedCustomer, selectedSessionId, setSelectedSessionId])

  // Load lactate data when session changes
  useEffect(() => {
    if (!selectedSessionId) {
      setWebhookData([])
      return
    }

    const loadData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/lactate-webhook?sessionId=${selectedSessionId}`)
        if (response.ok) {
          const result = await response.json()
          const data = Array.isArray(result) ? result : (result.data || [])
          
          // Fallback: wenn keine Daten vorhanden sind, erstelle Test-Daten
          if (data.length === 0) {
            const testData = [
              { power: 100, lactate: 1.2, heartRate: 130, timestamp: new Date().toISOString() },
              { power: 150, lactate: 1.8, heartRate: 145, timestamp: new Date().toISOString() },
              { power: 200, lactate: 2.5, heartRate: 160, timestamp: new Date().toISOString() },
              { power: 250, lactate: 3.2, heartRate: 175, timestamp: new Date().toISOString() },
              { power: 300, lactate: 4.8, heartRate: 185, timestamp: new Date().toISOString() },
              { power: 350, lactate: 7.2, heartRate: 195, timestamp: new Date().toISOString() }
            ]
            setWebhookData(testData)
            calculateThresholds(testData)
          } else {
            setWebhookData(data)
            calculateThresholds(data)
          }
        } else {
          console.error('❌ API response not ok:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('❌ Error fetching lactate data:', error)
        setWebhookData([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedSessionId])

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
            calculateThresholds(webhookData, 'dmax')
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
  }, [selectedMethod])

  // ===== CHART INITIALIZATION =====
  useEffect(() => {
    if (chartRef.current && webhookData.length > 0 && trainingZones.length > 0) {
      // Initialize chart if not exists
      if (!chartInstanceRef.current) {
        chartInstanceRef.current = echarts.init(chartRef.current)
      }

      // Chart options
      const options = {
        title: {
          text: 'Laktat-Leistungskurve',
          left: 'center',
          textStyle: { 
            fontSize: 16, 
            fontWeight: 'bold',
            overflow: 'truncate'
          }
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            let tooltip = `Leistung: ${params[0].value[0]} W<br/>`
            params.forEach((param: any) => {
              if (param.seriesName === 'Laktat') {
                tooltip += `${param.seriesName}: ${param.value[1].toFixed(2)} mmol/L<br/>`
              } else if (param.seriesName === 'Herzfrequenz') {
                tooltip += `${param.seriesName}: ${param.value[1]} bpm<br/>`
              }
            })
            return tooltip
          }
        },
        legend: {
          top: 30,
          data: ['Laktat', 'Herzfrequenz', 'LT1', 'LT2']
        },
        xAxis: {
          type: 'value',
          name: 'Leistung (W)',
          nameLocation: 'middle',
          nameGap: 30
        },
        yAxis: [
          {
            type: 'value',
            name: 'Laktat (mmol/L)',
            nameLocation: 'middle',
            nameGap: 40,
            min: 0,
            max: 12
          },
          {
            type: 'value',
            name: 'Herzfrequenz (bpm)',
            nameLocation: 'middle',
            nameGap: 40,
            position: 'right'
          }
        ],
        grid: {
          left: 80,
          right: 80,
          top: 80,
          bottom: 80
        },
        series: [
          // Lactate curve mit Trainingszonen als Hintergrundbereiche
          {
            name: 'Laktat',
            type: 'line',
            data: webhookData.map(d => [d.power, d.lactate]),
            smooth: true,
            lineStyle: {
              color: '#ef4444',
              width: 3
            },
            itemStyle: {
              color: '#ef4444'
            },
            yAxisIndex: 0,
            markArea: {
              silent: true,
              label: {
                show: true,
                position: 'insideTop',
                fontSize: 11,
                color: '#333',
                fontWeight: 'bold',
                overflow: 'truncate',
                width: 120
              },
              data: trainingZones.map(zone => [{
                name: zone.name.length > 15 ? zone.name.substring(0, 15) + '...' : zone.name,
                xAxis: zone.range[0],
                itemStyle: {
                  color: zone.color,
                  borderColor: zone.borderColor,
                  borderWidth: 1
                }
              }, {
                xAxis: zone.range[1]
              }])
            }
          },
          // Heart rate curve (if available)
          ...(webhookData.some(d => d.heartRate) ? [{
            name: 'Herzfrequenz',
            type: 'line',
            data: webhookData.filter(d => d.heartRate).map(d => [d.power, d.heartRate]),
            smooth: true,
            lineStyle: {
              color: '#3b82f6',
              width: 2
            },
            itemStyle: {
              color: '#3b82f6'
            },
            yAxisIndex: 1
          }] : []),
          // LT1 marker (verschiebbar)
          ...(lt1 ? [{
            name: 'LT1',
            type: 'scatter',
            data: [[lt1.power, lt1.lactate]],
            symbolSize: 22,
            itemStyle: {
              color: '#10b981',
              borderColor: '#fff',
              borderWidth: 3
            },
            yAxisIndex: 0,
            label: {
              show: true,
              position: 'top',
              formatter: 'LT1',
              fontSize: 12,
              fontWeight: 'bold',
              color: '#10b981',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: [2, 4],
              borderRadius: 3
            },
            emphasis: {
              scale: true,
              scaleSize: 28
            },
            markLine: {
              data: [{
                xAxis: lt1.power,
                lineStyle: { color: '#10b981', type: 'dashed', width: 3 },
                label: {
                  show: true,
                  position: 'insideEndTop',
                  formatter: 'LT1\n{c}W',
                  fontSize: 11,
                  fontWeight: 'bold',
                  color: '#10b981',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  padding: [2, 4],
                  borderRadius: 3
                }
              }]
            }
          }] : []),
          // LT2 marker (verschiebbar)
          ...(lt2 ? [{
            name: 'LT2',
            type: 'scatter',
            data: [[lt2.power, lt2.lactate]],
            symbolSize: 22,
            itemStyle: {
              color: '#f59e0b',
              borderColor: '#fff',
              borderWidth: 3
            },
            yAxisIndex: 0,
            label: {
              show: true,
              position: 'top',
              formatter: 'LT2',
              fontSize: 12,
              fontWeight: 'bold',
              color: '#f59e0b',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: [2, 4],
              borderRadius: 3
            },
            emphasis: {
              scale: true,
              scaleSize: 28
            },
            markLine: {
              data: [{
                xAxis: lt2.power,
                lineStyle: { color: '#f59e0b', type: 'dashed', width: 3 },
                label: {
                  show: true,
                  position: 'insideEndTop',
                  formatter: 'LT2\n{c}W',
                  fontSize: 11,
                  fontWeight: 'bold',
                  color: '#f59e0b',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  padding: [2, 4],
                  borderRadius: 3
                }
              }]
            }
          }] : [])
        ]
      }

      chartInstanceRef.current.setOption(options, true)
    }
  }, [webhookData, lt1, lt2, trainingZones])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      chartInstanceRef.current?.resize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
        chartInstanceRef.current = null
      }
    }
  }, [])

  // ===== SCHWELLENMETHODEN =====
  const calculateThresholds = (data: LactateDataPoint[], method: ThresholdMethod = selectedMethod) => {
    if (data.length === 0) {
      setLt1(null)
      setLt2(null)
      setTrainingZones([])
      return
    }

    const sortedData = [...data].sort((a, b) => a.power - b.power)
    let lt1Point: ThresholdPoint | null = null
    let lt2Point: ThresholdPoint | null = null

    switch (method) {
      case 'mader':
        // Mader 4mmol/L Methode (OBLA) - Mader (1976)
        const baseline = Math.min(...sortedData.map(d => d.lactate))
        lt1Point = interpolateThreshold(sortedData, baseline + 0.3)
        lt2Point = interpolateThreshold(sortedData, 4.0)
        break

      case 'dmax':
        // DMAX - Cheng et al.
        lt2Point = calculateDMax(sortedData)
        lt1Point = calculateLT1FromLT2(sortedData, lt2Point, 'dmax')
        break

      case 'dickhuth':
        // Dickhuth et al. - Minimum + 1.5 mmol/L
        const minLactate = Math.min(...sortedData.map(d => d.lactate))
        lt1Point = interpolateThreshold(sortedData, minLactate + 1.5)
        lt2Point = interpolateThreshold(sortedData, minLactate + 2.5)
        break

      case 'loglog':
        // Log-Log Methode - Beaver et al.
        lt2Point = calculateLogLog(sortedData)
        lt1Point = calculateLT1FromLT2(sortedData, lt2Point, 'loglog')
        break

      case 'plus1mmol':
        // +1.0 mmol/L - Faude et al.
        const baseLactate = Math.min(...sortedData.map(d => d.lactate))
        lt1Point = interpolateThreshold(sortedData, baseLactate + 1.0)
        lt2Point = interpolateThreshold(sortedData, baseLactate + 4.0)
        break

      case 'moddmax':
        // ModDMAX - Bishop et al.
        lt2Point = calculateModDMax(sortedData)
        lt1Point = calculateLT1FromLT2(sortedData, lt2Point, 'moddmax')
        break

      case 'seiler':
        // Seiler 3-Zone Model - Seiler-Polarisiertes Training
        lt1Point = calculateSeilerLT1(sortedData)
        lt2Point = calculateSeilerLT2(sortedData)
        break

      case 'fatmax':
        // FatMax/LT - San-Millán - FatMax
        lt1Point = calculateFatMax(sortedData)
        lt2Point = interpolateThreshold(sortedData, 4.0)
        break

      case 'adjusted':
        // Manuelle Anpassung - verwende bereits gesetzte LT1/LT2 Werte
        // Diese werden durch loadAdjustedThresholds() oder Drag&Drop gesetzt
        return // Früher Return, da LT1/LT2 bereits gesetzt sind
    }

    setLt1(lt1Point)
    setLt2(lt2Point)

    // Speichere die berechneten Werte automatisch in der Datenbank
    if (lt1Point && lt2Point && selectedSessionId && selectedCustomer) {
      setTimeout(() => {
        saveAdjustedThresholds()
      }, 100) // Kurze Verzögerung damit State gesetzt wird
    }

    // Calculate 5-Zone Training System (method-specific)
    const maxPower = Math.max(...data.map(d => d.power))
    const zones = calculateTrainingZones(lt1Point, lt2Point, maxPower, method)
    setTrainingZones(zones)
  }

  // Hilfsfunktionen für Schwellenberechnung
  const interpolateThreshold = (data: LactateDataPoint[], targetLactate: number): ThresholdPoint | null => {
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i].lactate <= targetLactate && data[i + 1].lactate >= targetLactate) {
        const ratio = (targetLactate - data[i].lactate) / (data[i + 1].lactate - data[i].lactate)
        const power = data[i].power + ratio * (data[i + 1].power - data[i].power)
        return { power: Math.round(power * 100) / 100, lactate: targetLactate }
      }
    }
    return null
  }

  const calculateDMax = (data: LactateDataPoint[]): ThresholdPoint | null => {
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

  const calculateLogLog = (data: LactateDataPoint[]): ThresholdPoint | null => {
    if (data.length < 3) return null
    
    let maxSlope = 0
    let maxIndex = 0

    for (let i = 1; i < data.length - 1; i++) {
      if (data[i].lactate > 0 && data[i].power > 0) {
        const slope1 = Math.log(data[i].lactate) / Math.log(data[i].power)
        const slope2 = Math.log(data[i + 1].lactate) / Math.log(data[i + 1].power)
        const slopeChange = Math.abs(slope2 - slope1)
        
        if (slopeChange > maxSlope) {
          maxSlope = slopeChange
          maxIndex = i
        }
      }
    }

    return { power: data[maxIndex].power, lactate: data[maxIndex].lactate }
  }

  const getMethodDisplayName = (method: ThresholdMethod): string => {
    const methodNames = {
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

  const calculateModDMax = (data: LactateDataPoint[]): ThresholdPoint | null => {
    // ModDMAX: Modifizierte DMAX mit exponentieller Anpassung
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

  const calculateSeilerLT1 = (data: LactateDataPoint[]): ThresholdPoint | null => {
    // Seiler VT1: Erste deutliche Erhöhung über Baseline
    const baseline = Math.min(...data.map(d => d.lactate))
    return interpolateThreshold(data, baseline + 0.5)
  }

  const calculateSeilerLT2 = (data: LactateDataPoint[]): ThresholdPoint | null => {
    // Seiler VT2: Steiler Anstieg, oft um 2.5-3.0 mmol/L
    const baseline = Math.min(...data.map(d => d.lactate))
    return interpolateThreshold(data, baseline + 2.8)
  }

  const calculateFatMax = (data: LactateDataPoint[]): ThresholdPoint | null => {
    // FatMax approximiert bei niedriger Intensität, oft um baseline + 0.3
    const baseline = Math.min(...data.map(d => d.lactate))
    return interpolateThreshold(data, baseline + 0.3)
  }

  const calculateLT1FromLT2 = (data: LactateDataPoint[], lt2: ThresholdPoint | null, method: string): ThresholdPoint | null => {
    if (!lt2) return null
    
    switch (method) {
      case 'dmax':
      case 'moddmax':
        return interpolateThreshold(data, lt2.lactate * 0.6)
      case 'loglog':
        return interpolateThreshold(data, lt2.lactate * 0.65)
      default:
        return interpolateThreshold(data, 2.0)
    }
  }

  // ===== 5-ZONEN TRAININGSSYSTEM =====
  // Wissenschaftlich basierte Trainingszonen nach internationalen Standards
  // Verschiedene Methoden können unterschiedliche LT1/LT2 Positionen in Zonen haben
  const calculateTrainingZones = (lt1: ThresholdPoint | null, lt2: ThresholdPoint | null, maxPower: number, method: ThresholdMethod = 'mader'): TrainingZone[] => {
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
            range: [0, lt1Power],  // Bis LT1
            color: 'rgba(34, 197, 94, 0.2)',
            borderColor: 'rgba(34, 197, 94, 0.8)',
            description: 'Aerobe Zone (bis LT1 ~2mmol/L)'
          },
          {
            id: 2,
            name: 'Zone 2 - Schwelle',
            range: [lt1Power, lt2Power],  // LT1 bis LT2
            color: 'rgba(251, 191, 36, 0.2)',
            borderColor: 'rgba(251, 191, 36, 0.8)',
            description: 'Schwellenzone (LT1 bis LT2 ~4mmol/L)'
          },
          {
            id: 3,
            name: 'Zone 3 - Anaerob',
            range: [lt2Power, maxPower * 1.1],  // Ab LT2
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
            range: [0, lt1Power * 0.75],  // Unter LT1
            color: 'rgba(34, 197, 94, 0.2)',
            borderColor: 'rgba(34, 197, 94, 0.8)',
            description: 'Regenerationsbereich'
          },
          {
            id: 2,
            name: 'Zone 2 - Aerobe Basis',
            range: [lt1Power * 0.75, lt1Power],  // Bis LT1 (+1.5mmol)
            color: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 0.8)',
            description: 'Aerob bis LT1 (+1.5mmol/L)'
          },
          {
            id: 3,
            name: 'Zone 3 - Schwelle',
            range: [lt1Power, lt2Power],  // LT1 bis LT2 (kleinerer Bereich)
            color: 'rgba(251, 191, 36, 0.2)',
            borderColor: 'rgba(251, 191, 36, 0.8)',
            description: 'LT1 bis LT2 (+2.5mmol/L)'
          },
          {
            id: 4,
            name: 'Zone 4 - Anaerob',
            range: [lt2Power, lt2Power * 1.15],  // Nach LT2
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

      case 'adjusted':
        // Manuelle Anpassung - identische Logik wie Standard 5-Zonen
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
            range: [0, lt1Power * 0.68],  // Bis ~68% von LT1
            color: 'rgba(34, 197, 94, 0.2)',
            borderColor: 'rgba(34, 197, 94, 0.8)',
            description: 'Regeneration & Fettstoffwechsel'
          },
          {
            id: 2,
            name: 'Zone 2 - Aerobe Basis',
            range: [lt1Power * 0.68, lt1Power],  // Bis LT1 (Ende Zone 2)
            color: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 0.8)',
            description: 'Aerober Grundlagenbereich (bis LT1)'
          },
          {
            id: 3,
            name: 'Zone 3 - Schwelle',
            range: [lt1Power, lt2Power],  // LT1 bis LT2 (Ende Zone 3)
            color: 'rgba(251, 191, 36, 0.2)',
            borderColor: 'rgba(251, 191, 36, 0.8)',
            description: 'Tempobereich (LT1 bis LT2)'
          },
          {
            id: 4,
            name: 'Zone 4 - Anaerob',
            range: [lt2Power, lt2Power * 1.08],  // Knapp oberhalb LT2
            color: 'rgba(239, 68, 68, 0.2)',
            borderColor: 'rgba(239, 68, 68, 0.8)',
            description: 'Schwellenbereich (um LT2)'
          },
          {
            id: 5,
            name: 'Zone 5 - Power',
            range: [lt2Power * 1.08, maxPower * 1.1],  // Oberhalb LT2
            color: 'rgba(147, 51, 234, 0.2)',
            borderColor: 'rgba(147, 51, 234, 0.8)',
            description: 'Maximale anaerobe Leistung (>LT2)'
          }
        ]
    }
  }

  // ===== INTERAKTIVITÄT =====
  useEffect(() => {
    if (chartInstanceRef.current && webhookData.length > 0) {
      const chart = chartInstanceRef.current
      
      // Enable brush for dragging thresholds
      chart.on('mousedown', (params: any) => {
        if (params.seriesName === 'LT1' || params.seriesName === 'LT2') {
          setIsDragging({ type: params.seriesName as 'LT1' | 'LT2' })
          
          // Clear smoothing buffer for fresh tracking
          smoothingBuffer.current = []
          lastMouseMoveTime.current = 0
          
          // Switch to adjusted mode when manually dragging
          if (selectedMethod !== 'adjusted') {
            setSelectedMethod('adjusted')
            setIsAdjusted(true)
          }
        }
      })

      // Handle mouse move during drag
      const handleMouseMove = (event: MouseEvent) => {
        if (!isDragging.type || !chart) return
        
        // Throttle mouse moves for optimal smoothness (max 120fps for ultra-responsive feel)
        const now = Date.now()
        if (now - lastMouseMoveTime.current < 8) return // 8ms = ~120fps
        lastMouseMoveTime.current = now
        
        try {
          const dom = chart.getDom()
          if (!dom) return
          
          const rect = dom.getBoundingClientRect()
          const x = event.clientX - rect.left
          const y = event.clientY - rect.top
          
          // Validate coordinates
          if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
          
          // Convert pixel coordinates to data coordinates with higher precision
          const pointInPixel = [x, y]
          const pointInData = chart.convertFromPixel('grid', pointInPixel)
          
          if (!pointInData || !Array.isArray(pointInData) || pointInData.length < 2) return
          if (typeof pointInData[0] !== 'number' || typeof pointInData[1] !== 'number') return
          if (pointInData[0] < 0 || pointInData[1] < 0) return
          
          // Use ultra-high precision for smoother movement (0.05 steps for power, 0.01 for lactate)
          let power = Math.max(0, Math.round(pointInData[0] * 20) / 20) // 0.05 steps
          let lactate = Math.max(0, Math.round(pointInData[1] * 100) / 100) // 0.01 steps
          
          // Apply exponential smoothing for more responsive movement
          smoothingBuffer.current.push({ power, lactate })
          if (smoothingBuffer.current.length > 4) {
            smoothingBuffer.current.shift() // Keep last 4 points for better smoothing
          }
          
          // Calculate exponentially weighted moving average for smoother response
          if (smoothingBuffer.current.length >= 2) {
            let weightedPower = 0
            let weightedLactate = 0
            let totalWeight = 0
            
            // Apply exponential weights (newer values get higher weight)
            smoothingBuffer.current.forEach((point, index) => {
              const weight = Math.pow(1.5, index) // Exponential weighting
              weightedPower += point.power * weight
              weightedLactate += point.lactate * weight
              totalWeight += weight
            })
            
            power = Math.round((weightedPower / totalWeight) * 20) / 20 // Maintain 0.05 precision
            lactate = Math.round((weightedLactate / totalWeight) * 100) / 100 // Maintain 0.01 precision
          }
          
          // Validate ranges
          if (power > 1000 || lactate > 20) return // Reasonable limits
          
          // Update threshold
          if (isDragging.type === 'LT1') {
            setLt1({ power, lactate })
          } else if (isDragging.type === 'LT2') {
            setLt2({ power, lactate })
          }
          
          // Recalculate training zones using current refs
          if (webhookData.length > 0) {
            const maxPower = Math.max(...webhookData.map(d => d.power), 400)
            const currentLt1 = currentLt1Ref.current
            const currentLt2 = currentLt2Ref.current
            const newLt1 = isDragging.type === 'LT1' ? { power, lactate } : currentLt1
            const newLt2 = isDragging.type === 'LT2' ? { power, lactate } : currentLt2
            
            if (newLt1 && newLt2 && newLt1.power && newLt1.lactate && newLt2.power && newLt2.lactate) {
              const zones = calculateTrainingZones(newLt1, newLt2, maxPower, selectedMethod)
              if (zones) {
                setTrainingZones(zones)
              }
            }
          }
          
          // Mark as adjusted
          setIsAdjusted(true)
          
        } catch (error) {
          console.warn('⚠️ Error during drag conversion:', error)
        }
      }

      // Handle mouse up
      const handleMouseUp = async () => {
        if (!isDragging.type) return
        
        try {
          const dragType = isDragging.type
          setIsDragging({ type: null })
          
          // Nach manuellem Ziehen: Button aktivieren und in DB speichern
          setIsAdjusted(true)
          
          const currentLt1 = currentLt1Ref.current
          const currentLt2 = currentLt2Ref.current
          
          if (selectedSessionId && selectedCustomer && currentLt1 && currentLt2 && 
              currentLt1.power && currentLt1.lactate && currentLt2.power && currentLt2.lactate) {
            try {
              await saveAdjustedThresholds()
            } catch (saveError) {
              console.error('❌ Error saving adjusted thresholds:', saveError)
            }
          }
        } catch (error) {
          console.error('❌ Error in mouseUp handler:', error)
          setIsDragging({ type: null }) // Ensure we reset drag state
        }
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging.type, webhookData.length, selectedMethod]) // Remove lt1, lt2 to prevent infinite loop

  // ===== DATABASE LOAD =====


  // ===== DATABASE SAVE & LOAD =====
  const saveAdjustedThresholds = async () => {
    if (!selectedSessionId || !selectedCustomer || !lt1 || !lt2) {
      console.warn('⚠️ Cannot save: missing session, customer, or threshold data')
      return
    }
    
    // Additional null checks for threshold properties
    if (typeof lt1.power !== 'number' || typeof lt1.lactate !== 'number' || 
        typeof lt2.power !== 'number' || typeof lt2.lactate !== 'number') {
      console.warn('⚠️ Cannot save: invalid threshold values')
      return
    }
    
    try {
      const response = await fetch('/api/adjusted-thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          customerId: selectedCustomer.customer_id,
          lt1Power: lt1.power,
          lt1Lactate: lt1.lactate,
          lt2Power: lt2.power,
          lt2Lactate: lt2.lactate,
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
        console.error('❌ HTTP error saving adjusted thresholds:', response.status)
      }
    } catch (error) {
      console.error('❌ Error saving adjusted thresholds:', error)
    }
  }

  const loadAdjustedThresholds = async (): Promise<boolean> => {
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
  }

  // ===== PDF EXPORT =====
  const exportToPDF = async () => {
    if (!chartRef.current) return
    
    try {
      const canvas = await html2canvas(chartRef.current)
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const imgWidth = 280
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
      pdf.save(`lactate-analysis-${selectedCustomer?.name || 'unknown'}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    }
  }

  // ===== RENDER =====
  if (!selectedCustomer) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Kunde auswählen</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Bitte gehen Sie zum "Lactate Input" Tab und wählen Sie einen Kunden aus.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Laktat-Performance-Kurve</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Kunde: {selectedCustomer?.name || 'Unbekannt'} | Methode: {getMethodDisplayName(selectedMethod)}
            </p>
          </div>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            PDF Export
          </button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Session Selection */}
          <div>
            <label className="block text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">Session</label>
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full p-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              <option value="">Session auswählen...</option>
              {availableSessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.point_count} Punkte | {new Date(session.test_date).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Method Selection */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-4 text-zinc-700 dark:text-zinc-300">Wissenschaftliche Schwellenmethoden</label>
            <div className="grid grid-cols-4 gap-4 mb-5">
              {/* Erste Reihe */}
              <button
                onClick={() => {
                  setSelectedMethod('dmax')
                  calculateThresholds(webhookData, 'dmax')
                }}
                className={`p-3 text-xs rounded-lg border transition-all duration-200 ${
                  selectedMethod === 'dmax' 
                    ? 'text-gray-800 font-semibold' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  backgroundColor: selectedMethod === 'dmax' 
                    ? 'rgba(107, 114, 128, 0.25)' 
                    : 'rgba(107, 114, 128, 0.1)',
                  borderColor: selectedMethod === 'dmax' 
                    ? 'rgba(107, 114, 128, 0.4)' 
                    : 'rgba(107, 114, 128, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== 'dmax') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== 'dmax') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                  }
                }}
              >
                <div className="font-semibold">DMAX</div>
                <div className="text-xs opacity-80">Cheng et al.</div>
              </button>
              
              <button
                onClick={() => {
                  setSelectedMethod('dickhuth')
                  calculateThresholds(webhookData, 'dickhuth')
                }}
                className={`p-3 text-xs rounded-lg border transition-all duration-200 ${
                  selectedMethod === 'dickhuth' 
                    ? 'text-gray-800 font-semibold' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  backgroundColor: selectedMethod === 'dickhuth' 
                    ? 'rgba(107, 114, 128, 0.25)' 
                    : 'rgba(107, 114, 128, 0.1)',
                  borderColor: selectedMethod === 'dickhuth' 
                    ? 'rgba(107, 114, 128, 0.4)' 
                    : 'rgba(107, 114, 128, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== 'dickhuth') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== 'dickhuth') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                  }
                }}
              >
                <div className="font-semibold">Dickhuth</div>
                <div className="text-xs opacity-80">Dickhuth et al.</div>
              </button>
              
              <button
                onClick={() => {
                  setSelectedMethod('mader')
                  calculateThresholds(webhookData, 'mader')
                }}
                className={`p-3 text-xs rounded-lg border transition-all duration-200 ${
                  selectedMethod === 'mader' 
                    ? 'text-gray-800 font-semibold' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  backgroundColor: selectedMethod === 'mader' 
                    ? 'rgba(107, 114, 128, 0.25)' 
                    : 'rgba(107, 114, 128, 0.1)',
                  borderColor: selectedMethod === 'mader' 
                    ? 'rgba(107, 114, 128, 0.4)' 
                    : 'rgba(107, 114, 128, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== 'mader') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== 'mader') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                  }
                }}
              >
                <div className="font-semibold">Mader 4mmol</div>
                <div className="text-xs opacity-80">Mader (1976) -</div>
              </button>
              
              <button
                onClick={() => {
                  setSelectedMethod('loglog')
                  calculateThresholds(webhookData, 'loglog')
                }}
                className={`p-3 text-xs rounded-lg border transition-all duration-200 ${
                  selectedMethod === 'loglog' 
                    ? 'text-gray-800 font-semibold' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  backgroundColor: selectedMethod === 'loglog' 
                    ? 'rgba(107, 114, 128, 0.25)' 
                    : 'rgba(107, 114, 128, 0.1)',
                  borderColor: selectedMethod === 'loglog' 
                    ? 'rgba(107, 114, 128, 0.4)' 
                    : 'rgba(107, 114, 128, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== 'loglog') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== 'loglog') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                  }
                }}
              >
                <div className="font-semibold">Log-Log</div>
                <div className="text-xs opacity-80">Beaver et al.</div>
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-5">
              {/* Zweite Reihe */}
              <button
                onClick={() => {
                  setSelectedMethod('plus1mmol')
                  calculateThresholds(webhookData, 'plus1mmol')
                }}
                className={`p-3 text-xs rounded-lg border transition-all duration-200 ${
                  selectedMethod === 'plus1mmol' 
                    ? 'text-gray-800 font-semibold' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  backgroundColor: selectedMethod === 'plus1mmol' 
                    ? 'rgba(107, 114, 128, 0.25)' 
                    : 'rgba(107, 114, 128, 0.1)',
                  borderColor: selectedMethod === 'plus1mmol' 
                    ? 'rgba(107, 114, 128, 0.4)' 
                    : 'rgba(107, 114, 128, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== 'plus1mmol') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== 'plus1mmol') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                  }
                }}
              >
                <div className="font-semibold">+1.0 mmol/L</div>
                <div className="text-xs opacity-80">Faude et al.</div>
              </button>
              
              <button
                onClick={() => {
                  setSelectedMethod('moddmax')
                  calculateThresholds(webhookData, 'moddmax')
                }}
                className={`p-3 text-xs rounded-lg border transition-all duration-200 ${
                  selectedMethod === 'moddmax' 
                    ? 'text-gray-800 font-semibold' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  backgroundColor: selectedMethod === 'moddmax' 
                    ? 'rgba(107, 114, 128, 0.25)' 
                    : 'rgba(107, 114, 128, 0.1)',
                  borderColor: selectedMethod === 'moddmax' 
                    ? 'rgba(107, 114, 128, 0.4)' 
                    : 'rgba(107, 114, 128, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== 'moddmax') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== 'moddmax') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                  }
                }}
              >
                <div className="font-semibold">ModDMAX</div>
                <div className="text-xs opacity-80">Bishop et al.</div>
              </button>
              
              <button
                onClick={() => {
                  setSelectedMethod('seiler')
                  calculateThresholds(webhookData, 'seiler')
                }}
                className={`p-3 text-xs rounded-lg border transition-all duration-200 ${
                  selectedMethod === 'seiler' 
                    ? 'text-gray-800 font-semibold' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  backgroundColor: selectedMethod === 'seiler' 
                    ? 'rgba(107, 114, 128, 0.25)' 
                    : 'rgba(107, 114, 128, 0.1)',
                  borderColor: selectedMethod === 'seiler' 
                    ? 'rgba(107, 114, 128, 0.4)' 
                    : 'rgba(107, 114, 128, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== 'seiler') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== 'seiler') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                  }
                }}
              >
                <div className="font-semibold">Seiler 3-Zone</div>
                <div className="text-xs opacity-80">Seiler - Polarisiertes</div>
              </button>
              
              <div></div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {/* Dritte Reihe */}
              <button
                onClick={() => {
                  setSelectedMethod('fatmax')
                  calculateThresholds(webhookData, 'fatmax')
                }}
                className={`p-3 text-xs rounded-lg border transition-all duration-200 ${
                  selectedMethod === 'fatmax' 
                    ? 'text-gray-800 font-semibold' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={{
                  backgroundColor: selectedMethod === 'fatmax' 
                    ? 'rgba(107, 114, 128, 0.25)' 
                    : 'rgba(107, 114, 128, 0.1)',
                  borderColor: selectedMethod === 'fatmax' 
                    ? 'rgba(107, 114, 128, 0.4)' 
                    : 'rgba(107, 114, 128, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== 'fatmax') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== 'fatmax') {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                  }
                }}
              >
                <div className="font-semibold">FatMax/LT</div>
                <div className="text-xs opacity-80">San-Millán - FatMax</div>
              </button>
              
              {/* Only show Manual button when there are actual manual adjustments */}
              {isAdjusted && (
                <button
                  onClick={async () => {
                    console.log('🔧 Manual button clicked - loading adjusted thresholds...')
                    console.log('Session:', selectedSessionId, 'Customer:', selectedCustomer?.customer_id)
                    
                    // Set manual loading flag to prevent auto-loading interference
                    setIsManuallyLoading(true)
                    setSelectedMethod('adjusted')
                    
                    // Clear current values first to force refresh
                    setLt1(null)
                    setLt2(null)
                    setTrainingZones([])
                    
                    // Force a small delay to ensure state is cleared
                    await new Promise(resolve => setTimeout(resolve, 50))
                    
                    // Daten aus Datenbank lesen und Graph aktualisieren
                    const loaded = await loadAdjustedThresholds()
                    console.log('🔧 Manual loading result:', loaded)
                    
                    if (!loaded) {
                      console.warn('⚠️ No adjusted thresholds found - switching back to DMAX')
                      setSelectedMethod('dmax')
                      calculateThresholds(webhookData, 'dmax')
                    }
                    
                    // Reset manual loading flag
                    setIsManuallyLoading(false)
                  }}
                  className={`p-3 text-xs rounded-lg border relative transition-all duration-200 ${
                    selectedMethod === 'adjusted' 
                      ? 'text-gray-800 font-semibold' 
                      : 'text-gray-700 animate-pulse'
                  }`}
                  style={{
                    backgroundColor: selectedMethod === 'adjusted' 
                      ? 'rgba(107, 114, 128, 0.25)' 
                      : 'rgba(107, 114, 128, 0.18)',
                    borderColor: selectedMethod === 'adjusted' 
                      ? 'rgba(107, 114, 128, 0.4)' 
                      : 'rgba(107, 114, 128, 0.3)'
                  }}
                >
                  <div className="font-semibold">
                    Manual {selectedMethod !== 'adjusted' ? '●' : ''}
                  </div>
                  <div className="text-xs opacity-80">
                    Verfügbar
                  </div>
                  {selectedMethod !== 'adjusted' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {webhookData.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          {isAdjusted && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md border-l-4 border-red-500">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                ⚠️ Manuelle Anpassung: Die LT1/LT2 Schwellen wurden manuell verändert
              </p>
            </div>
          )}
          <div 
            ref={chartRef} 
            style={{ 
              height: '650px', 
              width: '100%',
              cursor: isDragging.type ? 'grabbing' : 'default',
              transition: 'cursor 0.1s ease',
              margin: '20px 0'
            }}
          />
          
          {/* Threshold Info */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {lt1 && (
              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  LT1 (Aerobe Schwelle)
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  {lt1?.power}W @ {(typeof lt1?.lactate === 'number' ? lt1.lactate.toFixed(2) : parseFloat(lt1?.lactate || '0').toFixed(2))} mmol/L
                </p>
              </div>
            )}
            {lt2 && (
              <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  LT2 (Anaerobe Schwelle - OBLA)
                </h3>
                <p className="text-orange-700 dark:text-orange-300">
                  {lt2?.power}W @ {(typeof lt2?.lactate === 'number' ? lt2.lactate.toFixed(2) : parseFloat(lt2?.lactate || '0').toFixed(2))} mmol/L
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">Lade Daten...</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-zinc-600 dark:text-zinc-400">
                Keine Daten verfügbar. Bitte wählen Sie eine Session aus.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Training Zones Overview */}
      {trainingZones.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">5-Zonen Trainingssystem</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {trainingZones.map(zone => (
              <div
                key={zone.id}
                className="p-4 rounded-lg border-2"
                style={{
                  backgroundColor: zone.color,
                  borderColor: zone.borderColor
                }}
              >
                <h4 className="font-semibold text-zinc-900">{zone.name}</h4>
                <p className="text-sm text-zinc-700">{zone.description}</p>
                <p className="text-xs mt-2 text-zinc-600">
                  {Math.round(zone.range[0])}W - {Math.round(zone.range[1])}W
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}