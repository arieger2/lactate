import * as echarts from 'echarts'
import { LactateDataPoint, ThresholdPoint, TrainingZone } from './types'

/**
 * Generiert ECharts-Optionen für die Laktat-Leistungskurve
 * @param webhookData - Laktat-Messpunkte
 * @param trainingZones - Berechnete Trainingszonen
 * @param lt1 - LT1 Schwellenpunkt
 * @param lt2 - LT2 Schwellenpunkt
 * @param isDragging - Ob gerade ein Marker gezogen wird
 * @param unit - Einheit: 'watt', 'kmh' oder 'other'
 * @returns ECharts-Optionen Objekt
 */
export function createLactateChartOptions(
  webhookData: LactateDataPoint[],
  trainingZones: TrainingZone[],
  lt1: ThresholdPoint | null,
  lt2: ThresholdPoint | null,
  isDragging: boolean,
  unit: string = 'watt'
): echarts.EChartsOption {
  // Determine axis label based on unit
  const xAxisLabel = unit === 'kmh' ? 'Geschwindigkeit (km/h)' : 'Leistung (W)'
  const tooltipLabel = unit === 'kmh' ? 'Geschwindigkeit' : 'Leistung'
  const tooltipUnit = unit === 'kmh' ? 'km/h' : 'W'
  
  return {
    animation: false,
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
        let tooltip = `${tooltipLabel}: ${params[0].value[0]} ${tooltipUnit}<br/>`
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
      name: xAxisLabel,
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
        type: 'line' as const,
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
      // Heart rate (optional, wenn vorhanden)
      ...(webhookData.some(d => d.heartRate) ? [{
        name: 'Herzfrequenz',
        type: 'line' as const,
        data: webhookData.map(d => [d.power, d.heartRate || 0]),
        smooth: true,
        lineStyle: {
          color: '#3b82f6',
          width: 2,
          type: 'dashed' as const
        },
        itemStyle: {
          color: '#3b82f6'
        },
        yAxisIndex: 1
      }] : []),
      // LT1 marker (verschiebbar)
      ...(lt1 ? [{
        name: 'LT1',
        type: 'scatter' as const,
        data: [[lt1.power, lt1.lactate]],
        symbolSize: 22,
        animation: false,
        itemStyle: {
          color: '#10b981',
          borderColor: '#fff',
          borderWidth: 3
        },
        yAxisIndex: 0,
        label: {
          show: true,
          position: 'top' as const,
          formatter: 'LT1',
          fontSize: 12,
          fontWeight: 'bold' as const,
          color: '#10b981',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: [2, 4],
          borderRadius: 3
        },
        ...(isDragging ? {} : {
          emphasis: {
            scale: 1.3
          }
        }),
        markLine: {
          data: [{
            xAxis: lt1.power,
            lineStyle: { color: '#10b981', type: 'dashed' as const, width: 3 },
            label: {
              show: true,
              position: 'insideEndTop' as const,
              formatter: 'LT1\n{c}W',
              fontSize: 11,
              fontWeight: 'bold' as const,
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
        type: 'scatter' as const,
        data: [[lt2.power, lt2.lactate]],
        symbolSize: 22,
        animation: false,
        itemStyle: {
          color: '#f59e0b',
          borderColor: '#fff',
          borderWidth: 3
        },
        yAxisIndex: 0,
        label: {
          show: true,
          position: 'top' as const,
          formatter: 'LT2',
          fontSize: 12,
          fontWeight: 'bold' as const,
          color: '#f59e0b',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: [2, 4],
          borderRadius: 3
        },
        ...(isDragging ? {} : {
          emphasis: {
            scale: 1.3
          }
        }),
        markLine: {
          data: [{
            xAxis: lt2.power,
            lineStyle: { color: '#f59e0b', type: 'dashed' as const, width: 3 },
            label: {
              show: true,
              position: 'insideEndTop' as const,
              formatter: 'LT2\n{c}W',
              fontSize: 11,
              fontWeight: 'bold' as const,
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
}
