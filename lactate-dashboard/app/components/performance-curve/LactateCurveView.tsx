'use client'

import { useRef } from 'react'
import { ThresholdPoint, TrainingZone } from '@/lib/types'
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
  zoneBoundaryPositions?: {id: number, x: number, y: number}[]
  trainingZones?: TrainingZone[]
  onZoneBoundaryDrag?: (zoneId: number, newPower: number) => void
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
  zoneBoundaryPositions = [],
  trainingZones = [],
  onZoneBoundaryDrag
}: LactateCurveViewProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  
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
        {onZoneBoundaryDrag && (
          <ZoneBoundaryMarkers
            chartInstance={chartInstance}
            chartRef={chartRef}
            zoneBoundaryPositions={zoneBoundaryPositions}
            trainingZones={trainingZones}
            onZoneBoundaryDrag={onZoneBoundaryDrag}
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
              {lt1?.power}W @ {(typeof lt1?.lactate === 'number' ? lt1.lactate.toFixed(2) : parseFloat(lt1?.lactate || '0').toFixed(2))} mmol/L
            </p>
          </div>
        )}
        {lt2 && (
          <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200">
              LT2 (Anaerobe Schwelle - OBLA)
            </h3>
            <p className="text-orange-700 dark:text-orange-300">
              {lt2?.power}W @ {(typeof lt2?.lactate === 'number' ? lt2.lactate.toFixed(2) : parseFloat(lt2?.lactate || '0').toFixed(2))} mmol/L
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
    </div>
  )
}
