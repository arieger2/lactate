'use client'

import { useEffect, useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useCustomer } from '@/lib/CustomerContext'
import { getMethodDisplayName } from '@/lib/lactateCalculations'
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
  const { selectedCustomer, selectedSessionId, setSelectedSessionId } = useCustomer()
  const wasDraggingRef = useRef(false)
  
  // Custom hooks for data and logic
  const { 
    availableSessions, 
    webhookData, 
    loading, 
    currentUnit 
  } = useSessionData({ 
    selectedCustomer, 
    selectedSessionId, 
    setSelectedSessionId 
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

  const { chartRef, chartInstance, isDragging, zoneBoundaryPositions } = useChartInteraction({
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

  // Calculate thresholds when data loads
  useEffect(() => {
    if (webhookData.length > 0 && selectedMethod !== 'adjusted') {
      calculateThresholdsWrapper(webhookData, selectedMethod, currentUnit)
    }
  }, [webhookData, selectedMethod, currentUnit, calculateThresholdsWrapper])

  // Save on drag end - detects when dragging stops
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
    if (!chartRef.current) return
    
    try {
      const canvas = await html2canvas(chartRef.current)
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const imgWidth = 280
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
      pdf.save(`lactate-analysis-${selectedCustomer?.name || 'unknown'}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
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

      console.log('🤖 Sending data to AI analysis webhook:', analysisData)

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
      console.error('Error triggering AI analysis:', error)
      alert('Fehler beim Aufruf der AI-Analyse.')
    }
  }

  // Handler for manual threshold loading - loads saved manual adjustments
  const handleManualLoad = async () => {
    const thresholds = await loadThresholds()
    const zones = await loadZones()
    
    if (!thresholds && !zones) {
      console.warn('No manual adjustments found')
      return
    }

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
        zoneBoundaryPositions={zoneBoundaryPositions}
        trainingZones={trainingZones}
        onZoneBoundaryDrag={(zoneId, newPower) => {
          const currentZones = [...trainingZones]
          const zoneIndex = currentZones.findIndex(z => z.id === zoneId)
          const prevZoneIndex = currentZones.findIndex(z => z.id === zoneId - 1)
          
          if (zoneIndex >= 0 && prevZoneIndex >= 0) {
            currentZones[prevZoneIndex].range[1] = newPower
            currentZones[zoneIndex].range[0] = newPower
            setTrainingZones(currentZones)
            setSelectedMethod('adjusted')
          }
        }}
      />

      {/* 1.4 Training Zones Description (5-Zonen Trainingssystem) */}
      <TrainingZonesDescription trainingZones={trainingZones} />
    </div>
  )
}