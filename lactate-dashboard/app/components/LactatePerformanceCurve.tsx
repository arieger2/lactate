'use client'

import { useState, useEffect, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'

interface LactateWebhookData {
  timestamp: string
  power: number // Watts
  lactate: number // mmol/L
  heartRate?: number // bpm
  fatOxidation?: number // g/min
  sessionId?: string
  testType?: 'incremental' | 'steady-state'
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

export default function LactatePerformanceCurve() {
  const [webhookData, setWebhookData] = useState<LactateWebhookData[]>([])
  const [thresholds, setThresholds] = useState<ThresholdData | null>(null)
  const [isReceivingData, setIsReceivingData] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')

  // Calculate thresholds automatically when new data arrives
  const calculateThresholds = useCallback((data: LactateWebhookData[]) => {
    if (data.length < 4) return null

    // Sort by power for threshold calculation
    const sortedData = [...data].sort((a, b) => a.power - b.power)
    
    // LT1 (aerobic threshold) - first significant rise above baseline
    let lt1Index = 1
    const baseline = sortedData[0].lactate
    for (let i = 1; i < sortedData.length; i++) {
      if (sortedData[i].lactate > baseline + 1.0) {
        lt1Index = i - 1
        break
      }
    }

    // LT2 (anaerobic threshold) - exponential rise point
    let lt2Index = sortedData.length - 2
    for (let i = lt1Index + 1; i < sortedData.length - 1; i++) {
      const current = sortedData[i].lactate
      const next = sortedData[i + 1].lactate
      if (next - current > 2.0) { // Significant jump
        lt2Index = i
        break
      }
    }

    // FATmax - highest fat oxidation point (if available)
    let fatMaxIndex = Math.floor(sortedData.length / 2)
    if (data.some(d => d.fatOxidation)) {
      fatMaxIndex = sortedData.reduce((maxIdx, curr, idx) => 
        (curr.fatOxidation || 0) > (sortedData[maxIdx].fatOxidation || 0) ? idx : maxIdx, 0
      )
    }

    return {
      lt1: {
        power: sortedData[lt1Index].power,
        lactate: sortedData[lt1Index].lactate,
        heartRate: sortedData[lt1Index].heartRate
      },
      lt2: {
        power: sortedData[lt2Index].power,
        lactate: sortedData[lt2Index].lactate,
        heartRate: sortedData[lt2Index].heartRate
      },
      fatMax: sortedData[fatMaxIndex].fatOxidation ? {
        power: sortedData[fatMaxIndex].power,
        fatOxidation: sortedData[fatMaxIndex].fatOxidation!,
        heartRate: sortedData[fatMaxIndex].heartRate
      } : undefined
    }
  }, [])

  // Set up webhook endpoint
  useEffect(() => {
    // Generate a unique session ID when component mounts
    const newSessionId = `session_${Date.now()}`
    setSessionId(newSessionId)
    
    // Set up webhook URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    setWebhookUrl(`${baseUrl}/api/lactate-webhook`)
  }, [])

  // Poll for new data when receiving data
  useEffect(() => {
    if (!isReceivingData || !sessionId) return

    const pollForData = async () => {
      try {
        const response = await fetch(`/api/lactate-webhook?sessionId=${sessionId}`)
        const result = await response.json()
        
        if (result.data && result.data.length > 0) {
          setWebhookData(result.data)
          const calculatedThresholds = calculateThresholds(result.data)
          if (calculatedThresholds) {
            setThresholds(calculatedThresholds)
          }
        }
      } catch (error) {
        console.error('Error polling for data:', error)
      }
    }

    // Start polling every 2 seconds
    const pollInterval = setInterval(pollForData, 2000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [isReceivingData, sessionId, calculateThresholds])

  // Simulate webhook data reception for testing
  const simulateWebhookData = () => {
    setIsReceivingData(true)
    
    // Simulate incremental test data
    const testData: LactateWebhookData[] = [
      { timestamp: new Date().toISOString(), power: 100, lactate: 1.2, heartRate: 120, fatOxidation: 0.35, testType: 'incremental' },
      { timestamp: new Date().toISOString(), power: 150, lactate: 1.5, heartRate: 135, fatOxidation: 0.42, testType: 'incremental' },
      { timestamp: new Date().toISOString(), power: 200, lactate: 1.8, heartRate: 150, fatOxidation: 0.48, testType: 'incremental' },
      { timestamp: new Date().toISOString(), power: 250, lactate: 2.3, heartRate: 165, fatOxidation: 0.45, testType: 'incremental' },
      { timestamp: new Date().toISOString(), power: 300, lactate: 3.2, heartRate: 175, fatOxidation: 0.38, testType: 'incremental' },
      { timestamp: new Date().toISOString(), power: 350, lactate: 5.1, heartRate: 185, fatOxidation: 0.25, testType: 'incremental' },
      { timestamp: new Date().toISOString(), power: 400, lactate: 8.5, heartRate: 195, fatOxidation: 0.15, testType: 'incremental' }
    ]

    // Add data points progressively
    testData.forEach((dataPoint, index) => {
      setTimeout(() => {
        setWebhookData(prev => {
          const newData = [...prev, dataPoint]
          const calculatedThresholds = calculateThresholds(newData)
          if (calculatedThresholds) {
            setThresholds(calculatedThresholds)
          }
          return newData
        })
        
        if (index === testData.length - 1) {
          setIsReceivingData(false)
        }
      }, index * 1000)
    })
  }

  const clearData = async () => {
    try {
      // Clear data on server
      if (sessionId) {
        await fetch(`/api/lactate-webhook?sessionId=${sessionId}`, {
          method: 'DELETE'
        })
      }
    } catch (error) {
      console.error('Error clearing server data:', error)
    }
    
    // Clear local state
    setWebhookData([])
    setThresholds(null)
    setIsReceivingData(false)
  }

  const getLactateChartOption = () => {
    if (webhookData.length === 0) return {}

    const sortedData = [...webhookData].sort((a, b) => a.power - b.power)
    const powers = sortedData.map(d => d.power)
    const lactates = sortedData.map(d => d.lactate)
    const fatOxidation = sortedData.map(d => d.fatOxidation || 0)

    return {
      title: {
        text: 'Laktat-Leistungskurve mit Metabolischen Zonen',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#374151'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const dataIndex = params[0].dataIndex
          const data = sortedData[dataIndex]
          return `
            <div style="padding: 8px;">
              <strong>Leistung: ${data.power} W</strong><br/>
              Laktat: <span style="color: #ef4444;">${data.lactate} mmol/L</span><br/>
              ${data.heartRate ? `Herzfrequenz: ${data.heartRate} bpm<br/>` : ''}
              ${data.fatOxidation ? `Fettoxidation: ${data.fatOxidation.toFixed(2)} g/min` : ''}
            </div>
          `
        }
      },
      legend: {
        data: ['Laktat', 'Fettoxidation'],
        bottom: '5%',
        textStyle: {
          color: '#6b7280'
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: powers,
        name: 'Leistung (W)',
        nameLocation: 'middle',
        nameGap: 30,
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
        {
          name: 'Laktat',
          type: 'line',
          smooth: true,
          data: lactates,
          itemStyle: {
            color: '#ef4444'
          },
          lineStyle: {
            color: '#ef4444',
            width: 3
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
                { offset: 1, color: 'rgba(239, 68, 68, 0.05)' }
              ]
            }
          },
          symbol: 'circle',
          symbolSize: 8
        },
        {
          name: 'Fettoxidation',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: fatOxidation,
          itemStyle: {
            color: '#10b981'
          },
          lineStyle: {
            color: '#10b981',
            width: 3
          },
          symbol: 'circle',
          symbolSize: 6
        }
      ],
      // Add threshold markers
      markLine: thresholds ? {
        silent: true,
        data: [
          ...(thresholds.lt1 ? [{
            xAxis: thresholds.lt1.power,
            lineStyle: { color: '#3b82f6', type: 'dashed', width: 2 },
            label: {
              formatter: `LT1\n${thresholds.lt1.power}W\n${thresholds.lt1.lactate}mmol/L`,
              position: 'insideEndTop'
            }
          }] : []),
          ...(thresholds.lt2 ? [{
            xAxis: thresholds.lt2.power,
            lineStyle: { color: '#f59e0b', type: 'dashed', width: 2 },
            label: {
              formatter: `LT2\n${thresholds.lt2.power}W\n${thresholds.lt2.lactate}mmol/L`,
              position: 'insideEndTop'
            }
          }] : []),
          ...(thresholds.fatMax ? [{
            xAxis: thresholds.fatMax.power,
            lineStyle: { color: '#10b981', type: 'dashed', width: 2 },
            label: {
              formatter: `FATmax\n${thresholds.fatMax.power}W`,
              position: 'insideEndBottom'
            }
          }] : [])
        ]
      } : undefined,
      backgroundColor: 'transparent'
    }
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
              value={webhookUrl}
              readOnly
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Session ID:
            </label>
            <input
              type="text"
              value={sessionId || ''}
              readOnly
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm font-mono"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={simulateWebhookData}
            disabled={isReceivingData}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
          >
            {isReceivingData ? 'Empfange Daten...' : 'Testdaten Simulieren'}
          </button>
          <button
            onClick={clearData}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition-colors"
          >
            Daten Löschen
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isReceivingData ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {isReceivingData ? 'Live' : 'Bereit'}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        {webhookData.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                📊
              </div>
            </div>
            <p className="text-lg font-medium mb-2">Keine Daten verfügbar</p>
            <p className="text-sm">Klicken Sie auf "Testdaten Simulieren" oder senden Sie Daten an den Webhook.</p>
          </div>
        ) : (
          <div className="h-96 w-full">
            <ReactECharts
              option={getLactateChartOption()}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* Threshold Summary */}
      {thresholds && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Berechnete Schwellen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">LT1 (Aerobe Schwelle)</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>{thresholds.lt1.power} W</strong><br/>
                Laktat: {thresholds.lt1.lactate} mmol/L<br/>
                {thresholds.lt1.heartRate && `HF: ${thresholds.lt1.heartRate} bpm`}
              </p>
            </div>
            
            <div className="p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">LT2 (Anaerobe Schwelle)</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>{thresholds.lt2.power} W</strong><br/>
                Laktat: {thresholds.lt2.lactate} mmol/L<br/>
                {thresholds.lt2.heartRate && `HF: ${thresholds.lt2.heartRate} bpm`}
              </p>
            </div>

            {thresholds.fatMax && (
              <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">FATmax</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>{thresholds.fatMax.power} W</strong><br/>
                  Fettox: {thresholds.fatMax.fatOxidation.toFixed(2)} g/min<br/>
                  {thresholds.fatMax.heartRate && `HF: ${thresholds.fatMax.heartRate} bpm`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Points */}
      {webhookData.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Empfangene Datenpunkte ({webhookData.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left p-2 text-zinc-700 dark:text-zinc-300">Zeit</th>
                  <th className="text-left p-2 text-zinc-700 dark:text-zinc-300">Leistung (W)</th>
                  <th className="text-left p-2 text-zinc-700 dark:text-zinc-300">Laktat (mmol/L)</th>
                  <th className="text-left p-2 text-zinc-700 dark:text-zinc-300">HF (bpm)</th>
                  <th className="text-left p-2 text-zinc-700 dark:text-zinc-300">Fettox (g/min)</th>
                </tr>
              </thead>
              <tbody>
                {webhookData.map((data, index) => (
                  <tr key={index} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="p-2">{new Date(data.timestamp).toLocaleTimeString()}</td>
                    <td className="p-2 font-medium">{data.power}</td>
                    <td className="p-2 font-medium text-red-600">{data.lactate}</td>
                    <td className="p-2">{data.heartRate || '-'}</td>
                    <td className="p-2">{data.fatOxidation ? data.fatOxidation.toFixed(2) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}