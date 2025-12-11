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

    const handleMove = (clientX: number) => {
      if (clientX > 0 && chartRef.current) {
        const chartDOM = chartInstance.getDom()
        if (!chartDOM) return
        
        const rect = chartDOM.getBoundingClientRect()
        const pixelX = clientX - rect.left
        
        if (pixelX < 0 || pixelX > rect.width) return
        
        const dataPoint = chartInstance.convertFromPixel('grid', [pixelX, 0])
        if (dataPoint && Array.isArray(dataPoint)) {
          onZoneBoundaryDrag(dragState.zoneId, Math.round(dataPoint[0] * 10) / 10)
        }
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        handleMove(e.touches[0].clientX)
      }
    }

    const handleEnd = () => {
      setDragState(null)
      if (onZoneDragEnd) onZoneDragEnd()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
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
          onTouchStart={(e) => {
            e.preventDefault()
            if (e.touches.length > 0) {
              setDragState({zoneId: id, startX: e.touches[0].clientX})
              if (onZoneDragStart) onZoneDragStart(id)
            }
          }}
          style={{
            position: 'absolute',
            left: `${x - 8}px`, // Center the marker
            top: `${y - 8}px`, // Center the marker
            width: '16px',
            height: '16px',
            backgroundColor: '#000',
            cursor: 'ew-resize',
            zIndex: 1000,
            opacity: 0.7,
            border: '1px solid #fff',
            userSelect: 'none',
            borderRadius: '3px',
            touchAction: 'none'
          }}
        />
      ))}
    </>
  )
}
