'use client'

import { useState, useEffect } from 'react'
import { useCustomer, Customer } from '@/lib/CustomerContext'
import CustomerManagement from './lactate-input/CustomerManagement'
import TestProtocolManager from './lactate-input/TestProtocolManager'
import StageInputForm from './lactate-input/StageInputForm'
import StagesList from './lactate-input/StagesList'

// ========== DURATION HELPERS ==========

/**
 * Convert duration string (3:00 or 0:50) to decimal minutes (3.0 or 0.833)
 */
function parseDurationToDecimal(input: string): number {
  if (!input || input.trim() === '') return 3.0

  // If already a decimal number, return as-is
  if (input.match(/^\d+\.?\d*$/)) {
    return parseFloat(input)
  }

  // Parse min:sec format
  const parts = input.split(':')
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]) || 0
    const seconds = parseInt(parts[1]) || 0
    return minutes + (seconds / 60)
  }

  // Fallback: treat as minutes
  return parseFloat(input) || 3.0
}

/**
 * Convert decimal minutes (3.0 or 0.833) to min:sec string (3:00 or 0:50)
 */
function formatDurationDisplay(decimalMinutes: number): string {
  const minutes = Math.floor(decimalMinutes)
  const seconds = Math.round((decimalMinutes - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// ========== INTERFACES ==========

interface TestInfo {
  testId?: string
  testDate: string
  testTime: string
  device: string
  unit: string
  startLoad: string
  increment: string
  stageDuration_min: string
}

interface Stage {
  stage: number
  load: number
  lactate: number
  heartRate?: number
  rrSystolic?: number
  rrDiastolic?: number
  duration?: number
  theoreticalLoad?: number
  notes?: string
}

interface CurrentStage {
  stage: number
  load: string
  lactate: string
  heartRate?: string
  rrSystolic?: string
  rrDiastolic?: string
  duration?: string
  notes?: string
}

export default function LactateInput() {
  const { selectedCustomer: globalCustomer, setSelectedCustomer: setGlobalCustomer } = useCustomer()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(globalCustomer)
  const [testInfos, setTestInfos] = useState<TestInfo[]>([])
  const [selectedTestInfo, setSelectedTestInfo] = useState<TestInfo | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentStage, setCurrentStage] = useState<CurrentStage>({
    stage: 1,
    load: '',
    lactate: '',
    heartRate: '',
    rrSystolic: '',
    rrDiastolic: '',
    duration: '3',
    notes: ''
  })

  // Sync with global customer context
  useEffect(() => {
    if (selectedCustomer) {
      setGlobalCustomer(selectedCustomer)
    }
  }, [selectedCustomer, setGlobalCustomer])

  // Load test infos when customer selected
  useEffect(() => {
    const loadTestInfos = async () => {
      if (!selectedCustomer) {
        setTestInfos([])
        return
      }

      try {
        const response = await fetch(`/api/test-infos?customerId=${selectedCustomer.customer_id}`)
        if (response.ok) {
          const data = await response.json()
          const formattedTests: TestInfo[] = data.testInfos.map((t: any) => ({
            testId: t.test_id,
            testDate: t.test_date,
            testTime: t.test_time || '00:00',
            device: t.device,
            unit: t.unit,
            startLoad: t.start_load.toString(),
            increment: t.increment.toString(),
            stageDuration_min: t.stage_duration_min.toString()
          }))
          setTestInfos(formattedTests)
        }
      } catch (error) {
        console.error('Error loading test infos:', error)
      }
    }

    loadTestInfos()
  }, [selectedCustomer])

  // Load stages when test selected
  useEffect(() => {
    const loadStages = async () => {
      if (!selectedTestInfo?.testId) {
        setStages([])
        return
      }

      try {
        const response = await fetch(`/api/lactate-webhook?testId=${selectedTestInfo.testId}`)
        if (response.ok) {
          const data = await response.json()
          const stages = data.data || data.stages || []
          setStages(stages)
          
          // Set next stage number
          if (stages && stages.length > 0) {
            const maxStage = Math.max(...stages.map((s: Stage) => s.stage))
            const nextLoad = parseFloat(selectedTestInfo.startLoad) + (maxStage * parseFloat(selectedTestInfo.increment))
            const defaultDuration = formatDurationDisplay(parseFloat(selectedTestInfo.stageDuration_min))
            setCurrentStage({
              stage: maxStage + 1,
              load: nextLoad.toString(),
              lactate: '',
              heartRate: '',
              rrSystolic: '',
              rrDiastolic: '',
              duration: defaultDuration,
              notes: ''
            })
          } else {
            const defaultDuration = formatDurationDisplay(parseFloat(selectedTestInfo.stageDuration_min))
            setCurrentStage({
              stage: 1,
              load: selectedTestInfo.startLoad,
              lactate: '',
              heartRate: '',
              rrSystolic: '',
              rrDiastolic: '',
              duration: defaultDuration,
              notes: ''
            })
          }
        }
      } catch (error) {
        console.error('Error loading stages:', error)
      }
    }

    loadStages()
  }, [selectedTestInfo])

  // ========== SUB-METHODS FOR STAGE SAVING (10-POINT SPECIFICATION) ==========
  
  const isLastStage = (currentStageNumber: number): boolean => {
    if (stages.length === 0) return true
    const maxStage = Math.max(...stages.map(s => s.stage))
    return currentStageNumber > maxStage
  }

  const isExistingStage = (currentStageNumber: number): boolean => {
    return stages.some(s => s.stage === currentStageNumber)
  }

  const buildStagePayload = (stageData: CurrentStage, duration: number, isExisting: boolean = false) => {
    const durationDecimal = parseDurationToDecimal(stageData.duration || '3')
    
    return {
      testId: selectedTestInfo!.testId,
      stage: stageData.stage,
      load: parseFloat(stageData.load),
      lactate: parseFloat(stageData.lactate),
      heartRate: stageData.heartRate ? parseInt(stageData.heartRate) : undefined,
      rrSystolic: stageData.rrSystolic ? parseInt(stageData.rrSystolic) : undefined,
      rrDiastolic: stageData.rrDiastolic ? parseInt(stageData.rrDiastolic) : undefined,
      duration: durationDecimal,
      notes: stageData.notes || undefined,
      isExistingStage: isExisting // Flag to prevent backend re-interpolation
    }
  }

  const saveStageToDatabase = async (payload: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/lactate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const responseData = await response.json()
        console.error('Failed to save stage:', response.status, responseData)
        return false
      }
      
      return true
    } catch (error) {
      console.error('❌ Error saving stage:', error)
      return false
    }
  }

  const updateLocalStagesArray = (stageData: CurrentStage, duration: number) => {
    setStages(prev => {
      const stageObj = {
        stage: stageData.stage,
        load: parseFloat(stageData.load),
        lactate: parseFloat(stageData.lactate),
        heartRate: stageData.heartRate ? parseInt(stageData.heartRate) : undefined,
        rrSystolic: stageData.rrSystolic ? parseInt(stageData.rrSystolic) : undefined,
        rrDiastolic: stageData.rrDiastolic ? parseInt(stageData.rrDiastolic) : undefined,
        duration: duration,
        notes: stageData.notes || undefined
      }
      
      const existing = prev.find(s => s.stage === stageData.stage)
      if (existing) {
        return prev.map(s => s.stage === stageData.stage ? stageObj : s)
      } else {
        return [...prev, stageObj].sort((a, b) => a.stage - b.stage)
      }
    })
  }

  const prepareNextStage = () => {
    if (!selectedTestInfo) return
    
    const nextLoad = parseFloat(currentStage.load) + parseFloat(selectedTestInfo.increment)
    const defaultDuration = formatDurationDisplay(parseFloat(selectedTestInfo.stageDuration_min))
    
    setCurrentStage({
      stage: currentStage.stage + 1,
      load: nextLoad.toString(),
      lactate: '',
      heartRate: '',
      rrSystolic: '',
      rrDiastolic: '',
      duration: defaultDuration,
      notes: ''
    })
  }

  const showErrorMessage = (message: string) => {
    alert(`⚠️ ${message}`)
  }

  const handleSaveStage = async () => {
    if (!selectedTestInfo || !currentStage.load || !currentStage.lactate) {
      return
    }
    
    const targetDuration = parseInt(selectedTestInfo.stageDuration_min)
    const actualDuration = currentStage.duration ? parseInt(currentStage.duration) : targetDuration
    const isLast = isLastStage(currentStage.stage)
    const isExisting = isExistingStage(currentStage.stage)
    
    // CASE 1: Editing an existing stage
    if (isExisting) {
      // Always save existing stage modifications, regardless of duration
      const payload = buildStagePayload(currentStage, actualDuration, true) // Pass isExisting=true
      const saved = await saveStageToDatabase(payload)
      
      if (saved) {
        updateLocalStagesArray(currentStage, actualDuration)
        setHasUnsavedChanges(false)
        
        // Check if this was the last existing stage AND time is 100%
        // If so, prepare next stage to allow continuing
        const maxStage = Math.max(...stages.map(s => s.stage))
        if (currentStage.stage === maxStage && actualDuration >= targetDuration) {
          prepareNextStage()
        }
        // Otherwise, user stays on this stage to continue editing
      }
      return
    }
    
    // CASE 2: Creating a new stage (isLast should be true)
    // Check if time 100% reached
    if (actualDuration >= targetDuration) {
      // 2.1) Time 100% reached: save
      const payload = buildStagePayload(currentStage, actualDuration, false) // New stage
      const saved = await saveStageToDatabase(payload)
      
      if (saved) {
        updateLocalStagesArray(currentStage, actualDuration)
        setHasUnsavedChanges(false)
        // 2.1.1) New stage completed: prepare next stage
        prepareNextStage()
      }
    } else {
      // 2.2) Time < 100% for new stage
      // Only allowed for the last/new stage with approximation
      // This means the test is FINISHED (user couldn't complete the stage)
      const payload = buildStagePayload(currentStage, actualDuration, false) // New incomplete stage
      const saved = await saveStageToDatabase(payload)
      
      if (saved) {
        updateLocalStagesArray(currentStage, actualDuration)
        setHasUnsavedChanges(false)
        // DO NOT prepare next stage - test is finished with incomplete last stage
      }
    }
  }

  const handleStageClick = (stage: Stage) => {
    const formattedDuration = stage.duration ? formatDurationDisplay(stage.duration) : ''
    
    setCurrentStage({
      stage: stage.stage,
      load: stage.load.toString(),
      lactate: stage.lactate.toString(),
      heartRate: stage.heartRate ? stage.heartRate.toString() : '',
      rrSystolic: stage.rrSystolic ? stage.rrSystolic.toString() : '',
      rrDiastolic: stage.rrDiastolic ? stage.rrDiastolic.toString() : '',
      duration: formattedDuration,
      notes: stage.notes || ''
    })
    setHasUnsavedChanges(false)
  }

  const handleRemoveStage = async (stageNumber: number) => {
    if (!selectedTestInfo) return
    
    try {
      // Delete only the specific stage
      await fetch(`/api/lactate-webhook?testId=${selectedTestInfo.testId}&stage=${stageNumber}`, {
        method: 'DELETE'
      })
      
      // Filter out the removed stage and renumber remaining stages
      const remainingStages = stages
        .filter(s => s.stage !== stageNumber)
        .map((s, index) => ({
          ...s,
          stage: index + 1 // Renumber stages sequentially
        }))
      
      // Update stage numbers in database for remaining stages
      for (const stage of remainingStages) {
        // Only update if stage number changed
        const originalStage = stages.find(s => s.load === stage.load && s.lactate === stage.lactate)
        if (originalStage && originalStage.stage !== stage.stage) {
          await fetch('/api/lactate-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              testId: selectedTestInfo.testId,
              stage: stage.stage,
              load: stage.load,
              lactate: stage.lactate,
              heartRate: stage.heartRate,
              rrSystolic: stage.rrSystolic,
              rrDiastolic: stage.rrDiastolic,
              duration: stage.duration || selectedTestInfo.stageDuration_min,
              notes: stage.notes,
              isExistingStage: true // Prevent re-interpolation
            })
          })
        }
      }
      
      setStages(remainingStages)
      
      // If we removed the current stage, switch to the nearest valid stage
      if (currentStage.stage === stageNumber) {
        const newStageNumber = Math.min(currentStage.stage, remainingStages.length)
        if (remainingStages.length > 0) {
          const stageToLoad = remainingStages.find(s => s.stage === newStageNumber) || remainingStages[0]
          handleStageClick(stageToLoad)
        } else {
          // No stages left, reset to initial state
          setCurrentStage({
            stage: 1,
            load: '',
            lactate: '',
            heartRate: '',
            rrSystolic: '',
            rrDiastolic: '',
            duration: selectedTestInfo?.stageDuration_min || '3',
            notes: ''
          })
        }
      } else if (currentStage.stage > stageNumber) {
        // Adjust current stage number if it's after the removed stage
        const newStageNumber = currentStage.stage - 1
        const stageToLoad = remainingStages.find(s => s.stage === newStageNumber)
        if (stageToLoad) {
          handleStageClick(stageToLoad)
        }
      }
    } catch (error) {
      console.error('Error removing stage:', error)
    }
  }

  return (
    <div className="space-y-6">
      <CustomerManagement
        selectedCustomer={selectedCustomer}
        onCustomerSelected={setSelectedCustomer}
        onCustomerChange={() => {
          setSelectedCustomer(null)
          setSelectedTestInfo(null)
          setTestInfos([])
          setStages([])
        }}
        testInfos={testInfos}
        onTestInfosChange={setTestInfos}
      />

      {selectedCustomer && !selectedTestInfo && (
        <TestProtocolManager
          customerId={selectedCustomer.customer_id}
          testInfos={testInfos}
          onTestInfosChange={setTestInfos}
          onTestSelected={setSelectedTestInfo}
        />
      )}

      {selectedCustomer && selectedTestInfo && (
        <>
          <StageInputForm
            currentStage={currentStage}
            selectedTestInfo={{
              testId: selectedTestInfo.testId!,
              unit: selectedTestInfo.unit,
              stageDuration_min: selectedTestInfo.stageDuration_min,
              device: selectedTestInfo.device,
              startLoad: selectedTestInfo.startLoad,
              increment: selectedTestInfo.increment
            }}
            onStageChange={(updates) => {
              setCurrentStage(prev => ({ ...prev, ...updates }))
              setHasUnsavedChanges(true)
            }}
            onSave={handleSaveStage}
            hasUnsavedChanges={hasUnsavedChanges}
            onChangeProtocol={() => {
              setSelectedTestInfo(null)
              setStages([])
            }}
          />

          <StagesList
            stages={stages}
            currentStageNumber={currentStage.stage}
            unit={selectedTestInfo.unit}
            onStageClick={handleStageClick}
            onStageRemove={handleRemoveStage}
          />
        </>
      )}
    </div>
  )
}
