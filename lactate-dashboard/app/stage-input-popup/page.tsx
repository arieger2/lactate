'use client'

import { useState, useEffect, useRef } from 'react'
import FastStageInput from '../components/lactate-input/FastStageInput'
import StageInputForm from '../components/lactate-input/StageInputForm'
import StagesList from '../components/lactate-input/StagesList'

interface TestInfo {
  testId: string
  unit: string
  stageDuration_min: string
  device: string
  startLoad: string
  increment: string
}

interface Stage {
  stage: number
  load: string
  lactate: string
  heartRate?: string
  rrSystolic?: string
  rrDiastolic?: string
  duration: string
  theoreticalLoad?: string | number
  notes?: string
}

export default function StageInputPopup() {
  const [testId, setTestId] = useState<string | null>(null)
  const [testInfo, setTestInfo] = useState<TestInfo | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [inputMode, setInputMode] = useState<'measurement_by_measurement' | 'fast_input'>('fast_input')
  const [currentStage, setCurrentStage] = useState<Stage>({
    stage: 1,
    load: '',
    lactate: '',
    heartRate: '',
    rrSystolic: '',
    rrDiastolic: '',
    duration: '',
    notes: ''
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Get testId from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tid = params.get('testId')
    setTestId(tid)

    // Listen for close message
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === 'CLOSE_POPUP') {
        window.close()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Load input mode setting
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings/general')
        if (response.ok) {
          const data = await response.json()
          const mode = data.settings?.measurement_input_style || 'fast_input'
          setInputMode(mode as 'measurement_by_measurement' | 'fast_input')
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Load test metadata and stages
  useEffect(() => {
    if (!testId) return

    const loadData = async () => {
      try {
        const response = await fetch(`/api/lactate-webhook?sessionId=${testId}&includeMetadata=true`)
        if (response.ok) {
          const data = await response.json()
          
          // Map stages
          const loadedStages = (data.data || []).map((s: any) => ({
            stage: s.stage,
            load: s.load?.toString() || s.power?.toString() || '',
            lactate: s.lactate?.toString() || '',
            heartRate: s.heartRate?.toString() || '',
            rrSystolic: s.rrSystolic?.toString() || '',
            rrDiastolic: s.rrDiastolic?.toString() || '',
            duration: s.duration?.toString() || '3.0',
            theoreticalLoad: s.theoreticalLoad || s.theoretical_load,
            notes: s.notes || ''
          }))
          setStages(loadedStages)

          // Extract test info
          if (data.metadata) {
            setTestInfo({
              testId: testId,
              device: data.metadata.device,
              unit: data.metadata.unit,
              stageDuration_min: data.metadata.stage_duration_min?.toString() || '3',
              startLoad: data.metadata.start_load?.toString() || '50',
              increment: data.metadata.load_increment?.toString() || '50'
            })
          }

          // Initialize currentStage for measurement-by-measurement mode
          if (loadedStages.length > 0) {
            const maxStage = Math.max(...loadedStages.map((s: Stage) => s.stage))
            const nextStageNumber = maxStage + 1
            const startLoad = data.metadata?.start_load || 50
            const increment = data.metadata?.load_increment || 50
            const nextLoad = startLoad + (increment * maxStage)
            
            setCurrentStage({
              stage: nextStageNumber,
              load: nextLoad.toString(),
              lactate: '',
              heartRate: '',
              rrSystolic: '',
              rrDiastolic: '',
              duration: data.metadata?.stage_duration_min?.toString() || '3.0',
              notes: ''
            })
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [testId])

  // Handler for measurement-by-measurement save
  const handleSaveStage = async () => {
    if (!testInfo || !currentStage.load || !currentStage.lactate) {
      alert('Load und Laktat sind Pflichtfelder')
      return
    }

    try {
      const payload = {
        sessionId: testId,
        stage: currentStage.stage,
        power: parseFloat(currentStage.load),
        lactate: parseFloat(currentStage.lactate),
        heartRate: currentStage.heartRate ? parseInt(currentStage.heartRate) : undefined,
        rrSystolic: currentStage.rrSystolic ? parseInt(currentStage.rrSystolic) : undefined,
        rrDiastolic: currentStage.rrDiastolic ? parseInt(currentStage.rrDiastolic) : undefined,
        duration: parseFloat(currentStage.duration || testInfo.stageDuration_min),
        notes: currentStage.notes || undefined
      }

      const response = await fetch('/api/lactate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        // Reload stages
        const dataResponse = await fetch(`/api/lactate-webhook?sessionId=${testId}&includeMetadata=true`)
        if (dataResponse.ok) {
          const data = await dataResponse.json()
          const loadedStages = (data.data || []).map((s: any) => ({
            stage: s.stage,
            load: s.load?.toString() || s.power?.toString() || '',
            lactate: s.lactate?.toString() || '',
            heartRate: s.heartRate?.toString() || '',
            rrSystolic: s.rrSystolic?.toString() || '',
            rrDiastolic: s.rrDiastolic?.toString() || '',
            duration: s.duration?.toString() || '3.0',
            theoreticalLoad: s.theoreticalLoad || s.theoretical_load,
            notes: s.notes || ''
          }))
          setStages(loadedStages)

          // Prepare next stage
          const maxStage = Math.max(...loadedStages.map((s: Stage) => s.stage))
          const nextStageNumber = maxStage + 1
          const startLoad = parseFloat(testInfo.startLoad)
          const increment = parseFloat(testInfo.increment)
          const nextLoad = startLoad + (increment * maxStage)
          
          setCurrentStage({
            stage: nextStageNumber,
            load: nextLoad.toString(),
            lactate: '',
            heartRate: '',
            rrSystolic: '',
            rrDiastolic: '',
            duration: testInfo.stageDuration_min,
            notes: ''
          })
          setHasUnsavedChanges(false)
        }
      }
    } catch (error) {
      console.error('Error saving stage:', error)
      alert('Fehler beim Speichern')
    }
  }

  // Handler for removing stage
  const handleRemoveStage = async (stageNumber: number) => {
    if (!confirm(`Stufe ${stageNumber} wirklich löschen?`)) return

    try {
      const response = await fetch(`/api/lactate-webhook?sessionId=${testId}&stage=${stageNumber}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Reload stages
        const dataResponse = await fetch(`/api/lactate-webhook?sessionId=${testId}&includeMetadata=true`)
        if (dataResponse.ok) {
          const data = await dataResponse.json()
          const loadedStages = (data.data || []).map((s: any) => ({
            stage: s.stage,
            load: s.load?.toString() || s.power?.toString() || '',
            lactate: s.lactate?.toString() || '',
            heartRate: s.heartRate?.toString() || '',
            rrSystolic: s.rrSystolic?.toString() || '',
            rrDiastolic: s.rrDiastolic?.toString() || '',
            duration: s.duration?.toString() || '3.0',
            theoreticalLoad: s.theoreticalLoad || s.theoretical_load,
            notes: s.notes || ''
          }))
          setStages(loadedStages)
        }
      }
    } catch (error) {
      console.error('Error removing stage:', error)
      alert('Fehler beim Löschen')
    }
  }

  // Intercept fetch to notify parent window
  useEffect(() => {
    if (!testId || typeof window === 'undefined') return

    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)
      
      if (args[0]?.toString().includes('/api/lactate-webhook') && 
          args[1]?.method === 'POST') {
        
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        
        saveTimeoutRef.current = setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({
              type: 'STAGES_UPDATED',
              testId
            }, window.location.origin)
          }
        }, 500)
      }
      
      return response
    }

    return () => {
      window.fetch = originalFetch
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [testId])

  if (!testId || !testInfo) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">Lädt Daten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">
              Stufen bearbeiten - {testInfo.device} {testInfo.unit}
            </h1>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold"
            >
              ✕ Schließen
            </button>
          </div>
          
          {inputMode === 'measurement_by_measurement' ? (
            <>
              <StageInputForm
                currentStage={currentStage}
                selectedTestInfo={testInfo}
                onStageChange={(updates) => {
                  setCurrentStage(prev => ({ ...prev, ...updates }))
                  setHasUnsavedChanges(true)
                }}
                onSave={handleSaveStage}
                hasUnsavedChanges={hasUnsavedChanges}
                onChangeProtocol={() => window.close()}
              />

              <StagesList
                stages={stages.map(s => ({
                  stage: s.stage,
                  load: parseFloat(s.load) || 0,
                  lactate: parseFloat(s.lactate) || 0,
                  heartRate: s.heartRate ? parseInt(s.heartRate) : undefined,
                  rrSystolic: s.rrSystolic ? parseInt(s.rrSystolic) : undefined,
                  rrDiastolic: s.rrDiastolic ? parseInt(s.rrDiastolic) : undefined,
                  duration: parseFloat(s.duration) || undefined,
                  theoreticalLoad: typeof s.theoreticalLoad === 'string' ? parseFloat(s.theoreticalLoad) : s.theoreticalLoad,
                  notes: s.notes
                }))}
                currentStageNumber={currentStage.stage}
                unit={testInfo.unit}
                onStageClick={(stage) => {
                  setCurrentStage({
                    stage: stage.stage,
                    load: stage.load.toString(),
                    lactate: stage.lactate.toString(),
                    heartRate: stage.heartRate?.toString() || '',
                    rrSystolic: stage.rrSystolic?.toString() || '',
                    rrDiastolic: stage.rrDiastolic?.toString() || '',
                    duration: stage.duration?.toString() || '',
                    notes: stage.notes || ''
                  })
                  setHasUnsavedChanges(false)
                }}
                onStageRemove={handleRemoveStage}
              />
            </>
          ) : (
            <FastStageInput
              selectedTestInfo={testInfo}
              existingStages={stages}
            />
          )}
        </div>
      </div>
    </div>
  )
}
