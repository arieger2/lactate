'use client'

import { useState } from 'react'

interface MeasurementData {
  stepWorkload: number // W (watts) or speed
  bloodLactate: number // mmol/L
  heartRate: number // bpm
  vo2?: number // mL/kg/min (optional)
}

interface LactateReading {
  id: string
  timestamp: string
  value: number
  workload?: number // W (watts)
  heartRate?: number // bpm
  vo2?: number // mL/kg/min
  notes?: string
}

interface StructuredTest {
  id: string
  timestamp: string
  measurements: MeasurementData[]
  testType: 'step' | 'ramp'
  notes?: string
}

export default function LactateInput() {
  const [readings, setReadings] = useState<LactateReading[]>([])
  const [structuredTests, setStructuredTests] = useState<StructuredTest[]>([])
  const [inputMode, setInputMode] = useState<'simple' | 'structured'>('simple')
  
  // Simple input states
  const [currentValue, setCurrentValue] = useState('')
  const [currentWorkload, setCurrentWorkload] = useState('')
  const [currentHeartRate, setCurrentHeartRate] = useState('')
  const [currentVo2, setCurrentVo2] = useState('')
  const [currentNotes, setCurrentNotes] = useState('')

  // Structured input states
  const [numberOfMeasurements, setNumberOfMeasurements] = useState(5)
  const [testType, setTestType] = useState<'step' | 'ramp'>('step')
  const [measurements, setMeasurements] = useState<MeasurementData[]>([
    { stepWorkload: 100, bloodLactate: 1.1, heartRate: 120, vo2: 28 },
    { stepWorkload: 150, bloodLactate: 1.5, heartRate: 135, vo2: 34 },
    { stepWorkload: 200, bloodLactate: 2.1, heartRate: 150, vo2: 40 },
    { stepWorkload: 250, bloodLactate: 4.0, heartRate: 165, vo2: 47 },
    { stepWorkload: 300, bloodLactate: 8.2, heartRate: 180, vo2: 55 }
  ])
  const [structuredNotes, setStructuredNotes] = useState('')

  // Update measurements when number changes
  const updateNumberOfMeasurements = (newCount: number) => {
    setNumberOfMeasurements(newCount)
    setMeasurements(prev => {
      const updated = [...prev]
      if (newCount > prev.length) {
        // Add new measurements with incremental defaults
        for (let i = prev.length; i < newCount; i++) {
          const lastWorkload = prev[prev.length - 1]?.stepWorkload || 50
          updated.push({
            stepWorkload: lastWorkload + (i - prev.length + 1) * 50,
            bloodLactate: 1.0,
            heartRate: 120,
            vo2: undefined
          })
        }
      } else {
        // Remove excess measurements
        updated.splice(newCount)
      }
      return updated
    })
  }

  const updateMeasurement = (index: number, field: keyof MeasurementData, value: number | undefined) => {
    setMeasurements(prev => prev.map((measurement, i) => 
      i === index ? { ...measurement, [field]: value } : measurement
    ))
  }

  const handleSimpleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentValue || isNaN(Number(currentValue))) {
      alert('Please enter a valid lactate value')
      return
    }

    const newReading: LactateReading = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      value: Number(currentValue),
      workload: currentWorkload ? Number(currentWorkload) : undefined,
      heartRate: currentHeartRate ? Number(currentHeartRate) : undefined,
      vo2: currentVo2 ? Number(currentVo2) : undefined,
      notes: currentNotes.trim() || undefined
    }

    setReadings(prev => [newReading, ...prev])
    setCurrentValue('')
    setCurrentWorkload('')
    setCurrentHeartRate('')
    setCurrentVo2('')
    setCurrentNotes('')
  }

  const handleStructuredSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate measurements
    const invalidMeasurements = measurements.some(m => 
      isNaN(m.stepWorkload) || isNaN(m.bloodLactate) || isNaN(m.heartRate) ||
      m.stepWorkload <= 0 || m.bloodLactate < 0 || m.heartRate <= 0
    )
    
    if (invalidMeasurements) {
      alert('Please ensure all required fields have valid values')
      return
    }

    const newTest: StructuredTest = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      measurements: [...measurements],
      testType,
      notes: structuredNotes.trim() || undefined
    }

    setStructuredTests(prev => [newTest, ...prev])
    
    // Reset form with default values
    setMeasurements([
      { stepWorkload: 100, bloodLactate: 1.1, heartRate: 120, vo2: 28 },
      { stepWorkload: 150, bloodLactate: 1.5, heartRate: 135, vo2: 34 },
      { stepWorkload: 200, bloodLactate: 2.1, heartRate: 150, vo2: 40 },
      { stepWorkload: 250, bloodLactate: 4.0, heartRate: 165, vo2: 47 },
      { stepWorkload: 300, bloodLactate: 8.2, heartRate: 180, vo2: 55 }
    ])
    setStructuredNotes('')
  }

  const handleDelete = (id: string) => {
    setReadings(prev => prev.filter(reading => reading.id !== id))
  }

  const handleDeleteStructured = (id: string) => {
    setStructuredTests(prev => prev.filter(test => test.id !== id))
  }

  return (
    <div className="space-y-8">
      {/* Input Mode Toggle */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          Input Mode
        </h2>
        <div className="flex gap-4">
          <button
            onClick={() => setInputMode('simple')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              inputMode === 'simple'
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Simple Reading
          </button>
          <button
            onClick={() => setInputMode('structured')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              inputMode === 'structured'
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Step Test Protocol
          </button>
        </div>
      </div>

      {/* Simple Input Form */}
      {inputMode === 'simple' && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Add New Lactate Reading
          </h2>
          
          {/* Helper text */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Quick tip:</span> Only lactate value is required. Add workload, heart rate, and VO₂ for more comprehensive tracking.
            </p>
          </div>

          <form onSubmit={handleSimpleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="lactate-value" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Lactate Value (mmol/L) <span className="text-red-500">*</span>
                </label>
                <input
                  id="lactate-value"
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="e.g., 2.5"
                  required
                />
              </div>
              <div>
                <label htmlFor="simple-workload" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Workload (W)
                </label>
                <input
                  id="simple-workload"
                  type="number"
                  step="1"
                  min="0"
                  value={currentWorkload}
                  onChange={(e) => setCurrentWorkload(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="e.g., 200"
                />
              </div>
              <div>
                <label htmlFor="simple-heart-rate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Heart Rate (bpm)
                </label>
                <input
                  id="simple-heart-rate"
                  type="number"
                  step="1"
                  min="0"
                  max="250"
                  value={currentHeartRate}
                  onChange={(e) => setCurrentHeartRate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="e.g., 150"
                />
              </div>
              <div>
                <label htmlFor="simple-vo2" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  VO₂ (mL/kg/min)
                </label>
                <input
                  id="simple-vo2"
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentVo2}
                  onChange={(e) => setCurrentVo2(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="e.g., 40.5"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Add any relevant notes..."
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Add Reading
            </button>
          </form>
        </div>
      )}

      {/* Structured Test Form */}
      {inputMode === 'structured' && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Step Test Protocol
          </h2>
          <form onSubmit={handleStructuredSubmit} className="space-y-6">
            {/* Test Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="test-type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Test Type
                </label>
                <select
                  id="test-type"
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as 'step' | 'ramp')}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="step">Step Test</option>
                  <option value="ramp">Ramp Test</option>
                </select>
              </div>
              <div>
                <label htmlFor="num-measurements" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Number of Measurements
                </label>
                <input
                  id="num-measurements"
                  type="number"
                  min="2"
                  max="20"
                  value={numberOfMeasurements}
                  onChange={(e) => updateNumberOfMeasurements(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Measurements Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left p-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Step</th>
                    <th className="text-left p-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Workload (W)</th>
                    <th className="text-left p-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Lactate (mmol/L)</th>
                    <th className="text-left p-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">HR (bpm)</th>
                    <th className="text-left p-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">VO₂ (mL/kg/min)</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((measurement, index) => (
                    <tr key={index} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="p-2 text-sm text-zinc-600 dark:text-zinc-400">{index + 1}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={measurement.stepWorkload}
                          onChange={(e) => updateMeasurement(index, 'stepWorkload', Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={measurement.bloodLactate}
                          onChange={(e) => updateMeasurement(index, 'bloodLactate', Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={measurement.heartRate}
                          onChange={(e) => updateMeasurement(index, 'heartRate', Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={measurement.vo2 || ''}
                          onChange={(e) => updateMeasurement(index, 'vo2', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                          placeholder="Optional"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Example Values */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">Example Values:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Workload:</span>
                  <span className="text-blue-600 dark:text-blue-400 ml-1">100, 150, 200, 250, 300 W</span>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Lactate:</span>
                  <span className="text-blue-600 dark:text-blue-400 ml-1">1.1, 1.5, 2.1, 4.0, 8.2</span>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Heart Rate:</span>
                  <span className="text-blue-600 dark:text-blue-400 ml-1">120, 135, 150, 165, 180</span>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300 font-medium">VO₂:</span>
                  <span className="text-blue-600 dark:text-blue-400 ml-1">28, 34, 40, 47, 55</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="structured-notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Test Notes (Optional)
              </label>
              <textarea
                id="structured-notes"
                value={structuredNotes}
                onChange={(e) => setStructuredNotes(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Test conditions, equipment used, athlete status..."
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Save Test Protocol
            </button>
          </form>
        </div>
      )}

      {/* Simple Readings List */}
      {inputMode === 'simple' && readings.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Recent Readings ({readings.length})
          </h2>
          <div className="space-y-3">
            {readings.map((reading) => (
              <div
                key={reading.id}
                className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {reading.value} mmol/L
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(reading.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(reading.id)}
                    className="text-red-500 hover:text-red-700 font-medium text-sm"
                  >
                    Delete
                  </button>
                </div>

                {/* Additional measurements */}
                {(reading.workload || reading.heartRate || reading.vo2) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                    {reading.workload && (
                      <div className="flex justify-between items-center py-2 px-3 bg-white dark:bg-zinc-700 rounded">
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Workload:</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{reading.workload} W</span>
                      </div>
                    )}
                    {reading.heartRate && (
                      <div className="flex justify-between items-center py-2 px-3 bg-white dark:bg-zinc-700 rounded">
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Heart Rate:</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{reading.heartRate} bpm</span>
                      </div>
                    )}
                    {reading.vo2 && (
                      <div className="flex justify-between items-center py-2 px-3 bg-white dark:bg-zinc-700 rounded">
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">VO₂:</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{reading.vo2} mL/kg/min</span>
                      </div>
                    )}
                  </div>
                )}

                {reading.notes && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 p-3 bg-white dark:bg-zinc-700 rounded">
                    {reading.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured Tests List */}
      {inputMode === 'structured' && structuredTests.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Test Protocols ({structuredTests.length})
          </h2>
          <div className="space-y-6">
            {structuredTests.map((test) => (
              <div key={test.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                      {test.testType} Test
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(test.timestamp).toLocaleString()}
                    </span>
                    <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {test.measurements.length} measurements
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteStructured(test.id)}
                    className="text-red-500 hover:text-red-700 font-medium text-sm"
                  >
                    Delete
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="text-left p-2 text-zinc-700 dark:text-zinc-300">Workload</th>
                        <th className="text-left p-2 text-zinc-700 dark:text-zinc-300">Lactate</th>
                        <th className="text-left p-2 text-zinc-700 dark:text-zinc-300">HR</th>
                        <th className="text-left p-2 text-zinc-700 dark:text-zinc-300">VO₂</th>
                      </tr>
                    </thead>
                    <tbody>
                      {test.measurements.map((measurement, index) => (
                        <tr key={index} className="border-b border-zinc-100 dark:border-zinc-800">
                          <td className="p-2">{measurement.stepWorkload} W</td>
                          <td className="p-2">{measurement.bloodLactate} mmol/L</td>
                          <td className="p-2">{measurement.heartRate} bpm</td>
                          <td className="p-2">{measurement.vo2 ? `${measurement.vo2} mL/kg/min` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {test.notes && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded">
                    {test.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State Messages */}
      {inputMode === 'simple' && readings.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">
            No simple readings recorded yet. Add your first reading above.
          </p>
        </div>
      )}

      {inputMode === 'structured' && structuredTests.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">
            No test protocols recorded yet. Create your first step test above.
          </p>
        </div>
      )}
    </div>
  )
}