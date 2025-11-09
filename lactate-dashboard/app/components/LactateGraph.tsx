'use client'

import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'

interface DataPoint {
  timestamp: string
  value: number
}

export default function LactateGraph() {
  const [data, setData] = useState<DataPoint[]>([])
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')

  // Sample data for demonstration
  useEffect(() => {
    const generateSampleData = () => {
      const now = new Date()
      const sampleData: DataPoint[] = []
      
      for (let i = 0; i < 20; i++) {
        const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
        const value = 1.5 + Math.random() * 3 + Math.sin(i * 0.5) * 0.5
        sampleData.push({
          timestamp: date.toISOString(),
          value: Math.round(value * 10) / 10
        })
      }
      
      return sampleData.reverse()
    }

    setData(generateSampleData())
  }, [])

  const filteredData = data.filter(point => {
    const pointDate = new Date(point.timestamp)
    const now = new Date()
    const diffHours = (now.getTime() - pointDate.getTime()) / (1000 * 60 * 60)
    
    switch (timeRange) {
      case '24h':
        return diffHours <= 24
      case '7d':
        return diffHours <= 24 * 7
      case '30d':
        return diffHours <= 24 * 30
      default:
        return true
    }
  })

  const maxValue = Math.max(...filteredData.map(d => d.value))
  const minValue = Math.min(...filteredData.map(d => d.value))
  const range = maxValue - minValue
  const padding = range * 0.1

  const getStatistics = () => {
    if (filteredData.length === 0) return null

    const values = filteredData.map(d => d.value)
    const average = values.reduce((sum, val) => sum + val, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)

    return {
      average: Math.round(average * 10) / 10,
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      count: values.length
    }
  }

  const stats = getStatistics()

  const getChartOption = () => {
    return {
      title: {
        show: false
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0]
          const date = new Date(filteredData[data.dataIndex].timestamp)
          return `
            <div style="padding: 8px;">
              <strong>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</strong><br/>
              Lactate: <span style="color: #3b82f6; font-weight: bold;">${data.value} mmol/L</span>
            </div>
          `
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: filteredData.map(point => {
          const date = new Date(point.timestamp)
          return timeRange === '24h' 
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
        }),
        axisLabel: {
          color: '#6b7280',
          fontSize: 11
        },
        axisLine: {
          lineStyle: {
            color: '#374151'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Lactate (mmol/L)',
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 12
        },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11
        },
        axisLine: {
          lineStyle: {
            color: '#374151'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#374151',
            opacity: 0.3
          }
        }
      },
      series: [
        {
          name: 'Lactate Level',
          type: 'line',
          smooth: true,
          data: filteredData.map(point => point.value),
          itemStyle: {
            color: '#3b82f6'
          },
          lineStyle: {
            color: '#3b82f6',
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
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
              ]
            }
          },
          symbol: 'circle',
          symbolSize: 8,
          emphasis: {
            itemStyle: {
              color: '#1d4ed8',
              borderColor: '#ffffff',
              borderWidth: 2
            }
          }
        }
      ],
      // Add reference zones
      markLine: {
        silent: true,
        data: [
          {
            yAxis: 2.2,
            lineStyle: {
              color: '#10b981',
              type: 'dashed',
              opacity: 0.6
            },
            label: {
              position: 'end',
              formatter: 'Rest Threshold'
            }
          },
          {
            yAxis: 4,
            lineStyle: {
              color: '#f59e0b',
              type: 'dashed',
              opacity: 0.6
            },
            label: {
              position: 'end',
              formatter: 'Anaerobic Threshold'
            }
          }
        ]
      },
      backgroundColor: 'transparent'
    }
  }

  const getGaugeOption = () => {
    const currentValue = filteredData.length > 0 ? filteredData[filteredData.length - 1].value : 0
    
    return {
      series: [
        {
          name: 'Lactate Level',
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 10,
          splitNumber: 5,
          itemStyle: {
            color: '#3b82f6'
          },
          progress: {
            show: true,
            width: 18
          },
          pointer: {
            show: false
          },
          axisLine: {
            lineStyle: {
              width: 18
            }
          },
          axisTick: {
            distance: -30,
            splitNumber: 5,
            lineStyle: {
              width: 2,
              color: '#999'
            }
          },
          splitLine: {
            distance: -30,
            length: 14,
            lineStyle: {
              width: 3,
              color: '#999'
            }
          },
          axisLabel: {
            color: '#6b7280',
            distance: -20,
            fontSize: 10
          },
          anchor: {
            show: false
          },
          title: {
            show: false
          },
          detail: {
            valueAnimation: true,
            width: '60%',
            lineHeight: 40,
            borderRadius: 8,
            offsetCenter: [0, '-15%'],
            fontSize: 24,
            fontWeight: 'bolder',
            formatter: '{value} mmol/L',
            color: 'inherit'
          },
          data: [
            {
              value: currentValue
            }
          ]
        }
      ]
    }
  }

  const getDistributionOption = () => {
    // Create distribution buckets
    const buckets = [
      { name: 'Rest (0-2.2)', min: 0, max: 2.2, color: '#10b981' },
      { name: 'Aerobic (2.2-4)', min: 2.2, max: 4, color: '#f59e0b' },
      { name: 'Anaerobic (4+)', min: 4, max: Infinity, color: '#ef4444' }
    ]

    const distribution = buckets.map(bucket => {
      const count = filteredData.filter(d => d.value >= bucket.min && d.value < bucket.max).length
      return {
        name: bucket.name,
        value: count,
        itemStyle: { color: bucket.color }
      }
    })

    return {
      title: {
        show: false
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} readings ({d}%)'
      },
      legend: {
        bottom: '5%',
        left: 'center',
        textStyle: {
          color: '#6b7280'
        }
      },
      series: [
        {
          name: 'Zone Distribution',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '40%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: distribution
        }
      ]
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Lactate Trends
          </h2>
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.average}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.min}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Minimum</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.max}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Maximum</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
                {stats.count}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Readings</div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Lactate Levels Over Time
          </h3>
          
          {filteredData.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              No data available for the selected time range.
            </div>
          ) : (
            <div className="h-80 w-full">
              <ReactECharts
                option={getChartOption()}
                style={{ height: '100%', width: '100%' }}
              />
            </div>
          )}

          {/* Reference ranges */}
          <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-md">
            <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300 mb-2">Reference Ranges:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Rest:</span>
                <span className="font-medium">0.5-2.2 mmol/L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Aerobic Threshold:</span>
                <span className="font-medium">2-4 mmol/L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Anaerobic Threshold:</span>
                <span className="font-medium">4+ mmol/L</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Level Gauge */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Current Level
          </h3>
          
          {filteredData.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              No data available
            </div>
          ) : (
            <div className="h-64 w-full">
              <ReactECharts
                option={getGaugeOption()}
                style={{ height: '100%', width: '100%' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Distribution Chart */}
      {filteredData.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Distribution Analysis
          </h3>
          <div className="h-64 w-full">
            <ReactECharts
              option={getDistributionOption()}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}