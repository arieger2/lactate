'use client'

import { useState, useEffect } from 'react'
import { lactateDataService } from '@/lib/lactateDataService'

interface Customer {
  customer_id: string
  name: string
  email?: string
  phone?: string
  date_of_birth?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

interface MeasurementRow {
  id: string
  power: number
  lactate: number
  heartRate?: number
  vo2?: number
  timestamp: string
  notes?: string
}

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
  // Customer Management States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  // New Customer Form States
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    customerId: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    notes: ''
  })
  
  // Measurement Entry States
  const [measurementRows, setMeasurementRows] = useState<MeasurementRow[]>([])
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [currentMeasurement, setCurrentMeasurement] = useState({
    power: '',
    lactate: '',
    heartRate: '',
    vo2: '',
    notes: ''
  })
  
  // Legacy states (keeping for backward compatibility)
  const [readings, setReadings] = useState<LactateReading[]>([])
  const [structuredTests, setStructuredTests] = useState<StructuredTest[]>([])
  const [inputMode, setInputMode] = useState<'measurement' | 'simple' | 'structured'>('measurement')
  
  // Simple input states (legacy)
  const [currentValue, setCurrentValue] = useState('')
  const [currentWorkload, setCurrentWorkload] = useState('')
  const [currentHeartRate, setCurrentHeartRate] = useState('')
  const [currentVo2, setCurrentVo2] = useState('')
  const [currentNotes, setCurrentNotes] = useState('')

  // Structured input states (legacy)
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Customer search function
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setCustomerResults([])
      return
    }
    
    setIsSearching(true)
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(query)}`)
      const data = await response.json()
      if (data.success) {
        setCustomerResults(data.customers)
      }
    } catch (error) {
      console.error('Error searching customers:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Create new customer
  const createCustomer = async () => {
    setNewCustomerError(null)
    
    if (!newCustomer.name || !newCustomer.customerId) {
      setNewCustomerError('Name and Customer ID are required')
      return
    }

    setIsCreatingCustomer(true)
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      })
      
      const data = await response.json()
      console.log('🔍 RESPONSE:', response.status, data)
      
      if (response.ok && data.success) {
        setSelectedCustomer(data.customer)
        setShowNewCustomerForm(false)
        setNewCustomer({ name: '', customerId: '', email: '', phone: '', dateOfBirth: '', notes: '' })
        setNewCustomerError(null)
      } else {
        const errorMsg = data.error || `Failed to create customer (HTTP ${response.status})`
        console.log('🚨 SETTING ERROR:', errorMsg)
        setNewCustomerError(errorMsg)
        alert('ERROR SET: ' + errorMsg) // Temporary to verify
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to create customer'
      console.error('Setting error state:', errorMsg)
      setNewCustomerError(errorMsg)
    } finally {
      setIsCreatingCustomer(false)
    }
  }

  // Add measurement row
  const addMeasurementRow = () => {
    if (!currentMeasurement.lactate || !currentMeasurement.power) {
      alert('Power and Lactate values are required')
      return
    }

    const newRow: MeasurementRow = {
      id: Date.now().toString(),
      power: Number(currentMeasurement.power),
      lactate: Number(currentMeasurement.lactate),
      heartRate: currentMeasurement.heartRate ? Number(currentMeasurement.heartRate) : undefined,
      vo2: currentMeasurement.vo2 ? Number(currentMeasurement.vo2) : undefined,
      timestamp: new Date().toISOString(),
      notes: currentMeasurement.notes || undefined
    }

    setMeasurementRows(prev => [...prev, newRow])
    setCurrentMeasurement({ power: '', lactate: '', heartRate: '', vo2: '', notes: '' })
  }

  // Edit measurement row
  const editMeasurementRow = (row: MeasurementRow) => {
    setEditingRowId(row.id)
    setCurrentMeasurement({
      power: row.power.toString(),
      lactate: row.lactate.toString(),
      heartRate: row.heartRate?.toString() || '',
      vo2: row.vo2?.toString() || '',
      notes: row.notes || ''
    })
  }

  // Save edited measurement
  const saveEditedMeasurement = () => {
    if (!editingRowId) return
    
    setMeasurementRows(prev => prev.map(row => 
      row.id === editingRowId ? {
        ...row,
        power: Number(currentMeasurement.power),
        lactate: Number(currentMeasurement.lactate),
        heartRate: currentMeasurement.heartRate ? Number(currentMeasurement.heartRate) : undefined,
        vo2: currentMeasurement.vo2 ? Number(currentMeasurement.vo2) : undefined,
        notes: currentMeasurement.notes || undefined
      } : row
    ))
    
    setEditingRowId(null)
    setCurrentMeasurement({ power: '', lactate: '', heartRate: '', vo2: '', notes: '' })
  }

  // Delete measurement row
  const deleteMeasurementRow = (id: string) => {
    setMeasurementRows(prev => prev.filter(row => row.id !== id))
  }

  // Send all measurements to dashboard
  const sendAllMeasurements = async () => {
    if (measurementRows.length === 0) {
      alert('No measurements to send')
      return
    }

    setIsSubmitting(true)
    try {
      for (const row of measurementRows) {
        await sendToGlobalService({
          power: row.power,
          lactate: row.lactate,
          heartRate: row.heartRate,
          fatOxidation: row.vo2 ? row.vo2 / 100 : undefined
        })
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      alert(`✅ All ${measurementRows.length} measurements sent to dashboard successfully!`)
    } catch (error) {
      alert('❌ Error sending measurements')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Send data to global lactate service
  const sendToGlobalService = async (data: { power: number; lactate: number; heartRate?: number; fatOxidation?: number }) => {
    try {
      const state = lactateDataService.getState()
      const response = await fetch(`/api/lactate-webhook?sessionId=${state.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          power: data.power,
          lactate: data.lactate,
          heartRate: data.heartRate,
          fatOxidation: data.fatOxidation,
          sessionId: state.sessionId,
          testType: 'incremental'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Data sent to global service:', result)
      return result
    } catch (error) {
      console.error('Error sending to global service:', error)
      throw error
    }
  }

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

  const handleSimpleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentValue || isNaN(Number(currentValue))) {
      alert('Please enter a valid lactate value')
      return
    }

    if (!currentWorkload || isNaN(Number(currentWorkload))) {
      alert('Please enter a valid power/workload value')
      return
    }

    setIsSubmitting(true)

    try {
      // Send to global service
      await sendToGlobalService({
        power: Number(currentWorkload),
        lactate: Number(currentValue),
        heartRate: currentHeartRate ? Number(currentHeartRate) : undefined,
        fatOxidation: currentVo2 ? Number(currentVo2) / 100 : undefined // Convert VO2 to approximate fat oxidation
      })

      const newReading: LactateReading = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        value: Number(currentValue),
        workload: Number(currentWorkload),
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
      
      alert('✅ Data sent successfully to dashboard and database!')
    } catch (error) {
      alert('❌ Error sending data. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStructuredSubmit = async (e: React.FormEvent) => {
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

    setIsSubmitting(true)

    try {
      // Send each measurement to global service
      for (const measurement of measurements) {
        await sendToGlobalService({
          power: measurement.stepWorkload,
          lactate: measurement.bloodLactate,
          heartRate: measurement.heartRate,
          fatOxidation: measurement.vo2 ? measurement.vo2 / 100 : undefined
        })
        
        // Small delay between measurements to maintain order
        await new Promise(resolve => setTimeout(resolve, 100))
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
      
      alert(`✅ All ${measurements.length} measurements sent successfully to dashboard and database!`)
    } catch (error) {
      alert('❌ Error sending structured data. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (id: string) => {
    setReadings(prev => prev.filter(reading => reading.id !== id))
  }

  const handleDeleteStructured = (id: string) => {
    setStructuredTests(prev => prev.filter(test => test.id !== id))
  }



  return (
    <>
    <div className="space-y-8">

      {/* Customer Management Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          Customer Information
        </h2>
        
        {!selectedCustomer ? (
          <div className="space-y-4">
            {/* Customer Search */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Search Existing Customer
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    searchCustomers(e.target.value)
                  }}
                  placeholder="Search by name, ID, or email..."
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  onClick={() => setShowNewCustomerForm(true)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium"
                >
                  New Customer
                </button>
              </div>
              
              {/* Search Results */}
              {customerResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
                  {customerResults.map(customer => (
                    <div
                      key={customer.customer_id}
                      onClick={() => {
                        setSelectedCustomer(customer)
                        setCustomerSearch('')
                        setCustomerResults([])
                      }}
                      className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                    >
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{customer.name}</div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">ID: {customer.customer_id}</div>
                      {customer.email && (
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">{customer.email}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* New Customer Form */}
            {showNewCustomerForm && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-800">
                <h3 className="text-lg font-medium mb-3 text-zinc-900 dark:text-zinc-100">New Customer</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Customer ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomer.customerId}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, customerId: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Unique ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={newCustomer.dateOfBirth}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes</label>
                    <textarea
                      value={newCustomer.notes}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4 items-center">
                  <button
                    onClick={() => {
                      alert('Button clicked!')
                      createCustomer()
                    }}
                    disabled={isCreatingCustomer}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-md font-medium flex items-center gap-2"
                  >
                    {isCreatingCustomer ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Creating...
                      </>
                    ) : (
                      'Create Customer'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewCustomerForm(false)
                      setNewCustomerError(null)
                    }}
                    disabled={isCreatingCustomer}
                    className="px-4 py-2 bg-zinc-500 hover:bg-zinc-600 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white rounded-md font-medium"
                  >
                    Cancel
                  </button>
                  <span className="text-red-600 dark:text-red-400 text-sm font-medium ml-2 flex items-center gap-1">
                    ⚠️ ERROR: "{newCustomerError || 'NO ERROR SET'}"
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Selected Customer Display */
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">{selectedCustomer.name}</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">ID: {selectedCustomer.customer_id}</p>
                {selectedCustomer.email && <p className="text-sm text-blue-700 dark:text-blue-300">{selectedCustomer.email}</p>}
                {selectedCustomer.phone && <p className="text-sm text-blue-700 dark:text-blue-300">{selectedCustomer.phone}</p>}
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null)
                  setMeasurementRows([])
                }}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md"
              >
                Change Customer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Mode Toggle */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          Input Mode
        </h2>
        <div className="flex gap-4">
          <button
            onClick={() => setInputMode('measurement')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              inputMode === 'measurement'
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Manual Measurement Entry
          </button>
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

      {/* Manual Measurement Entry */}
      {inputMode === 'measurement' && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Manual Measurement Entry
          </h2>
          
          {/* Device Interface Info */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-6">
            <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">🔗 Automatic Device Interface Available</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-2">
              Measurement devices can automatically send data to: <code className="bg-green-100 dark:bg-green-800 px-1 rounded">/api/device-interface</code>
            </p>
            <details className="text-sm text-green-600 dark:text-green-400">
              <summary className="cursor-pointer hover:text-green-800 dark:hover:text-green-200">Show device integration format</summary>
              <pre className="mt-2 bg-green-100 dark:bg-green-800 p-2 rounded text-xs overflow-x-auto">
{`POST /api/device-interface
{
  "deviceId": "lactate-analyzer-01",
  "customerId": "${selectedCustomer?.customer_id || 'CUSTOMER_ID'}",
  "measurementData": [
    {
      "lactate": 2.5,
      "power": 200,
      "heartRate": 150,
      "vo2": 40.5
    }
  ]
}`}
              </pre>
            </details>
          </div>

          {/* Measurement Input Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4 text-zinc-900 dark:text-zinc-100">Add New Measurement</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Power (W) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={currentMeasurement.power}
                      onChange={(e) => setCurrentMeasurement(prev => ({ ...prev, power: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder="e.g., 200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Lactate (mmol/L) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="30"
                      value={currentMeasurement.lactate}
                      onChange={(e) => setCurrentMeasurement(prev => ({ ...prev, lactate: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder="e.g., 2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="250"
                      value={currentMeasurement.heartRate}
                      onChange={(e) => setCurrentMeasurement(prev => ({ ...prev, heartRate: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder="e.g., 150"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">VO₂ (mL/kg/min)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={currentMeasurement.vo2}
                      onChange={(e) => setCurrentMeasurement(prev => ({ ...prev, vo2: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder="e.g., 40.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes</label>
                  <input
                    type="text"
                    value={currentMeasurement.notes}
                    onChange={(e) => setCurrentMeasurement(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                    placeholder="Optional notes..."
                  />
                </div>
                
                <div className="flex gap-2">
                  {editingRowId ? (
                    <>
                      <button
                        onClick={saveEditedMeasurement}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditingRowId(null)
                          setCurrentMeasurement({ power: '', lactate: '', heartRate: '', vo2: '', notes: '' })
                        }}
                        className="px-4 py-2 bg-zinc-500 hover:bg-zinc-600 text-white rounded-md font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={addMeasurementRow}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
                    >
                      Add Measurement
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Measurements Table */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  Entered Measurements ({measurementRows.length})
                </h3>
                {measurementRows.length > 0 && (
                  <button
                    onClick={sendAllMeasurements}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-md font-medium text-sm"
                  >
                    {isSubmitting ? 'Sending...' : `Send All ${measurementRows.length} to Dashboard`}
                  </button>
                )}
              </div>
              
              {measurementRows.length > 0 ? (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-zinc-700 dark:text-zinc-300">Power (W)</th>
                          <th className="text-left p-2 font-medium text-zinc-700 dark:text-zinc-300">Lactate</th>
                          <th className="text-left p-2 font-medium text-zinc-700 dark:text-zinc-300">HR</th>
                          <th className="text-left p-2 font-medium text-zinc-700 dark:text-zinc-300">VO₂</th>
                          <th className="text-left p-2 font-medium text-zinc-700 dark:text-zinc-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {measurementRows.map((row, index) => (
                          <tr 
                            key={row.id} 
                            className={`border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                              editingRowId === row.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <td className="p-2 font-medium">{row.power} W</td>
                            <td className="p-2">{row.lactate} mmol/L</td>
                            <td className="p-2">{row.heartRate ? `${row.heartRate} bpm` : '-'}</td>
                            <td className="p-2">{row.vo2 ? `${row.vo2} mL/kg/min` : '-'}</td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => editMeasurementRow(row)}
                                  className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteMeasurementRow(row.id)}
                                  className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-8 text-center text-zinc-500 dark:text-zinc-400">
                  No measurements entered yet. Add your first measurement using the form on the left.
                </div>
              )}
              
              {measurementRows.length > 0 && (
                <div className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
                  <p>💡 Click "Edit" to modify existing measurements</p>
                  <p>🚀 Use "Send All" to transfer all measurements to the Performance Curve tab for analysis</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

            <div className="grid grid-cols-1 gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-all duration-150 active:scale-95 active:shadow-inner transform"
              >
                {isSubmitting ? '⏳ Sending to Dashboard...' : '📊 Send to Dashboard & Database'}
              </button>
              
              <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center">
                💡 Data will be sent to "Laktat Performance Kurve" tab and saved to PostgreSQL database
              </p>
              
              <div className="text-xs bg-zinc-50 dark:bg-zinc-800 p-2 rounded border">
                <strong>Global Session ID:</strong> <code className="text-blue-600 dark:text-blue-400">{lactateDataService.getState().sessionId}</code>
              </div>
            </div>
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

            <div className="grid grid-cols-1 gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-md transition-all duration-150 active:scale-95 active:shadow-inner transform"
              >
                {isSubmitting ? '⏳ Sending Test Protocol...' : `🚀 Send All ${measurements.length} Measurements to Dashboard`}
              </button>
              
              <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center">
                💡 Complete test protocol will be sent to "Laktat Performance Kurve" for analysis
              </p>
              
              <div className="text-xs bg-zinc-50 dark:bg-zinc-800 p-2 rounded border">
                <strong>Global Session ID:</strong> <code className="text-green-600 dark:text-green-400">{lactateDataService.getState().sessionId}</code>
              </div>
            </div>
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