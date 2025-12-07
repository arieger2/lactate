import { useRef, useEffect, useState } from 'react'
import * as echarts from 'echarts'
import { LactateDataPoint, ThresholdPoint, TrainingZone } from '@/lib/types'
import { createLactateChartOptions } from '@/lib/lactateChartOptions'
import { calculateTrainingZones, ThresholdMethod } from '@/lib/lactateCalculations'

interface UseChartInteractionProps {
  webhookData: LactateDataPoint[]
  trainingZones: TrainingZone[]
  lt1: ThresholdPoint | null
  lt2: ThresholdPoint | null
  currentUnit: string
  selectedMethod: ThresholdMethod
  setLt1: (threshold: ThresholdPoint | null) => void
  setLt2: (threshold: ThresholdPoint | null) => void
  setTrainingZones: (zones: TrainingZone[]) => void
  setSelectedMethod: (method: ThresholdMethod) => void
}

interface UseChartInteractionReturn {
  chartRef: React.RefObject<HTMLDivElement | null>
  chartInstance: echarts.ECharts | null
  isDragging: { type: 'LT1' | 'LT2' | 'ZONE' | null; zoneId?: number }
  zoneBoundaryPositions: {id: number, x: number, y: number}[]
}

export function useChartInteraction({
  webhookData,
  trainingZones,
  lt1,
  lt2,
  currentUnit,
  selectedMethod,
  setLt1,
  setLt2,
  setTrainingZones,
  setSelectedMethod
}: UseChartInteractionProps): UseChartInteractionReturn {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const [isDragging, setIsDragging] = useState<{ type: 'LT1' | 'LT2' | 'ZONE' | null; zoneId?: number }>({ type: null })
  const currentLt1Ref = useRef<ThresholdPoint | null>(null)
  const currentLt2Ref = useRef<ThresholdPoint | null>(null)
  const currentZonesRef = useRef<TrainingZone[]>([])
  const selectedMethodRef = useRef<ThresholdMethod>(selectedMethod)
  const lastMouseMoveTime = useRef<number>(0)
  const smoothingBuffer = useRef<{power: number, lactate: number}[]>([])
  const [zoneBoundaryPositions, setZoneBoundaryPositions] = useState<{id: number, x: number, y: number}[]>([])

  // Update refs when values change
  useEffect(() => {
    currentLt1Ref.current = lt1
    currentLt2Ref.current = lt2
    currentZonesRef.current = trainingZones
    selectedMethodRef.current = selectedMethod
  }, [lt1, lt2, trainingZones, selectedMethod])

  // Chart initialization
  useEffect(() => {
    if (chartRef.current && webhookData.length > 0 && trainingZones.length > 0) {
      // Initialize chart if not exists
      if (!chartInstanceRef.current) {
        chartInstanceRef.current = echarts.init(chartRef.current)
      }

      // Generate chart options using extracted function
      const options = createLactateChartOptions(
        webhookData,
        trainingZones,
        lt1,
        lt2,
        isDragging.type !== null,
        currentUnit
      )

      chartInstanceRef.current.setOption(options, true)
      
      // Calculate pixel positions for zone boundaries
      if (trainingZones.length > 1) {
        // Get x-axis Y position (bottom of chart grid)
        const xAxisPixel = chartInstanceRef.current!.convertToPixel('grid', [0, 0])
        const yPosition = Array.isArray(xAxisPixel) ? xAxisPixel[1] : 0
        
        const positions = trainingZones.slice(1).map(zone => {
          const pixelPoint = chartInstanceRef.current!.convertToPixel('grid', [zone.range[0], 0])
          return { 
            id: zone.id, 
            x: Array.isArray(pixelPoint) ? pixelPoint[0] : 0,
            y: yPosition
          }
        })
        setZoneBoundaryPositions(positions)
      }
    }
  }, [webhookData, trainingZones, lt1, lt2, isDragging, currentUnit])

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

  // Chart interaction (drag & drop)
  useEffect(() => {
    if (chartInstanceRef.current && webhookData.length > 0) {
      const chart = chartInstanceRef.current
      
      // Enable brush for dragging thresholds and zone boundaries
      chart.on('mousedown', (params: any) => {
        // Handle LT threshold dragging
        if (params.seriesName === 'LT1' || params.seriesName === 'LT2') {
          if (lt1) currentLt1Ref.current = lt1
          if (lt2) currentLt2Ref.current = lt2
          
          setIsDragging({ type: params.seriesName as 'LT1' | 'LT2' })
          smoothingBuffer.current = []
          lastMouseMoveTime.current = 0
          
          if (selectedMethod !== 'adjusted') {
            setSelectedMethod('adjusted')
          }
        }
      })

      // Unified handler for mouse and touch move
      const handleMove = (clientX: number, clientY: number) => {
        if (!isDragging.type || !chart) return
        
        // Throttle moves for optimal smoothness (max 120fps for ultra-responsive feel)
        const now = Date.now()
        if (now - lastMouseMoveTime.current < 8) return // 8ms = ~120fps
        lastMouseMoveTime.current = now
        
        try {
          const dom = chart.getDom()
          if (!dom) return
          
          const rect = dom.getBoundingClientRect()
          const x = clientX - rect.left
          const y = clientY - rect.top
          
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
          
          // Handle LT threshold dragging
          if (isDragging.type === 'LT1' || isDragging.type === 'LT2') {
            const newThreshold = { power, lactate }
            if (isDragging.type === 'LT1') {
              setLt1(newThreshold)
              currentLt1Ref.current = newThreshold
            } else if (isDragging.type === 'LT2') {
              setLt2(newThreshold)
              currentLt2Ref.current = newThreshold
            }
            
            // Recalculate training zones using current refs
            if (webhookData.length > 0) {
              const maxPower = Math.max(...webhookData.map(d => d.power), 400)
              const currentLt1 = currentLt1Ref.current
              const currentLt2 = currentLt2Ref.current
              const newLt1 = isDragging.type === 'LT1' ? { power, lactate } : currentLt1
              const newLt2 = isDragging.type === 'LT2' ? { power, lactate } : currentLt2
              
              if (newLt1 && newLt2 && newLt1.power && newLt1.lactate && newLt2.power && newLt2.lactate) {
                const zones = calculateTrainingZones(newLt1, newLt2, maxPower, selectedMethodRef.current)
                if (zones) {
                  setTrainingZones(zones)
                }
              }
            }
          }
          // Handle zone boundary dragging
          else if (isDragging.type === 'ZONE' && isDragging.zoneId !== undefined) {
            const zoneId = isDragging.zoneId
            const currentZones = [...currentZonesRef.current]
            
            // Find the zone being dragged (it's the start of this zone)
            const zoneIndex = currentZones.findIndex(z => z.id === zoneId)
            const prevZoneIndex = currentZones.findIndex(z => z.id === zoneId - 1)
            
            if (zoneIndex >= 0 && prevZoneIndex >= 0) {
              // Update both zones: end of previous zone and start of current zone
              currentZones[prevZoneIndex].range[1] = power
              currentZones[zoneIndex].range[0] = power
              
              setTrainingZones(currentZones)
              currentZonesRef.current = currentZones
            }
          }
          
        } catch (error) {
          console.warn('⚠️ Error during drag conversion:', error)
        }
      }

      // Handle mouse up
      const handleMouseUp = async () => {
        if (!isDragging.type) return
        
        setIsDragging({ type: null })
      }
      
      // Mouse event handlers
      const handleMouseMove = (event: MouseEvent) => {
        handleMove(event.clientX, event.clientY)
      }
      
      // Touch event handlers for mobile
      const handleTouchMove = (event: TouchEvent) => {
        // Only prevent default if we're actually dragging
        if (isDragging.type && event.touches.length > 0) {
          event.preventDefault()
          const touch = event.touches[0]
          handleMove(touch.clientX, touch.clientY)
        }
      }
      
      const handleTouchEnd = (event: TouchEvent) => {
        // Only prevent default if we were dragging
        if (isDragging.type) {
          event.preventDefault()
          handleMouseUp()
        }
      }
      
      // Add both mouse and touch event listeners
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      document.addEventListener('touchcancel', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
        document.removeEventListener('touchcancel', handleTouchEnd)
      }
    }
  }, [isDragging.type, webhookData.length, lt1, lt2, setLt1, setLt2, setTrainingZones, setSelectedMethod])

  return {
    chartRef,
    chartInstance: chartInstanceRef.current,
    isDragging,
    zoneBoundaryPositions
  }
}
