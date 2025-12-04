'use client'

import { useEffect } from 'react'
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
import { useThresholdPersistence } from './performance-curve/hooks/useThresholdPersistence'
import { useChartInteraction } from './performance-curve/hooks/useChartInteraction'

export default function PerformanceCurveOrchestrator() {
  const { selectedCustomer, selectedSessionId, setSelectedSessionId } = useCustomer()
  
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

  const {
    isAdjusted,
    isManuallyLoading,
    setIsAdjusted,
    setIsManuallyLoading,
    saveAdjustedThresholds,
    saveAdjustedThresholdsWithValues,
    loadAdjustedThresholds
  } = useThresholdPersistence({
    selectedSessionId,
    selectedCustomer,
    webhookData,
    lt1,
    lt2,
    selectedMethod,
    setLt1,
    setLt2,
    setTrainingZones,
    setSelectedMethod,
    calculateThresholdsWrapper
  })

  const { chartRef, isDragging } = useChartInteraction({
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
    onSaveAdjustedThresholds: saveAdjustedThresholds
  })

  // Calculate thresholds when data loads
  useEffect(() => {
    if (webhookData.length > 0 && selectedMethod !== 'adjusted') {
      calculateThresholdsWrapper(
        webhookData, 
        selectedMethod, 
        currentUnit, 
        saveAdjustedThresholdsWithValues
      )
    }
  }, [webhookData, selectedMethod, currentUnit, calculateThresholdsWrapper, saveAdjustedThresholdsWithValues])

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

  // Handler for manual threshold loading
  const handleManualLoad = async () => {
    console.log('🔧 Manual button clicked - loading adjusted thresholds...')
    console.log('Session:', selectedSessionId, 'Customer:', selectedCustomer?.customer_id)
    
    setIsManuallyLoading(true)
    setSelectedMethod('adjusted')
    
    setLt1(null)
    setLt2(null)
    setTrainingZones([])
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const loaded = await loadAdjustedThresholds()
    console.log('🔧 Manual loading result:', loaded)
    
    if (!loaded) {
      console.warn('⚠️ No adjusted thresholds found - switching back to DMAX')
      setSelectedMethod('dmax')
      calculateThresholdsWrapper(webhookData, 'dmax', currentUnit, saveAdjustedThresholdsWithValues)
    }
    
    setIsManuallyLoading(false)
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
            isAdjusted={isAdjusted}
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
      />

      {/* 1.4 Training Zones Description (5-Zonen Trainingssystem) */}
      <TrainingZonesDescription trainingZones={trainingZones} />
    </div>
  )
}