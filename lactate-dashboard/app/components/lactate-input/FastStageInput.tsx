'use client'

import { useState, useEffect, useRef } from 'react'

// Convert decimal minutes to min:sec format (e.g., 3.5 -> "3:30")
function decimalToMinSec(decimal: number | string): string {
  const num = typeof decimal === 'string' ? parseFloat(decimal) : decimal
  if (isNaN(num)) return '0:00'
  const minutes = Math.floor(num)
  const seconds = Math.round((num - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Convert min:sec format to decimal minutes (e.g., "3:30" -> 3.5)
function minSecToDecimal(minSec: string): number {
  if (!minSec || minSec.trim() === '') return 0
  
  // If already a decimal number, return as-is
  if (minSec.match(/^\d+\.?\d*$/)) {
    return parseFloat(minSec)
  }
  
  const parts = minSec.split(':')
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]) || 0
    const seconds = parseInt(parts[1]) || 0
    return minutes + (seconds / 60)
  }
  
  return parseFloat(minSec) || 0
}

interface Stage {
  stage: number
  load: string
  lactate: string
  heartRate?: string
  rrSystolic?: string
  rrDiastolic?: string
  duration: string
  notes?: string
}

interface TestInfo {
  testId: string
  unit: string
  stageDuration_min: string
  device: string
  startLoad: string
  increment: string
}

interface FastStageInputProps {
  selectedTestInfo: TestInfo
  existingStages: Stage[]
  onSave?: (stages: Stage[]) => Promise<void>
  onChangeProtocol?: () => void
}

export default function FastStageInput({
  selectedTestInfo,
  existingStages,
  onSave,
  onChangeProtocol
}: FastStageInputProps) {
  const [stages, setStages] = useState<Stage[]>([])
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const lastSavedValues = useRef<{ [key: string]: string }>({})

  // Initialize stages from existing or create first stage
  useEffect(() => {
    if (existingStages.length > 0) {
      // Convert existing durations to min:sec format
      setStages(existingStages.map(s => ({
        ...s,
        duration: decimalToMinSec(s.duration)
      })))
    } else {
      const startLoad = parseFloat(selectedTestInfo.startLoad)
      setStages([{
        stage: 1,
        load: startLoad.toString(),
        lactate: '',
        heartRate: '',
        rrSystolic: '',
        rrDiastolic: '',
        duration: decimalToMinSec(selectedTestInfo.stageDuration_min),
        notes: ''
      }])
    }
  }, [existingStages, selectedTestInfo])

  // Check protocol status when stages change
  useEffect(() => {
    if (stages.length > 0) {
      checkProtocolStatus()
    }
  }, [stages])

  // Auto-focus on first lactate field when component loads
  useEffect(() => {
    setTimeout(() => {
      const input = inputRefs.current['0-lactate']
      if (input) {
        input.focus()
        input.select()
      }
    }, 100)
  }, [])

  const addNewRow = () => {
    const lastStage = stages[stages.length - 1]
    const nextStageNumber = stages.length + 1
    const nextLoad = lastStage ? parseFloat(lastStage.load) + parseFloat(selectedTestInfo.increment) : parseFloat(selectedTestInfo.startLoad)
    
    setStages([...stages, {
      stage: nextStageNumber,
      load: nextLoad.toString(),
      lactate: '',
      heartRate: '',
      rrSystolic: '',
      rrDiastolic: '',
      duration: decimalToMinSec(selectedTestInfo.stageDuration_min),
      notes: ''
    }])
  }

  const removeRow = (index: number) => {
    if (stages.length === 1) return // Keep at least one row
    const newStages = stages.filter((_, i) => i !== index)
    // Renumber stages
    const renumbered = newStages.map((s, i) => ({ ...s, stage: i + 1 }))
    setStages(renumbered)
  }

  const updateStage = (index: number, field: keyof Stage, value: string) => {
    const newStages = [...stages]
    newStages[index] = { ...newStages[index], [field]: value }
    setStages(newStages)
  }

  // Save single field to database
  const saveSingleField = async (index: number, field: keyof Stage, value: string) => {
    const key = `${index}-${field}`
    
    // Check if value actually changed
    if (lastSavedValues.current[key] === value) {
      return
    }

    const stage = stages[index]
    if (!stage) return

    // Only save if we have minimum required fields
    if (!stage.load || !stage.lactate || !stage.duration) {
      return
    }

    try {
      const duration = minSecToDecimal(stage.duration)
      const targetDuration = parseFloat(selectedTestInfo.stageDuration_min)
      const isFinalApproximation = duration < targetDuration

      await fetch('/api/lactate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: selectedTestInfo.testId,
          stage: stage.stage,
          duration: duration,
          load: parseFloat(stage.load),
          theoreticalLoad: isFinalApproximation ? parseFloat(stage.load) : undefined,
          heartRate: stage.heartRate ? parseInt(stage.heartRate) : undefined,
          lactate: parseFloat(stage.lactate),
          rrSystolic: stage.rrSystolic ? parseInt(stage.rrSystolic) : undefined,
          rrDiastolic: stage.rrDiastolic ? parseInt(stage.rrDiastolic) : undefined,
          isFinalApproximation: isFinalApproximation,
          notes: stage.notes || undefined
        })
      })

      lastSavedValues.current[key] = value
      checkProtocolStatus()
    } catch (error) {
      console.error('Error saving field:', error)
      setSaveStatus({ type: 'error', message: 'Error saving data' })
    }
  }

  // Check if protocol is complete
  const checkProtocolStatus = () => {
    const completeStages = stages.filter(s => 
      s.load && 
      s.lactate && 
      s.heartRate && 
      s.duration
    )

    if (completeStages.length >= 3) {
      setSaveStatus({ 
        type: 'success', 
        message: `Protocol complete: ${completeStages.length} stages with all required fields` 
      })
    } else if (completeStages.length > 0) {
      setSaveStatus({ 
        type: 'info', 
        message: `${completeStages.length}/3 complete stages (need Stage, Load, Lactate, HF, and Duration)` 
      })
    } else {
      setSaveStatus({ 
        type: 'info', 
        message: 'Fill at least 3 stages with Load, Lactate, HF, and Duration to complete protocol' 
      })
    }
  }

  const handleBlur = async (index: number, field: keyof Stage, value: string) => {
    // Save when focus leaves the field
    updateStage(index, field, value)
    if (value) {
      await saveSingleField(index, field, value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: keyof Stage) => {
    const fields: (keyof Stage)[] = ['load', 'lactate', 'heartRate', 'rrSystolic', 'rrDiastolic', 'duration']
    const currentFieldIndex = fields.indexOf(field)

    // Arrow key navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (rowIndex > 0) {
        const prevKey = `${rowIndex - 1}-${field}`
        const input = inputRefs.current[prevKey]
        if (input) {
          input.focus()
          input.select()
        }
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (rowIndex < stages.length - 1) {
        const nextKey = `${rowIndex + 1}-${field}`
        const input = inputRefs.current[nextKey]
        if (input) {
          input.focus()
          input.select()
        }
      }
      return
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (currentFieldIndex > 0) {
        const prevField = fields[currentFieldIndex - 1]
        const prevKey = `${rowIndex}-${prevField}`
        const input = inputRefs.current[prevKey]
        if (input) {
          input.focus()
          input.select()
        }
      }
      return
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1]
        const nextKey = `${rowIndex}-${nextField}`
        const input = inputRefs.current[nextKey]
        if (input) {
          input.focus()
          input.select()
        }
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()

      // Navigate to next row in same column
      if (rowIndex < stages.length - 1) {
        // Move to same column in next row
        const nextKey = `${rowIndex + 1}-${field}`
        setTimeout(() => {
          const input = inputRefs.current[nextKey]
          if (input) {
            input.focus()
            input.select()
          }
        }, 0)
      } else {
        // Last row - check if duration is less than target
        const currentStage = stages[rowIndex]
        const currentDuration = minSecToDecimal(currentStage.duration || '0:00')
        const targetDuration = parseFloat(selectedTestInfo.stageDuration_min)
        
        // Only create new row if duration is >= target duration
        if (currentDuration >= targetDuration) {
          addNewRow()
          setTimeout(() => {
            const nextKey = `${rowIndex + 1}-${field}`
            const input = inputRefs.current[nextKey]
            if (input) {
              input.focus()
              input.select()
            }
          }, 50)
        }
        // If duration < target, just stay on current field (save will happen on blur)
      }
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          ⚡ Fast Input - All Stages
        </h2>
        {onChangeProtocol && (
          <button
            onClick={onChangeProtocol}
            className="px-4 py-2 bg-zinc-500 hover:bg-zinc-600 text-white rounded-md text-sm font-medium"
          >
            Change Protocol
          </button>
        )}
      </div>

      {/* Protocol Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-100">{selectedTestInfo.testId}</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
          {selectedTestInfo.device} • {selectedTestInfo.unit === 'watt' ? 'Power (W)' : 'Speed (km/h)'} • 
          Start: {selectedTestInfo.startLoad} • +{selectedTestInfo.increment} / {selectedTestInfo.stageDuration_min}min
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-4 text-sm text-green-800 dark:text-green-200">
        <ul className="list-disc list-inside space-y-1">
          <li>Stage counts automatically</li>
          <li>Navigation: Tab (horizontal) • Enter (down to next row, same column)</li>
          <li><strong>Auto-save:</strong> Each value saved to database when you leave the field</li>
          <li>Protocol marked complete when 3+ stages have Load, Lactate, HF, and Duration</li>
          <li>All fields editable</li>
          <li>If Duration &lt; target, new calculated load shown in red with target in brackets</li>
        </ul>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-teal-700 dark:bg-teal-800 text-white">
              <th className="border border-teal-600 dark:border-teal-700 px-3 py-2 text-left">Stage</th>
              <th className="border border-teal-600 dark:border-teal-700 px-3 py-2 text-left">
                Load ({selectedTestInfo.unit === 'watt' ? 'km/h' : 'Watt'})
              </th>
              <th className="border border-teal-600 dark:border-teal-700 px-3 py-2 text-left">Laktat</th>
              <th className="border border-teal-600 dark:border-teal-700 px-3 py-2 text-left">HF</th>
              <th className="border border-teal-600 dark:border-teal-700 px-3 py-2 text-left">BP Systolic</th>
              <th className="border border-teal-600 dark:border-teal-700 px-3 py-2 text-left">BP Diastolic</th>
              <th className="border border-teal-600 dark:border-teal-700 px-3 py-2 text-left">Dauer (min:sec)</th>
              <th className="border border-teal-600 dark:border-teal-700 px-3 py-2 text-center">
                <button
                  onClick={addNewRow}
                  className="bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 text-teal-700 dark:text-teal-300 rounded px-2 py-1 text-sm font-medium"
                >
                  + Add
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, index) => {
              const duration = minSecToDecimal(stage.duration || '0:00')
              const targetDuration = parseFloat(selectedTestInfo.stageDuration_min)
              const isIncomplete = duration < targetDuration
              const calculatedLoad = isIncomplete && stage.load
                ? (parseFloat(stage.load) * (duration / targetDuration)).toFixed(2)
                : null

              return (
                <tr key={stage.stage} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="border border-zinc-300 dark:border-zinc-600 px-3 py-2 bg-zinc-100 dark:bg-zinc-700">
                    {stage.stage}
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-600 px-3 py-2">
                    <input
                      ref={(el) => { inputRefs.current[`${index}-load`] = el }}
                      type="number"
                      step="0.1"
                      value={stage.load}
                      onChange={(e) => updateStage(index, 'load', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'load', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'load')}
                      onFocus={(e) => e.target.select()}
                      title="Load"
                      className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100 ${
                        isIncomplete ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                    />
                    {isIncomplete && calculatedLoad && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {calculatedLoad} ({stage.load})
                      </div>
                    )}
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-600 px-3 py-2">
                    <input
                      ref={(el) => { inputRefs.current[`${index}-lactate`] = el }}
                      type="number"
                      step="0.01"
                      value={stage.lactate}
                      onChange={(e) => updateStage(index, 'lactate', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'lactate', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'lactate')}
                      onFocus={(e) => e.target.select()}
                      title="Lactate"
                      className="w-full px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                    />
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-600 px-3 py-2">
                    <input
                      ref={(el) => { inputRefs.current[`${index}-heartRate`] = el }}
                      type="number"
                      value={stage.heartRate || ''}
                      onChange={(e) => updateStage(index, 'heartRate', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'heartRate', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'heartRate')}
                      onFocus={(e) => e.target.select()}
                      title="Heart Rate"
                      className="w-full px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                    />
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-600 px-3 py-2">
                    <input
                      ref={(el) => { inputRefs.current[`${index}-rrSystolic`] = el }}
                      type="number"
                      value={stage.rrSystolic || ''}
                      onChange={(e) => updateStage(index, 'rrSystolic', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'rrSystolic', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'rrSystolic')}
                      onFocus={(e) => e.target.select()}
                      title="Systolic BP"
                      className="w-full px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                    />
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-600 px-3 py-2">
                    <input
                      ref={(el) => { inputRefs.current[`${index}-rrDiastolic`] = el }}
                      type="number"
                      value={stage.rrDiastolic || ''}
                      onChange={(e) => updateStage(index, 'rrDiastolic', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'rrDiastolic', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'rrDiastolic')}
                      onFocus={(e) => e.target.select()}
                      title="Diastolic BP"
                      className="w-full px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                    />
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-600 px-3 py-2">
                    <input
                      ref={(el) => { inputRefs.current[`${index}-duration`] = el }}
                      type="text"
                      placeholder="3:00"
                      value={stage.duration}
                      onChange={(e) => updateStage(index, 'duration', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'duration', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'duration')}
                      onFocus={(e) => e.target.select()}
                      title="Duration (min:sec)"
                      className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100 ${
                        isIncomplete ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                    />
                  </td>
                  <td className="border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-center">
                    <button
                      onClick={() => removeRow(index)}
                      disabled={stages.length === 1}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 text-white rounded px-3 py-1 text-sm font-medium disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Status Message */}
      {saveStatus && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          saveStatus.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-200' :
          saveStatus.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200' :
          'bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200'
        }`}>
          {saveStatus.type === 'success' ? '✓' : saveStatus.type === 'error' ? '✗' : 'ℹ️'} {saveStatus.message}
        </div>
      )}
    </div>
  )
}
