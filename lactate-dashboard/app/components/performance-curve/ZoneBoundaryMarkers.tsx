'use client'

import { useState, useEffect } from 'react'
import * as echarts from 'echarts'
import { TrainingZone } from '@/lib/types'

interface ZoneBoundaryMarkersProps {
  chartInstance: echarts.ECharts | null
  chartRef: React.RefObject<HTMLDivElement | null>
  zoneBoundaryPositions: {id: number, x: number, y: number}[]
  trainingZones: TrainingZone[]
  onZoneBoundaryDrag: (zoneId: number, newPower: number) => void
  onZoneDragStart?: (zoneId: number) => void
  onZoneDragEnd?: () => void
}

export default function ZoneBoundaryMarkers({
  chartInstance,
  chartRef,
  zoneBoundaryPositions: positions, // Renamed for clarity
  onZoneBoundaryDrag,
  onZoneDragStart,
  onZoneDragEnd
}: ZoneBoundaryMarkersProps) {
  const [dragState, setDragState] = useState<{zoneId: number, startX: number} | null>(null)

  useEffect(() => {
    if (!dragState || !chartInstance || !chartRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX > 0 && chartRef.current) {
        const chartDOM = chartInstance.getDom()
        if (!chartDOM) return
        
        const rect = chartDOM.getBoundingClientRect()
        const pixelX = e.clientX - rect.left
        
        if (pixelX < 0 || pixelX > rect.width) return
        
        const dataPoint = chartInstance.convertFromPixel('grid', [pixelX, 0])
        if (dataPoint && Array.isArray(dataPoint)) {
          onZoneBoundaryDrag(dragState.zoneId, Math.round(dataPoint[0] * 10) / 10)
        }
      }
    }

    const handleMouseUp = () => {
      setDragState(null)
      if (onZoneDragEnd) onZoneDragEnd()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, chartInstance, onZoneBoundaryDrag, onZoneDragEnd, chartRef])

  return (
    <>
      {positions.map(({id, x, y}) => (
        <div
          key={id}
          onMouseDown={(e) => {
            e.preventDefault()
            setDragState({zoneId: id, startX: e.clientX})
            if (onZoneDragStart) onZoneDragStart(id)
          }}
          style={{
            position: 'absolute',
            left: `${x - 6}px`, // Center the marker
            top: `${y - 15}px`, // Center the marker
            width: '12px',
            height: '30px',
            backgroundColor: '#000',
            cursor: 'ew-resize',
            zIndex: 1000,
            opacity: 0.7,
            border: '1px solid #fff',
            userSelect: 'none',
            borderRadius: '3px'
          }}
        />
      ))}
    </>
  )
}
