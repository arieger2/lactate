'use client'

import { useEffect, useRef } from 'react'
import { useCustomer } from '@/lib/CustomerContext'
import { getMethodDisplayName } from '@/lib/lactateCalculations'
import { exportLactateAnalysisToPDF } from '@/lib/pdfExport'
import SessionSelection from './performance-curve/SessionSelection'
import ThresholdMethodSelector from './performance-curve/ThresholdMethodSelector'
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
  const popupWindowRef = useRef<Window | null>(null)
  
  // Custom hooks for data and logic
  const { 
    availableSessions, 
    webhookData, 
    loading, 
    currentUnit 
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
    setLt1,
    setLt2,
    setTrainingZones,
    setSelectedMethod,
    setThresholdMessage,
    setShowAiAnalysis,
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
    setSelectedMethod
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

  // Calculate thresholds when data loads
  useEffect(() => {
    if (webhookData.length > 0 && selectedMethod !== 'adjusted') {
      calculateThresholdsWrapper(webhookData, selectedMethod, currentUnit)
    }
  }, [webhookData, selectedMethod, currentUnit, calculateThresholdsWrapper])

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
              calculateThresholdsWrapper(webhookData, method, currentUnit)
            }}
            onManualLoad={handleManualLoad}
          />
        </div>
      </div>

      {/* 1.3 Laktat Kurve View */}
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
              currentZones[0].range[0] = newPower
              setTrainingZones(currentZones)
              setSelectedMethod('adjusted')
            }
            return
          }

          // Right outer edge: id lastZoneId + 1 -> adjust end of last zone only
          if (typeof lastZoneId === 'number' && zoneId === lastZoneId + 1) {
            const lastIndex = currentZones.length - 1
            if (lastIndex >= 0) {
              currentZones[lastIndex].range[1] = newPower
              setTrainingZones(currentZones)
              setSelectedMethod('adjusted')
            }
            return
          }

          // Internal boundaries: adjust adjacent zones
          const zoneIndex = currentZones.findIndex(z => z.id === zoneId)
          const prevZoneIndex = currentZones.findIndex(z => z.id === zoneId - 1)

          if (zoneIndex >= 0 && prevZoneIndex >= 0) {
            currentZones[prevZoneIndex].range[1] = newPower
            currentZones[zoneIndex].range[0] = newPower
            setTrainingZones(currentZones)
            setSelectedMethod('adjusted')
          }
        }}
        onZoneDragStart={onZoneDragStart}
        onZoneDragEnd={onZoneDragEnd}
      
      />

      {/* 1.4 Training Zones Description (5-Zonen Trainingssystem) */}
      <TrainingZonesDescription trainingZones={trainingZones} unit={currentUnit} />
    </div>
  )
}