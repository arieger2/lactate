'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useCustomer } from '@/lib/CustomerContext'
import { getMethodDisplayName, calculateTrainingZones, calculateThresholds } from '@/lib/lactateCalculations'
import { smoothLactateCurve } from '@/lib/lactateCurveSmoother'
import { exportLactateAnalysisToPDF } from '@/lib/pdfExport'
import SessionSelection from './performance-curve/SessionSelection'
import ThresholdMethodSelector from './performance-curve/ThresholdMethodSelector'
import ZoneModelSelector from './performance-curve/ZoneModelSelector'
import LactateCurveView from './performance-curve/LactateCurveView'
import TrainingZonesDescription from './performance-curve/TrainingZonesDescription'
import { useSessionData } from './performance-curve/hooks/useSessionData'
import { useThresholdCalculation } from './performance-curve/hooks/useThresholdCalculation'
import { useManualThresholds } from './performance-curve/hooks/useManualThresholds'
import { useManualZones } from './performance-curve/hooks/useManualZones'
import { useChartInteraction } from './performance-curve/hooks/useChartInteraction'

export default function PerformanceCurveOrchestrator() {
  const { selectedCustomer, selectedSessionId, setSelectedSessionId, dataVersion, refreshData } = useCustomer()
  const wasDraggingRef = useRef(false)
  const [isAILoading, setIsAILoading] = useState(false)
  const [aiCurve, setAiCurve] = useState<Array<{ power: number; lactate: number }> | null>(null)
  const [aiVt1, setAiVt1] = useState<{ power: number; heartRate?: number } | null>(null)
  const [aiVt2, setAiVt2] = useState<{ power: number; heartRate?: number } | null>(null)
  const [aiVo2max, setAiVo2max] = useState<number | null>(null)
  const [aiReasoning, setAiReasoning] = useState<string | null>(null)
  const [aiMethods, setAiMethods] = useState<import('@/lib/types').MethodComparisonResult[] | null>(null)
  const [showMethodComparison, setShowMethodComparison] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  // Cached AI thresholds — survive method switching so switching back to 'adjusted' restores them
  const cachedAiLt1 = useRef<import('@/lib/types').ThresholdPoint | null>(null)
  const cachedAiLt2 = useRef<import('@/lib/types').ThresholdPoint | null>(null)
  const cachedAiZones = useRef<import('@/lib/types').TrainingZone[]>([])
  const popupWindowRef = useRef<Window | null>(null)
  
  // Custom hooks for data and logic
  const {
    availableSessions,
    webhookData,
    loading,
    currentUnit,
    testInfo
  } = useSessionData({
    selectedCustomer,
    selectedSessionId,
    setSelectedSessionId,
    dataVersion
  })

  const {
    lt1,
    lt2,
    trainingZones,
    selectedMethod,
    thresholdMessage,
    showAiAnalysis,
    zoneModel,
    setLt1,
    setLt2,
    setTrainingZones,
    setSelectedMethod,
    setThresholdMessage,
    setShowAiAnalysis,
    setZoneModel,
    calculateThresholdsWrapper
  } = useThresholdCalculation(currentUnit)

  const { loadThresholds, saveThresholds } = useManualThresholds({
    selectedSessionId,
    selectedCustomerId: selectedCustomer?.customer_id || null
  })

  const { loadZones, saveZones } = useManualZones({
    selectedSessionId,
    selectedCustomerId: selectedCustomer?.customer_id || null
  })

  const smoothedCurve = useMemo(
    () => smoothLactateCurve(webhookData)?.smoothedCurve ?? null,
    [webhookData]
  )

  const aiExtras = useMemo(() => ({
    curve:       aiCurve   ?? undefined,
    vt1:         aiVt1     ?? undefined,
    vt2:         aiVt2     ?? undefined,
    vo2max:      aiVo2max  ?? undefined,
    methods:     aiMethods ?? undefined,
    showMethods: showMethodComparison,
  }), [aiCurve, aiVt1, aiVt2, aiVo2max, aiMethods, showMethodComparison])

  const { chartRef, chartInstance, isDragging, zoneBoundaryPositions, onZoneDragStart, onZoneDragEnd } = useChartInteraction({
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
    aiExtras,
    smoothedCurve,
  })

  // Listen for updates from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'STAGES_UPDATED' && event.data?.testId === selectedSessionId) {
        console.log('Received STAGES_UPDATED from popup, refreshing data...')
        refreshData()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [selectedSessionId, refreshData])

  // Close popup when component unmounts
  useEffect(() => {
    return () => {
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close()
      }
    }
  }, [])

  // Open popup for stage input
  const openInputPopup = () => {
    if (!selectedSessionId) return
    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      popupWindowRef.current.focus()
      return
    }
    const width = 1400
    const height = 900
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    popupWindowRef.current = window.open(
      `/stage-input-popup?testId=${selectedSessionId}`,
      'StageInputPopup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )
  }

  // Clear AI cache when session changes
  useEffect(() => {
    cachedAiLt1.current = null
    cachedAiLt2.current = null
    cachedAiZones.current = []
    setAiCurve(null)
    setAiVt1(null)
    setAiVt2(null)
    setAiVo2max(null)
    setAiReasoning(null)
    setAiMethods(null)
    setShowMethodComparison(false)
    setAiError(null)
  }, [selectedSessionId])

  // Calculate thresholds when data loads
  useEffect(() => {
    if (webhookData.length > 0 && selectedMethod !== 'adjusted') {
      calculateThresholdsWrapper(webhookData, selectedMethod, currentUnit, zoneModel)
    }
  }, [webhookData, selectedMethod, currentUnit, zoneModel, calculateThresholdsWrapper])

  // Save on drag end
  useEffect(() => {
    if (isDragging.type) {
      wasDraggingRef.current = true
    } else if (wasDraggingRef.current) {
      wasDraggingRef.current = false
      if (lt1 && lt2 && trainingZones.length > 0) {
        saveThresholds(lt1, lt2)
        saveZones(trainingZones)
      }
    }
  }, [isDragging.type, lt1, lt2, trainingZones, saveThresholds, saveZones])

  // PDF Export
  const exportToPDF = async () => {
    try {
      await exportLactateAnalysisToPDF({
        chartRef,
        selectedCustomer,
        selectedMethod,
        currentUnit,
        webhookData,
        trainingZones,
        lt1,
        lt2,
        getMethodDisplayName
      })
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Fehler beim Exportieren der PDF. Bitte versuchen Sie es erneut.')
    }
  }

  // Handler for AI analysis request
  const handleAiAnalysisRequest = async () => {
    try {
      const analysisData = {
        method: selectedMethod,
        unit: currentUnit,
        testData: webhookData.map(d => ({
          power: d.power,
          lactate: d.lactate,
          heartRate: d.heartRate
        })),
        sessionId: selectedSessionId,
        customerId: selectedCustomer?.customer_id,
        timestamp: new Date().toISOString()
      }

      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
      })

      if (response.ok) {
        const result = await response.json()
        alert(`AI-Analyse gestartet. ${result.message || 'Die Analyse wird im Hintergrund durchgeführt.'}`)
      } else {
        const error = await response.json()
        alert(`Fehler: ${error.message || 'AI-Analyse konnte nicht gestartet werden.'}`)
      }
    } catch (error) {
      alert('Fehler beim Aufruf der AI-Analyse.')
    }
  }

  // Handler for manual threshold loading - loads saved manual adjustments
  const handleManualLoad = async () => {
    const thresholds = await loadThresholds()
    const zones = await loadZones()
    
    if (!thresholds && !zones) return

    setSelectedMethod('adjusted')
    
    if (thresholds) {
      setLt1(thresholds.lt1)
      setLt2(thresholds.lt2)
    }
    
    if (zones) {
      setTrainingZones(zones)
    }
  }

  const handleAIAdjust = async () => {
    if (!webhookData.length) return
    setIsAILoading(true)
    // Clear previous AI results and errors
    setAiCurve(null)
    setAiVt1(null)
    setAiVt2(null)
    setAiVo2max(null)
    setAiReasoning(null)
    setAiError(null)
    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          unit: currentUnit,
          testData: webhookData.map(d => ({
            power: d.power,
            lactate: d.lactate,
            heartRate: d.heartRate,
            vo2: d.vo2,
          })),
          sessionId: selectedSessionId,
          customerId: selectedCustomer?.customer_id,
          customerName: selectedCustomer?.name,
          currentLt1: lt1,
          currentLt2: lt2,
          // Optional ventilatory thresholds — pass through if already set from prior analysis
          vt1:    aiVt1    ?? null,
          vt2:    aiVt2    ?? null,
          vo2max: aiVo2max ?? null,
          zoneModel:  zoneModel,
          stepCount:  webhookData.length,
          testDevice: testInfo?.device ?? 'bike',
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setAiError(result.message || 'AI-Analyse fehlgeschlagen.')
        return
      }

      if (result.lt1 || result.lt2) {
        setSelectedMethod('adjusted')

        // Helper: snap lactate to the visible curve at a given power.
        // Prefers smoothedCurve (what is drawn) over raw webhookData.
        const snapLactateToData = (power: number): number => {
          const curve = smoothedCurve ?? webhookData.map(d => ({ power: d.power, lactate: d.lactate }))
          if (curve.length < 2) return 0
          if (power <= curve[0].power) return curve[0].lactate
          if (power >= curve[curve.length - 1].power) return curve[curve.length - 1].lactate
          for (let i = 0; i < curve.length - 1; i++) {
            if (curve[i].power <= power && curve[i + 1].power >= power) {
              const ratio = (power - curve[i].power) / (curve[i + 1].power - curve[i].power)
              return Math.round((curve[i].lactate + ratio * (curve[i + 1].lactate - curve[i].lactate)) * 100) / 100
            }
          }
          return 0
        }

        // Normalize: ensure power/lactate are numbers; snap lactate to the actual curve
        const normalizeLt = (raw: any) => {
          if (!raw) return null
          const power = Math.round(Number(raw.power) * 100) / 100
          return { power, lactate: snapLactateToData(power) }
        }

        const newLt1 = result.lt1 ? normalizeLt(result.lt1) : null
        const newLt2 = result.lt2 ? normalizeLt(result.lt2) : null

        if (newLt1) { setLt1(newLt1); cachedAiLt1.current = newLt1 }
        if (newLt2) { setLt2(newLt2); cachedAiLt2.current = newLt2 }

        // Zones: use n8n result if present, otherwise recalculate from new thresholds
        if (result.zones && result.zones.length > 0) {
          setTrainingZones(result.zones)
          cachedAiZones.current = result.zones
        } else if (newLt1 && newLt2) {
          const maxPower = Math.max(...webhookData.map(d => d.power))
          const zones = calculateTrainingZones(newLt1, newLt2, maxPower, 'adjusted', currentUnit, zoneModel)
          if (zones) { setTrainingZones(zones); cachedAiZones.current = zones }
        }

        if (result.curve)      setAiCurve(result.curve)
        if (result.vt1)        setAiVt1(result.vt1)
        if (result.vt2)        setAiVt2(result.vt2)
        if (result.vo2max != null) setAiVo2max(result.vo2max)
        if (result.reasoning)  setAiReasoning(result.reasoning)

        // Compute method comparison using the dashboard's own implementations —
        // not the AI's estimates — so the values match the method buttons exactly.
        const compMethods: import('@/lib/types').MethodComparisonResult[] = (
          ['dickhuth', 'dmax', 'mader', 'moddmax'] as const
        ).map(m => {
          const r = calculateThresholds(webhookData, m)
          return {
            method: getMethodDisplayName(m),
            lt1: r.lt1 ? normalizeLt(r.lt1) : null,
            lt2: r.lt2 ? normalizeLt(r.lt2) : null,
            confidence: 1,
          }
        })
        setAiMethods(compMethods)
      } else {
        setAiReasoning(result.reasoning ?? null)
      }
    } catch (error) {
      setAiError('Verbindungsfehler bei der AI-Analyse.')
      console.error('handleAIAdjust error:', error)
    } finally {
      setIsAILoading(false)
    }
  }

  // Render
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
              {currentUnit && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                  {currentUnit === 'watt' ? '🚴 Power (W)' : currentUnit === 'kmh' ? '🏃 Speed (km/h)' : currentUnit}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={exportToPDF}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            PDF Export
          </button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1.1 Session Selection */}
          <SessionSelection
            availableSessions={availableSessions}
            selectedSessionId={selectedSessionId}
            onSessionChange={setSelectedSessionId}
          />

          {/* 1.2 Schwellenmethoden */}
          <ThresholdMethodSelector
            selectedMethod={selectedMethod}
            onMethodChange={(method) => {
              setSelectedMethod(method)
              if (method === 'adjusted' && cachedAiLt1.current && cachedAiLt2.current) {
                // Restore cached AI thresholds — no recalculation needed
                setLt1(cachedAiLt1.current)
                setLt2(cachedAiLt2.current)
                if (cachedAiZones.current.length > 0) setTrainingZones(cachedAiZones.current)
              } else {
                calculateThresholdsWrapper(webhookData, method, currentUnit, zoneModel)
              }
            }}
            onManualLoad={handleManualLoad}
            onAIAdjust={handleAIAdjust}
            isAILoading={isAILoading}
          />
        </div>

        {/* 1.3 Zone Model Selection */}
        <div className="mt-4">
          <ZoneModelSelector
            selectedZoneModel={zoneModel}
            onZoneModelChange={(model) => {
              setZoneModel(model)
              calculateThresholdsWrapper(webhookData, selectedMethod, currentUnit, model)
            }}
          />
        </div>
      </div>

      {/* 1.4 Laktat Kurve View */}
      <LactateCurveView

        chartRef={chartRef}
        chartInstance={chartInstance}
        isDragging={isDragging.type !== null}
        loading={loading}
        webhookData={webhookData}
        lt1={lt1}
        lt2={lt2}
        thresholdMessage={thresholdMessage}
        showAiAnalysis={showAiAnalysis}
        selectedSessionId={selectedSessionId}
        selectedCustomer={selectedCustomer}
        currentUnit={currentUnit}
        onAiAnalysisRequest={handleAiAnalysisRequest}
        onOpenInputPopup={openInputPopup}
        zoneBoundaryPositions={zoneBoundaryPositions}
        trainingZones={trainingZones}
        onZoneBoundaryDrag={(zoneId, newPower) => {
          const currentZones = [...trainingZones]
          const lastZoneId = currentZones[currentZones.length - 1]?.id

          // Left outer edge: id 0 -> adjust start of first zone only
          if (zoneId === 0) {
            if (currentZones.length > 0) {
              // Ensure it doesn't exceed the end of first zone
              const maxValue = currentZones[0].range[1] - 1
              currentZones[0].range[0] = Math.min(newPower, maxValue)
              setTrainingZones(currentZones)
              setSelectedMethod('adjusted')
            }
            return
          }

          // Right outer edge: id lastZoneId + 1 -> adjust end of last zone only
          if (typeof lastZoneId === 'number' && zoneId === lastZoneId + 1) {
            const lastIndex = currentZones.length - 1
            if (lastIndex >= 0) {
              // Ensure it doesn't go below the start of last zone
              const minValue = currentZones[lastIndex].range[0] + 1
              currentZones[lastIndex].range[1] = Math.max(newPower, minValue)
              setTrainingZones(currentZones)
              setSelectedMethod('adjusted')
            }
            return
          }

          // Internal boundaries: adjust adjacent zones
          const zoneIndex = currentZones.findIndex(z => z.id === zoneId)
          const prevZoneIndex = currentZones.findIndex(z => z.id === zoneId - 1)

          if (zoneIndex >= 0 && prevZoneIndex >= 0) {
            // Get constraints from surrounding zones
            const minPower = currentZones[prevZoneIndex].range[0] + 1
            const maxPower = currentZones[zoneIndex].range[1] - 1
            
            // Clamp the new power value between constraints
            const clampedPower = Math.max(minPower, Math.min(newPower, maxPower))
            
            // Update both adjacent zones with the clamped value
            currentZones[prevZoneIndex].range[1] = clampedPower
            currentZones[zoneIndex].range[0] = clampedPower
            setTrainingZones(currentZones)
            setSelectedMethod('adjusted')
          }
        }}
        onZoneDragStart={onZoneDragStart}
        onZoneDragEnd={onZoneDragEnd}
        aiVt1={aiVt1}
        aiVt2={aiVt2}
        aiVo2max={aiVo2max}
        aiReasoning={aiReasoning}
        aiMethods={aiMethods}
        showMethodComparison={showMethodComparison}
        onToggleMethodComparison={() => setShowMethodComparison(v => !v)}
        aiError={aiError}
        onDismissAiError={() => setAiError(null)}
      />

      {/* 1.5 Training Zones Description (dynamisch basierend auf Zonenmodell) */}
      <TrainingZonesDescription trainingZones={trainingZones} unit={currentUnit} />
    </div>
  )
}