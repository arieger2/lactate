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
  
  // Calculate xAxis min value based on the first zone's start
  let xAxisMin: number | undefined = undefined;
  if (trainingZones.length > 0) {
    const firstZoneStart = trainingZones[0].range[0];
    if (unit === 'kmh') {
      // Ensure the axis starts at least 2 units before the first zone begins
      xAxisMin = Math.max(0, firstZoneStart - 2);
    } else if (unit === 'watt') {
      // Ensure the axis starts at least 30 units before the first zone begins
      xAxisMin = Math.max(0, firstZoneStart - 30);
    }
  } else if (webhookData.length > 0) {
    // Fallback if zones are not yet calculated
    const minPower = Math.min(...webhookData.map(d => d.power));
    if (unit === 'kmh') {
      xAxisMin = Math.max(0, minPower - 2);
    } else if (unit === 'watt') {
      xAxisMin = Math.max(0, minPower - 30);
    }
  }
  
  // Check if last stage is interpolated
  const lastStageIndex = webhookData.length - 1
  const hasInterpolatedLastStage = lastStageIndex > 0 && (webhookData[lastStageIndex] as any).isInterpolated === true
  
  // Prepare data series - split into complete and interpolated segments
  const completeData = hasInterpolatedLastStage 
    ? webhookData.slice(0, -1).map(d => [d.power, d.lactate])
    : webhookData.map(d => [d.power, d.lactate])
  
  // Generate parabolic curve through last 3 points if interpolated
  let parabolaCurveData: number[][] = []
  if (hasInterpolatedLastStage && lastStageIndex >= 2) {
    const p0 = webhookData[lastStageIndex - 2]
    const p1 = webhookData[lastStageIndex - 1]
    const p2 = webhookData[lastStageIndex]
    
    const theoreticalLoad = parseFloat((p2 as any).theoreticalLoad || p2.power)
    
    // Parabola through last 3 stages using theoretical load for incomplete stage
    // Example: (16, 3.49), (18, 6.45), (18.6, 8.24)
    const x0 = parseFloat(p0.power as any), y0 = parseFloat(p0.lactate as any)
    const x1 = parseFloat(p1.power as any), y1 = parseFloat(p1.lactate as any)
    const x2 = theoreticalLoad, y2 = parseFloat(p2.lactate as any)
    
    const denom = (x0 - x1) * (x0 - x2) * (x1 - x2)
    
    if (Math.abs(denom) >= 0.001) {
      const a = (x2 * (y1 - y0) + x1 * (y0 - y2) + x0 * (y2 - y1)) / denom
      const b = (x2*x2 * (y0 - y1) + x1*x1 * (y2 - y0) + x0*x0 * (y1 - y2)) / denom
      const c = (x1*x2 * (x1 - x2) * y0 + x2*x0 * (x2 - x0) * y1 + x0*x1 * (x0 - x1) * y2) / denom
      
      // Draw parabola from previous stage to theoretical load
      const steps = 50
      const stepSize = (theoreticalLoad - x1) / steps
      
      for (let i = 0; i <= steps; i++) {
        const x = x1 + (i * stepSize)
        const y = a * x * x + b * x + c
        parabolaCurveData.push([x, y])
      }
    }
  }
  
  const interpolatedSegment = hasInterpolatedLastStage && lastStageIndex > 0 && parabolaCurveData.length === 0
    ? [
        [webhookData[lastStageIndex - 1].power, webhookData[lastStageIndex - 1].lactate],
        [webhookData[lastStageIndex].power, webhookData[lastStageIndex].lactate]
      ]
    : []
  
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
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesName === 'Laktat' || params.seriesName === 'Laktat (Parabel)' || params.seriesName === 'Laktat (interpoliert)') {
          return `${tooltipLabel}: ${params.value[0]} ${tooltipUnit}<br/>${params.seriesName}: ${params.value[1].toFixed(2)} mmol/L`
        } else if (params.seriesName === 'Herzfrequenz') {
          return `${tooltipLabel}: ${params.value[0]} ${tooltipUnit}<br/>${params.seriesName}: ${params.value[1]} bpm`
        }
        return ''
      }
    },
    legend: {
      top: 30,
      data: [
        'Laktat',
        ...(parabolaCurveData.length > 0 ? ['Laktat (quadratisch)'] : 
            hasInterpolatedLastStage && interpolatedSegment.length > 0 ? ['Laktat (interpoliert)'] : 
            []),
        'Herzfrequenz', 
        'LT1', 
        'LT2'
      ]
    },
    xAxis: {
      type: 'value',
      name: xAxisLabel,
      nameLocation: 'middle',
      nameGap: 30,
      ...(xAxisMin !== undefined && { min: xAxisMin })
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
      // Lactate curve (complete stages) mit Trainingszonen als Hintergrundbereiche
      {
        name: 'Laktat',
        type: 'line' as const,
        data: completeData,
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
      // Interpolated segment (last stage) - LINEAR fallback if parabola failed
      ...(hasInterpolatedLastStage && interpolatedSegment.length > 0 ? [{
        name: 'Laktat (interpoliert)',
        type: 'line' as const,
        data: interpolatedSegment,
        smooth: true,
        lineStyle: {
          color: '#ef4444',
          width: 3
        },
        itemStyle: {
          color: '#ef4444'
        },
        yAxisIndex: 0,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8
      }] : []),
      // Parabolic curve through last 3 points
      ...(parabolaCurveData.length > 0 ? [{
        name: 'Laktat (Parabel)',
        type: 'line' as const,
        data: parabolaCurveData,
        smooth: true,
        lineStyle: {
          color: '#ef4444',
          width: 3
        },
        itemStyle: {
          color: '#ef4444'
        },
        yAxisIndex: 0,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: (value: any, params: any) => {
          return params.dataIndex === parabolaCurveData.length - 1 ? 8 : 0
        }
      }] : []),
      // Heart rate (optional, wenn vorhanden)
      ...(webhookData.some(d => d.heartRate) ? [{
        name: 'Herzfrequenz',
        type: 'line' as const,
        data: webhookData.map(d => [d.power, d.heartRate || 0]),
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
