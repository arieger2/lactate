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
  const { 
    selectedCustomer: globalCustomer, 
    setSelectedCustomer: setGlobalCustomer,
    refreshData 
  } = useCustomer()
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
        // silent error
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
        // silent error
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
    // Validate and parse numeric fields
    const load = parseFloat(stageData.load)
    const lactate = parseFloat(stageData.lactate)
    
    if (isNaN(load) || isNaN(lactate)) {
      throw new Error('Load and lactate must be valid numbers')
    }
    
    const heartRate = stageData.heartRate && stageData.heartRate.trim() !== '' 
      ? parseInt(stageData.heartRate) 
      : undefined
    const rrSystolic = stageData.rrSystolic && stageData.rrSystolic.trim() !== '' 
      ? parseInt(stageData.rrSystolic) 
      : undefined
    const rrDiastolic = stageData.rrDiastolic && stageData.rrDiastolic.trim() !== '' 
      ? parseInt(stageData.rrDiastolic) 
      : undefined
    
    return {
      testId: selectedTestInfo!.testId,
      stage: stageData.stage,
      load: load,
      lactate: lactate,
      heartRate: heartRate,
      rrSystolic: rrSystolic,
      rrDiastolic: rrDiastolic,
      duration: duration, // Use the passed parameter, not recalculate
      notes: stageData.notes || undefined,
      isExistingStage: isExisting // Flag to prevent backend re-interpolation
    }
  }

  const saveStageToDatabase = async (payload: any): Promise<{ success: boolean; theoreticalLoad?: number }> => {
    try {
      console.log('Sending payload:', JSON.stringify(payload, null, 2))
      
      const response = await fetch('/api/lactate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const responseData = await response.json()
        console.error('Failed to save stage:', response.status, responseData)
        showErrorMessage(`Failed to save: ${responseData.error || 'Unknown error'}`)
        return { success: false }
      }
      
      // Get the response data which includes theoreticalLoad
      const responseData = await response.json()
      const theoreticalLoad = responseData.data?.theoreticalLoad
      
      return { success: true, theoreticalLoad }
    } catch (error) {
      console.error('❌ Error saving stage:', error)
      showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { success: false }
    }
  }

  const updateLocalStagesArray = (stageData: CurrentStage, duration: number, theoreticalLoad?: number) => {
    setStages(prev => {
      const stageObj = {
        stage: stageData.stage,
        load: parseFloat(stageData.load),
        lactate: parseFloat(stageData.lactate),
        heartRate: stageData.heartRate ? parseInt(stageData.heartRate) : undefined,
        rrSystolic: stageData.rrSystolic ? parseInt(stageData.rrSystolic) : undefined,
        rrDiastolic: stageData.rrDiastolic ? parseInt(stageData.rrDiastolic) : undefined,
        duration: duration,
        theoreticalLoad: theoreticalLoad,
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
      stage: parseInt(String(currentStage.stage), 10) + 1,
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
      showErrorMessage('Load and Lactate are required fields');
      return;
    }

    const newLoad = parseFloat(currentStage.load);
    if (isNaN(newLoad)) {
      showErrorMessage('Invalid Load value');
      return;
    }

    const targetDuration = parseFloat(selectedTestInfo.stageDuration_min);
    const actualDuration = parseDurationToDecimal(currentStage.duration || selectedTestInfo.stageDuration_min);
    const isExisting = stages.some(s => s.stage === currentStage.stage);
    const isFullDuration = actualDuration >= targetDuration;

    try {
      // CASE 1: Editing an existing stage
      if (isExisting) {
        const maxStage = Math.max(...stages.map(s => s.stage));
        const isLastStage = currentStage.stage === maxStage;
        
        // If editing last stage AND time is 100% AND load INCREASED
        // Then create a NEW stage instead of updating
        if (isLastStage && isFullDuration) {
          const existingStage = stages.find(s => s.stage === currentStage.stage);
          const currentLoad = parseFloat(currentStage.load);
          const existingLoad = existingStage?.load || 0;
          
          // Check if load INCREASED (user progressed to next level)
          if (currentLoad > existingLoad) {
            const payload = buildStagePayload(currentStage, actualDuration, false);
            const result = await saveStageToDatabase(payload);
            
            if (result.success) {
              // Reload stages from database to ensure we have the complete data including theoretical load
              if (selectedTestInfo?.testId) {
                const response = await fetch(`/api/lactate-webhook?testId=${selectedTestInfo.testId}`);
                if (response.ok) {
                  const data = await response.json();
                  const stages = data.data || data.stages || [];
                  setStages(stages);
                }
              }
              
              setHasUnsavedChanges(false);
              refreshData();
              prepareNextStage();
            }
            return;
          }
        }
        
        // Default: Update existing stage
        const payload = buildStagePayload(currentStage, actualDuration, true);
        const result = await saveStageToDatabase(payload);
      
        if (result.success) {
          // Reload stages from database to ensure we have the complete data including theoretical load
          if (selectedTestInfo?.testId) {
            const response = await fetch(`/api/lactate-webhook?testId=${selectedTestInfo.testId}`);
            if (response.ok) {
              const data = await response.json();
              const stages = data.data || data.stages || [];
              setStages(stages);
            }
          }
          
          setHasUnsavedChanges(false);
          refreshData();
          
          // If this was the last stage AND time is 100%, prepare next stage
          if (isLastStage && isFullDuration) {
            prepareNextStage();
          }
        }
        return;
      }
      
      // CASE 2: Creating a new stage
      const payload = buildStagePayload(currentStage, actualDuration, false);
      const result = await saveStageToDatabase(payload);
      
      if (result.success) {
        // Reload stages from database to ensure we have the complete data including theoretical load
        if (selectedTestInfo?.testId) {
          const response = await fetch(`/api/lactate-webhook?testId=${selectedTestInfo.testId}`);
          if (response.ok) {
            const data = await response.json();
            const stages = data.data || data.stages || [];
            setStages(stages);
          }
        }
        
        setHasUnsavedChanges(false);
        refreshData();
        
        // Only prepare next stage if time was 100% reached
        // If time < 100%, the test is finished (incomplete last stage)
        if (isFullDuration) {
          prepareNextStage();
        }
      }
    } catch (error) {
      console.error('Error in handleSaveStage:', error);
      showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
              load: typeof stage.load === 'string' ? parseFloat(stage.load) : stage.load,
              lactate: typeof stage.lactate === 'string' ? parseFloat(stage.lactate) : stage.lactate,
              heartRate: stage.heartRate ? (typeof stage.heartRate === 'string' ? parseInt(stage.heartRate) : stage.heartRate) : undefined,
              rrSystolic: stage.rrSystolic ? (typeof stage.rrSystolic === 'string' ? parseInt(stage.rrSystolic) : stage.rrSystolic) : undefined,
              rrDiastolic: stage.rrDiastolic ? (typeof stage.rrDiastolic === 'string' ? parseInt(stage.rrDiastolic) : stage.rrDiastolic) : undefined,
              duration: typeof stage.duration === 'string' ? parseFloat(stage.duration) : stage.duration || parseFloat(selectedTestInfo.stageDuration_min),
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
        } else {
          // Update the form to prepare for the next stage after remaining stages
          const maxStageNumber = remainingStages.length > 0 ? Math.max(...remainingStages.map(s => s.stage)) : 0
          setCurrentStage({
            ...currentStage,
            stage: maxStageNumber + 1
          })
        }
      } else {
        // Current stage is before the removed stage, but we still need to prepare the form
        // for the next stage based on the updated stages array
        const maxStageNumber = remainingStages.length > 0 ? Math.max(...remainingStages.map(s => s.stage)) : 0
        // Only update if the current form stage is higher than the max existing stage
        if (currentStage.stage > maxStageNumber) {
          setCurrentStage({
            ...currentStage,
            stage: maxStageNumber + 1
          })
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
