'use client'

import { useRef } from 'react'
import { MethodComparisonResult, ThresholdPoint, TrainingZone } from '@/lib/types'
import ZoneBoundaryMarkers from './ZoneBoundaryMarkers'

import * as echarts from 'echarts'

interface LactateCurveViewProps {
  chartRef: React.RefObject<HTMLDivElement | null>
  chartInstance: echarts.ECharts | null
  isDragging: boolean
  loading: boolean
  webhookData: any[]
  lt1: ThresholdPoint | null
  lt2: ThresholdPoint | null
  thresholdMessage: string | null
  showAiAnalysis: boolean
  selectedSessionId: string | null
  selectedCustomer: any
  currentUnit: string
  onAiAnalysisRequest: () => Promise<void>
  onOpenInputPopup?: () => void
  zoneBoundaryPositions?: {id: number, x: number, y: number}[]
  trainingZones?: TrainingZone[]
  onZoneBoundaryDrag?: (zoneId: number, newPower: number) => void
  onZoneDragStart?: (zoneId: number) => void
  onZoneDragEnd?: () => void
  // AI analysis results
  aiVt1?: { power: number; heartRate?: number; vo2?: number } | null
  aiVt2?: { power: number; heartRate?: number; vo2?: number } | null
  aiVo2max?: number | null
  aiReasoning?: string | null
  aiMethods?: MethodComparisonResult[] | null
  showMethodComparison?: boolean
  onToggleMethodComparison?: () => void
  aiError?: string | null
  onDismissAiError?: () => void
}

export default function LactateCurveView({
  chartRef,
  chartInstance,
  isDragging,
  loading,
  webhookData,
  lt1,
  lt2,
  thresholdMessage,
  showAiAnalysis,
  selectedSessionId,
  selectedCustomer,
  currentUnit,
  onAiAnalysisRequest,
  onOpenInputPopup,
  zoneBoundaryPositions,
  trainingZones,
  onZoneBoundaryDrag,
  onZoneDragStart,
  onZoneDragEnd,
  aiVt1,
  aiVt2,
  aiVo2max,
  aiReasoning,
  aiMethods,
  showMethodComparison,
  onToggleMethodComparison,
  aiError,
  onDismissAiError,
}: LactateCurveViewProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // Convert unit string to display format
  const unitLabel = currentUnit === 'watt' ? 'W' : currentUnit === 'kmh' ? 'km/h' : currentUnit
  
  if (webhookData.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Lade Daten...</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-zinc-600 dark:text-zinc-400">
              Keine Daten verfügbar. Bitte wählen Sie eine Session aus.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <div ref={chartContainerRef} style={{ position: 'relative' }}>
        {/* eslint-disable-next-line react/forbid-dom-props */}
        <div 
          ref={chartRef} 
          style={{ 
            height: '650px', 
            width: '100%',
            cursor: isDragging ? 'grabbing' : 'default',
            transition: 'cursor 0.1s ease',
            margin: '20px 0'
          }}
        />
        
        {/* Zone Boundary Markers */}
        {onZoneBoundaryDrag && zoneBoundaryPositions && trainingZones && (
          <ZoneBoundaryMarkers
            chartInstance={chartInstance}
            chartRef={chartRef}
            zoneBoundaryPositions={zoneBoundaryPositions}
            trainingZones={trainingZones}
            onZoneBoundaryDrag={onZoneBoundaryDrag}
            onZoneDragStart={onZoneDragStart}
            onZoneDragEnd={onZoneDragEnd}
          />
        )}
      </div>
      {/* Threshold Info */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        {lt1 && (
          <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              LT1 (Aerobe Schwelle)
            </h3>
            <p className="text-green-700 dark:text-green-300">
              {lt1?.power}{unitLabel} @ {(typeof lt1?.lactate === 'number' ? lt1.lactate.toFixed(2) : parseFloat(lt1?.lactate || '0').toFixed(2))} mmol/L
            </p>
          </div>
        )}
        {lt2 && (
          <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200">
              LT2 (Anaerobe Schwelle)
            </h3>
            <p className="text-orange-700 dark:text-orange-300">
              {lt2?.power}{unitLabel} @ {(typeof lt2?.lactate === 'number' ? lt2.lactate.toFixed(2) : parseFloat(lt2?.lactate || '0').toFixed(2))} mmol/L
            </p>
          </div>
        )}
      </div>

      {/* Warning Message and AI Analysis Button */}
      {thresholdMessage && showAiAnalysis && (
        <div className="mt-6 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-400 dark:border-yellow-600">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Schwellenberechnung nicht möglich
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                {thresholdMessage}
              </p>
              <button
                type="button"
                onClick={onAiAnalysisRequest}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI-Analyse anfordern
              </button>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                Die KI wird die Testdaten analysieren und alternative Schwellenwerte vorschlagen.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Method Comparison Toggle */}
      {aiMethods && aiMethods.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMethodComparison}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              showMethodComparison
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {showMethodComparison ? '◆ Methoden ausblenden' : '◇ Methoden einblenden'}
          </button>
          {showMethodComparison && (
            <div className="flex flex-wrap gap-2">
              {aiMethods.map(m => (
                <span key={m.method} className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  ◆ {m.method}: LT1 {m.lt1?.power ?? '–'} / LT2 {m.lt2?.power ?? '–'} {unitLabel}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Error */}
      {aiError && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">AI-Analyse Fehler</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{aiError}</p>
          </div>
          {onDismissAiError && (
            <button type="button" onClick={onDismissAiError} title="Fehler schließen" className="text-red-500 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* AI Analysis Results */}
      {(aiVt1 || aiVt2 || aiVo2max != null || aiReasoning) && (
        <div className="mt-6 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-300 dark:border-purple-700">
          <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">AI-Analyse Ergebnis</h3>

          {/* VT1 / VT2 / VO2max info cards */}
          {(aiVt1 || aiVt2 || aiVo2max != null) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {aiVt1 && (
                <div className="p-3 bg-purple-100 dark:bg-purple-800/30 rounded-lg">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-1">VT1</p>
                  <p className="text-purple-900 dark:text-purple-100 font-medium">
                    {aiVt1.power} {unitLabel}
                  </p>
                  {aiVt1.heartRate && <p className="text-sm text-purple-700 dark:text-purple-300">{aiVt1.heartRate} bpm</p>}
                  {aiVt1.vo2 && <p className="text-sm text-purple-700 dark:text-purple-300">VO2: {aiVt1.vo2} ml/min/kg</p>}
                </div>
              )}
              {aiVt2 && (
                <div className="p-3 bg-pink-100 dark:bg-pink-800/30 rounded-lg">
                  <p className="text-xs font-semibold text-pink-700 dark:text-pink-300 uppercase tracking-wide mb-1">VT2</p>
                  <p className="text-pink-900 dark:text-pink-100 font-medium">
                    {aiVt2.power} {unitLabel}
                  </p>
                  {aiVt2.heartRate && <p className="text-sm text-pink-700 dark:text-pink-300">{aiVt2.heartRate} bpm</p>}
                  {aiVt2.vo2 && <p className="text-sm text-pink-700 dark:text-pink-300">VO2: {aiVt2.vo2} ml/min/kg</p>}
                </div>
              )}
              {aiVo2max != null && (
                <div className="p-3 bg-indigo-100 dark:bg-indigo-800/30 rounded-lg">
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-1">VO2max</p>
                  <p className="text-indigo-900 dark:text-indigo-100 font-medium">{aiVo2max} ml/min/kg</p>
                </div>
              )}
            </div>
          )}


          {/* Reasoning */}
          {aiReasoning && (
            <div className="mt-2 text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap leading-relaxed">
              {aiReasoning}
            </div>
          )}
        </div>
      )}

      {/* Button to open stage input popup */}
      {onOpenInputPopup && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onOpenInputPopup}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            📝 Daten in separatem Fenster ändern
          </button>
        </div>
      )}
    </div>
  )
}
