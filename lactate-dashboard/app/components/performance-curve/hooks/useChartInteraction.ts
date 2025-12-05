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
  setIsAdjusted: (adjusted: boolean) => void
  onSaveAdjustedThresholds: () => Promise<void>
  onSaveAdjustedThresholdsWithValues: (lt1: ThresholdPoint, lt2: ThresholdPoint) => Promise<void>
}

interface UseChartInteractionReturn {
  chartRef: React.RefObject<HTMLDivElement | null>
  isDragging: { type: 'LT1' | 'LT2' | null }
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
  setSelectedMethod,
  setIsAdjusted,
  onSaveAdjustedThresholds,
  onSaveAdjustedThresholdsWithValues
}: UseChartInteractionProps): UseChartInteractionReturn {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)
  const [isDragging, setIsDragging] = useState<{ type: 'LT1' | 'LT2' | null }>({ type: null })
  const currentLt1Ref = useRef<ThresholdPoint | null>(null)
  const currentLt2Ref = useRef<ThresholdPoint | null>(null)
  const selectedMethodRef = useRef<ThresholdMethod>(selectedMethod)
  const lastMouseMoveTime = useRef<number>(0)
  const smoothingBuffer = useRef<{power: number, lactate: number}[]>([])

  // Update refs when values change
  useEffect(() => {
    currentLt1Ref.current = lt1
    currentLt2Ref.current = lt2
    selectedMethodRef.current = selectedMethod
  }, [lt1, lt2, selectedMethod])

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
      
      // Enable brush for dragging thresholds
      chart.on('mousedown', (params: any) => {
        if (params.seriesName === 'LT1' || params.seriesName === 'LT2') {
          console.log('🖱️ Mousedown on', params.seriesName, '- Current values:', { lt1, lt2 })
          
          // Initialize refs with current values at drag start
          if (lt1) {
            currentLt1Ref.current = lt1
            console.log('✅ Initialized currentLt1Ref:', currentLt1Ref.current)
          } else {
            console.warn('⚠️ lt1 is null/undefined at drag start')
          }
          
          if (lt2) {
            currentLt2Ref.current = lt2
            console.log('✅ Initialized currentLt2Ref:', currentLt2Ref.current)
          } else {
            console.warn('⚠️ lt2 is null/undefined at drag start')
          }
          
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
          
          // Update threshold state AND refs immediately
          const newThreshold = { power, lactate }
          if (isDragging.type === 'LT1') {
            setLt1(newThreshold)
            currentLt1Ref.current = newThreshold  // Update ref immediately
          } else if (isDragging.type === 'LT2') {
            setLt2(newThreshold)
            currentLt2Ref.current = newThreshold  // Update ref immediately
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
          setIsDragging({ type: null })
          
          // Nach manuellem Ziehen: Button aktivieren und in DB speichern
          setIsAdjusted(true)
          
          const currentLt1 = currentLt1Ref.current
          const currentLt2 = currentLt2Ref.current
          
          console.log('🎯 MouseUp - Refs:', { currentLt1, currentLt2 })
          
          // Use refs directly to ensure we save the most current values
          // Convert to numbers in case they're strings
          if (currentLt1 && currentLt2) {
            const lt1Power = typeof currentLt1.power === 'string' ? parseFloat(currentLt1.power) : currentLt1.power
            const lt1Lactate = typeof currentLt1.lactate === 'string' ? parseFloat(currentLt1.lactate) : currentLt1.lactate
            const lt2Power = typeof currentLt2.power === 'string' ? parseFloat(currentLt2.power) : currentLt2.power
            const lt2Lactate = typeof currentLt2.lactate === 'string' ? parseFloat(currentLt2.lactate) : currentLt2.lactate
            
            if (typeof lt1Power === 'number' && typeof lt1Lactate === 'number' &&
                typeof lt2Power === 'number' && typeof lt2Lactate === 'number' &&
                !isNaN(lt1Power) && !isNaN(lt1Lactate) && !isNaN(lt2Power) && !isNaN(lt2Lactate)) {
              try {
                const lt1ToSave = { power: lt1Power, lactate: lt1Lactate }
                const lt2ToSave = { power: lt2Power, lactate: lt2Lactate }
                console.log('💾 Saving adjusted thresholds after drag:', { lt1ToSave, lt2ToSave })
                await onSaveAdjustedThresholdsWithValues(lt1ToSave, lt2ToSave)
              } catch (saveError) {
                console.error('❌ Error saving adjusted thresholds:', saveError)
              }
            } else {
              console.warn('⚠️ Cannot save: invalid threshold values after conversion', { 
                lt1Power, lt1Lactate, lt2Power, lt2Lactate 
              })
            }
          } else {
            console.warn('⚠️ Cannot save: refs are null', { currentLt1, currentLt2 })
          }
        } catch (error) {
          console.error('❌ Error in mouseUp handler:', error)
          setIsDragging({ type: null }) // Ensure we reset drag state
        }
      }
      
      // Mouse event handlers
      const handleMouseMove = (event: MouseEvent) => {
        handleMove(event.clientX, event.clientY)
      }
      
      // Touch event handlers for mobile
      const handleTouchMove = (event: TouchEvent) => {
        if (event.touches.length > 0) {
          // Prevent default scrolling while dragging
          event.preventDefault()
          const touch = event.touches[0]
          handleMove(touch.clientX, touch.clientY)
        }
      }
      
      const handleTouchEnd = (event: TouchEvent) => {
        // Prevent default to avoid triggering mouse events
        event.preventDefault()
        handleMouseUp()
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
  }, [isDragging.type, webhookData.length, lt1, lt2, setLt1, setLt2, setTrainingZones, setSelectedMethod, setIsAdjusted, onSaveAdjustedThresholdsWithValues])

  return {
    chartRef,
    isDragging
  }
}
