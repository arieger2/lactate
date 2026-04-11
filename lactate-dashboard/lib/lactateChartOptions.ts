import * as echarts from 'echarts'
import { LactateDataPoint, MethodComparisonResult, ThresholdPoint, TrainingZone, VentilatorThreshold } from './types'

export interface AiChartExtras {
  curve?:   Array<{ power: number; lactate: number }> | null
  vt1?:     VentilatorThreshold | null
  vt2?:     VentilatorThreshold | null
  vo2max?:  number | null
  methods?: MethodComparisonResult[] | null
  showMethods?: boolean
}

const METHOD_COLORS: Record<string, string> = {
  dickhuth: '#0ea5e9',
  dmax:     '#f97316',
  mader:    '#84cc16',
  moddmax:  '#e879f9',
  unknown:  '#94a3b8',
}

export function createLactateChartOptions(
  webhookData: LactateDataPoint[],
  trainingZones: TrainingZone[],
  lt1: ThresholdPoint | null,
  lt2: ThresholdPoint | null,
  isDragging: boolean,
  unit: string = 'watt',
  aiExtras?: AiChartExtras
): echarts.EChartsOption {
  // Determine axis label based on unit
  const xAxisLabel = unit === 'kmh' ? 'Geschwindigkeit (km/h)' : 'Leistung (W)'
  const tooltipLabel = unit === 'kmh' ? 'Geschwindigkeit' : 'Leistung'
  const tooltipUnit = unit === 'kmh' ? 'km/h' : 'W'
  
  // Determine a sensible maximum for the x-axis based on data
  const lastDataPointPower = webhookData.length > 0 
    ? Math.max(...webhookData.map(d => d.power)) 
    : 20;
  const xAxisMax = Math.ceil(lastDataPointPower * 1.1); // Add 10% buffer and round up

  // Calculate dynamic max for lactate y-axis (max lactate + 1 mmol/L)
  const maxLactate = webhookData.length > 0
    ? Math.max(...webhookData.map(d => d.lactate))
    : 10;
  const lactateYMax = Math.ceil(maxLactate + 1);

  // Calculate dynamic max for heart rate y-axis (max HR + 20 bpm)
  const maxHeartRate = webhookData.length > 0
    ? Math.max(...webhookData.map(d => d.heartRate || 0).filter(hr => hr > 0))
    : 0;
  const heartRateYMax = maxHeartRate > 0 ? Math.ceil(maxHeartRate + 20) : undefined;

  // Calculate xAxis min value based on the first zone's start
  let xAxisMin: number | undefined = undefined;
  if (trainingZones.length > 0) {
    // Start the axis exactly at the beginning of the first zone
    xAxisMin = trainingZones[0].range[0];
  } else if (webhookData.length > 0) {
    // Fallback if zones are not yet calculated
    const minPower = Math.min(...webhookData.map(d => d.power));
    const offset = unit === 'kmh' ? 2 : 30;
    xAxisMin = Math.max(0, minPower - offset);
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
      showDelay: 0,
      hideDelay: 0,
      enterable: true,
      confine: true,
      formatter: (params: any) => {
        if (params.seriesName === 'Laktat' || params.seriesName === 'Laktat (quadratisch)' || params.seriesName === 'Laktat (interpoliert)') {
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
        ...(aiExtras?.curve?.length ? ['AI-Kurve'] : []),
        'Herzfrequenz',
        'LT1',
        'LT2',
        ...(aiExtras?.vt1 ? ['VT1'] : []),
        ...(aiExtras?.vt2 ? ['VT2'] : []),
      ]
    },
    xAxis: {
      type: 'value',
      name: xAxisLabel,
      nameLocation: 'middle',
      nameGap: 30,
      ...(xAxisMin !== undefined && { min: xAxisMin }),
      max: xAxisMax // Set the calculated maximum for the x-axis
    },
    yAxis: [
      {
        type: 'value',
        name: 'Laktat (mmol/L)',
        nameLocation: 'middle',
        nameGap: 40,
        min: 0,
        max: lactateYMax
      },
      {
        type: 'value',
        name: 'Herzfrequenz (bpm)',
        nameLocation: 'middle',
        nameGap: 40,
        position: 'right',
        ...(heartRateYMax ? { max: heartRateYMax } : {})
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
            width: 120,
            formatter: (params: any) => {
              const zoneName = params.name
              const zones = trainingZones
              const zoneIndex = zones.findIndex(z => 
                z.name === zoneName || z.name.startsWith(zoneName.replace('...', ''))
              )
              
              if (zoneIndex === -1) return zoneName
              
              const zone = zones[zoneIndex]
              const isFirst = zoneIndex === 0
              const isLast = zoneIndex === zones.length - 1
              
              let rangeText = ''
              if (isFirst) {
                rangeText = `- ${Math.round(zone.range[1])}`
              } else if (isLast) {
                rangeText = `${Math.round(zone.range[0])} -`
              } else {
                rangeText = `${Math.round(zone.range[0])} - ${Math.round(zone.range[1])}`
              }
              
              return `${zoneName}\n${rangeText}`
            }
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
        name: 'Laktat (quadratisch)',
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
        tooltip: {
          show: true,
          formatter: (params: any) => {
            const power = params.data[0].toFixed(2)
            const lactate = params.data[1].toFixed(2)
            return `<strong>LT1</strong><br/>${power}${tooltipUnit}<br/>${lactate} mmol/L`
          }
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
              formatter: `LT1\n{c}${tooltipUnit}`,
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
        tooltip: {
          show: true,
          formatter: (params: any) => {
            const power = params.data[0].toFixed(2)
            const lactate = params.data[1].toFixed(2)
            return `<strong>LT2</strong><br/>${power}${tooltipUnit}<br/>${lactate} mmol/L`
          }
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
              formatter: `LT2\n{c}${tooltipUnit}`,
              fontSize: 11,
              fontWeight: 'bold' as const,
              color: '#f59e0b',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: [2, 4],
              borderRadius: 3
            }
          }]
        }
      }] : []),
      // AI-fitted lactate curve
      ...(aiExtras?.curve?.length ? [{
        name: 'AI-Kurve',
        type: 'line' as const,
        data: aiExtras.curve.map(p => [p.power, p.lactate]),
        smooth: false,
        z: 10,
        lineStyle: { color: '#8b5cf6', width: 3, type: 'dashed' as const },
        itemStyle: { color: '#8b5cf6' },
        yAxisIndex: 0,
        showSymbol: false,
        tooltip: {
          show: true,
          formatter: (params: any) =>
            `AI-Kurve<br/>${tooltipLabel}: ${params.value[0]} ${tooltipUnit}<br/>Laktat: ${Number(params.value[1]).toFixed(2)} mmol/L`
        }
      }] : []),
      // VT1 marker
      ...(aiExtras?.vt1 ? [{
        name: 'VT1',
        type: 'scatter' as const,
        data: [[aiExtras.vt1.power, 0]],
        symbolSize: 18,
        animation: false,
        itemStyle: { color: '#a855f7', borderColor: '#fff', borderWidth: 3 },
        yAxisIndex: 0,
        label: {
          show: true,
          position: 'top' as const,
          formatter: 'VT1',
          fontSize: 11,
          fontWeight: 'bold' as const,
          color: '#a855f7',
          backgroundColor: 'rgba(255,255,255,0.8)',
          padding: [2, 4],
          borderRadius: 3
        },
        tooltip: {
          show: true,
          formatter: () => {
            const vt1 = aiExtras!.vt1!
            const parts = [`<strong>VT1</strong>`, `${vt1.power} ${tooltipUnit}`]
            if (vt1.heartRate) parts.push(`${vt1.heartRate} bpm`)
            if (vt1.vo2) parts.push(`VO2: ${vt1.vo2} ml/min/kg`)
            return parts.join('<br/>')
          }
        },
        markLine: {
          data: [{
            xAxis: aiExtras.vt1.power,
            lineStyle: { color: '#a855f7', type: 'dashed' as const, width: 2 },
            label: {
              show: true,
              position: 'insideEndTop' as const,
              formatter: `VT1\n{c}${tooltipUnit}`,
              fontSize: 10,
              fontWeight: 'bold' as const,
              color: '#a855f7',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: [2, 4],
              borderRadius: 3
            }
          }]
        }
      }] : []),
      // Method comparison markers (LT1/LT2 from other methods, shown as small diamonds)
      ...(aiExtras?.showMethods && aiExtras?.methods?.length ? aiExtras.methods.flatMap(m => {
        const color = METHOD_COLORS[m.method.toLowerCase().split(' ')[0]] ?? METHOD_COLORS.unknown
        const label = m.method.length > 8 ? m.method.substring(0, 8) : m.method
        const series = []
        if (m.lt1) series.push({
          name: `${label} LT1`,
          type: 'scatter' as const,
          data: [[m.lt1.power, m.lt1.lactate]],
          symbolSize: 14,
          symbol: 'diamond',
          animation: false,
          z: 8,
          itemStyle: { color, borderColor: '#fff', borderWidth: 2, opacity: 0.85 },
          yAxisIndex: 0,
          label: {
            show: true,
            position: 'top' as const,
            formatter: label,
            fontSize: 9,
            color,
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: [1, 3],
            borderRadius: 2
          },
          tooltip: {
            show: true,
            formatter: () => `<strong>${m.method}</strong><br/>LT1: ${m.lt1!.power} ${tooltipUnit}<br/>${m.lt1!.lactate.toFixed(2)} mmol/L`
          },
          markLine: {
            data: [{ xAxis: m.lt1.power, lineStyle: { color, type: 'dotted' as const, width: 1, opacity: 0.6 }, label: { show: false } }]
          }
        })
        if (m.lt2) series.push({
          name: `${label} LT2`,
          type: 'scatter' as const,
          data: [[m.lt2.power, m.lt2.lactate]],
          symbolSize: 14,
          symbol: 'diamond',
          animation: false,
          z: 8,
          itemStyle: { color, borderColor: '#fff', borderWidth: 2, opacity: 0.85 },
          yAxisIndex: 0,
          label: {
            show: true,
            position: 'top' as const,
            formatter: label,
            fontSize: 9,
            color,
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: [1, 3],
            borderRadius: 2
          },
          tooltip: {
            show: true,
            formatter: () => `<strong>${m.method}</strong><br/>LT2: ${m.lt2!.power} ${tooltipUnit}<br/>${m.lt2!.lactate.toFixed(2)} mmol/L`
          },
          markLine: {
            data: [{ xAxis: m.lt2.power, lineStyle: { color, type: 'dotted' as const, width: 1, opacity: 0.6 }, label: { show: false } }]
          }
        })
        return series
      }) : []),
      // VT2 marker
      ...(aiExtras?.vt2 ? [{
        name: 'VT2',
        type: 'scatter' as const,
        data: [[aiExtras.vt2.power, 0]],
        symbolSize: 18,
        animation: false,
        itemStyle: { color: '#ec4899', borderColor: '#fff', borderWidth: 3 },
        yAxisIndex: 0,
        label: {
          show: true,
          position: 'top' as const,
          formatter: 'VT2',
          fontSize: 11,
          fontWeight: 'bold' as const,
          color: '#ec4899',
          backgroundColor: 'rgba(255,255,255,0.8)',
          padding: [2, 4],
          borderRadius: 3
        },
        tooltip: {
          show: true,
          formatter: () => {
            const vt2 = aiExtras!.vt2!
            const parts = [`<strong>VT2</strong>`, `${vt2.power} ${tooltipUnit}`]
            if (vt2.heartRate) parts.push(`${vt2.heartRate} bpm`)
            if (vt2.vo2) parts.push(`VO2: ${vt2.vo2} ml/min/kg`)
            return parts.join('<br/>')
          }
        },
        markLine: {
          data: [{
            xAxis: aiExtras.vt2.power,
            lineStyle: { color: '#ec4899', type: 'dashed' as const, width: 2 },
            label: {
              show: true,
              position: 'insideEndTop' as const,
              formatter: `VT2\n{c}${tooltipUnit}`,
              fontSize: 10,
              fontWeight: 'bold' as const,
              color: '#ec4899',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: [2, 4],
              borderRadius: 3
            }
          }]
        }
      }] : [])
    ]
  }
}
