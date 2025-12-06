'use client'

import { useState, useEffect } from 'react'
import { useCustomer, Customer } from '@/lib/CustomerContext'
import CustomerManagement from './lactate-input/CustomerManagement'
import TestProtocolManager from './lactate-input/TestProtocolManager'
import StageInputForm from './lactate-input/StageInputForm'
import StagesList from './lactate-input/StagesList'

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
            setCurrentStage({
              stage: maxStage + 1,
              load: nextLoad.toString(),
              lactate: '',
              heartRate: '',
              rrSystolic: '',
              rrDiastolic: '',
              duration: selectedTestInfo.stageDuration_min,
              notes: ''
            })
          } else {
            setCurrentStage({
              stage: 1,
              load: selectedTestInfo.startLoad,
              lactate: '',
              heartRate: '',
              rrSystolic: '',
              rrDiastolic: '',
              duration: selectedTestInfo.stageDuration_min,
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
    return currentStageNumber >= maxStage
  }

  const buildStagePayload = (stageData: CurrentStage, duration: number) => {
    return {
      testId: selectedTestInfo!.testId,
      stage: stageData.stage,
      load: parseFloat(stageData.load),
      lactate: parseFloat(stageData.lactate),
      heartRate: stageData.heartRate ? parseInt(stageData.heartRate) : undefined,
      rrSystolic: stageData.rrSystolic ? parseInt(stageData.rrSystolic) : undefined,
      rrDiastolic: stageData.rrDiastolic ? parseInt(stageData.rrDiastolic) : undefined,
      duration: duration,
      notes: stageData.notes || undefined
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
    
    setCurrentStage({
      stage: currentStage.stage + 1,
      load: nextLoad.toString(),
      lactate: '',
      heartRate: '',
      rrSystolic: '',
      rrDiastolic: '',
      duration: selectedTestInfo.stageDuration_min,
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
    
    // 2.) Check if time 100% reached
    if (actualDuration >= targetDuration) {
      // 2.1) Time 100% reached: save
      const payload = buildStagePayload(currentStage, actualDuration)
      const saved = await saveStageToDatabase(payload)
      
      if (saved) {
        updateLocalStagesArray(currentStage, actualDuration)
        
        // 2.1.1) If last stage: prepare next stage
        if (isLast) {
          prepareNextStage()
        }
        // 2.1.2) If not last stage: nothing (user can select another stage)
      }
    } else {
      // 2.2) Time < 100%
      
      // 2.2.1) Not last stage: error message
      if (!isLast) {
        showErrorMessage('Stage not completed! Only the last stage can have incomplete duration.')
        return
      }
      
      // 2.2.2) Last stage with incomplete time: save with approximation
      const payload = buildStagePayload(currentStage, actualDuration)
      const saved = await saveStageToDatabase(payload)
      
      if (saved) {
        updateLocalStagesArray(currentStage, actualDuration)
        prepareNextStage()
      }
    }
  }

  const handleStageClick = (stage: Stage) => {
    setCurrentStage({
      stage: stage.stage,
      load: stage.load.toString(),
      lactate: stage.lactate.toString(),
      heartRate: stage.heartRate ? stage.heartRate.toString() : '',
      rrSystolic: stage.rrSystolic ? stage.rrSystolic.toString() : '',
      rrDiastolic: stage.rrDiastolic ? stage.rrDiastolic.toString() : '',
      duration: stage.duration ? stage.duration.toString() : '',
      notes: stage.notes || ''
    })
  }

  const handleRemoveStage = async (stageNumber: number) => {
    if (!selectedTestInfo) return
    
    try {
      const remainingStages = stages.filter(s => s.stage !== stageNumber)
      
      // Delete entire test and re-save stages
      await fetch(`/api/lactate-webhook?testId=${selectedTestInfo.testId}`, {
        method: 'DELETE'
      })
      
      // Re-save test_info
      await fetch('/api/test-infos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: selectedTestInfo.testId,
          customer_id: selectedCustomer!.customer_id,
          test_date: selectedTestInfo.testDate,
          test_time: selectedTestInfo.testTime,
          device: selectedTestInfo.device,
          unit: selectedTestInfo.unit,
          start_load: parseFloat(selectedTestInfo.startLoad),
          increment: parseFloat(selectedTestInfo.increment),
          stage_duration_min: parseInt(selectedTestInfo.stageDuration_min)
        })
      })
      
      // Re-save remaining stages
      for (const stage of remainingStages) {
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
            duration: stage.duration,
            notes: stage.notes
          })
        })
      }
      
      setStages(remainingStages)
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
            }}
            onSave={handleSaveStage}
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
