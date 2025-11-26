'use client'

import { useState, useEffect } from 'react'
import { lactateDataService } from '@/lib/lactateDataService'
import { useCustomer, Customer } from '@/lib/CustomerContext'

interface CustomerSession {
  session_id: string
  test_date: string
  test_type: string
  point_count: number
  last_updated: string
  notes?: string
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

export default function LactateInput() {
  // Use global customer context
  const { selectedCustomer, setSelectedCustomer } = useCustomer()
  
  // Customer Management States
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Session Management States
  const [customerSessions, setCustomerSessions] = useState<CustomerSession[]>([])
  const [selectedSession, setSelectedSession] = useState<CustomerSession | null>(null)
  const [showSessionSelector, setShowSessionSelector] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  
  // New Customer Form States
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null)
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
  const [isEditingEnabled, setIsEditingEnabled] = useState(false)
  const [currentMeasurement, setCurrentMeasurement] = useState({
    power: '',
    lactate: '',
    heartRate: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Search customers with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch.trim()) {
        searchCustomers(customerSearch)
      } else {
        setCustomerResults([])
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [customerSearch])

  // Load session data when selectedSession changes
  useEffect(() => {
    const loadSessionData = async () => {
      if (selectedSession) {
        try {
          const response = await fetch(`/api/lactate-webhook?sessionId=${selectedSession.session_id}`)
          if (response.ok) {
            const result = await response.json()
            console.log('Loading session data:', result)
            
            if (result.data && Array.isArray(result.data)) {
              const loadedRows: MeasurementRow[] = result.data.map((item: any, index: number) => ({
                id: `loaded_${selectedSession.session_id}_${index}`,
                power: item.power || 0,
                lactate: item.lactate || 0,
                heartRate: item.heartRate || undefined,
                vo2: item.fatOxidation ? item.fatOxidation * 100 : undefined,
                timestamp: item.timestamp || new Date().toISOString(),
                notes: undefined
              }))
              setMeasurementRows(loadedRows)
            }
          }
        } catch (error) {
          console.error('Error loading session data:', error)
        }
      }
    }
    
    loadSessionData()
  }, [selectedSession])

  // Fetch sessions for selected customer
  const fetchCustomerSessions = async (customerId: string) => {
    setIsLoadingSessions(true)
    try {
      const response = await fetch(`/api/customer-sessions?customerId=${customerId}`)
      if (response.ok) {
        const sessions = await response.json()
        setCustomerSessions(sessions)
        setShowSessionSelector(sessions.length > 0)
      } else {
        setCustomerSessions([])
        setShowSessionSelector(false)
      }
    } catch (error) {
      console.error('Error fetching customer sessions:', error)
      setCustomerSessions([])
      setShowSessionSelector(false)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  // Handle customer selection and load their sessions
  const handleCustomerSelect = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch('')
    setCustomerResults([])
    
    // Fetch sessions for this customer
    await fetchCustomerSessions(customer.customer_id)
  }

  // Handle session selection and load session data
  const handleSessionSelect = async (session: CustomerSession) => {
    setSelectedSession(session)
    setShowSessionSelector(false)
    
    // Load the session data into the Entered Measurements table
    try {
      const response = await fetch(`/api/lactate-webhook?sessionId=${session.session_id}`)
      if (response.ok) {
        const result = await response.json()
        console.log('Loaded session data:', result)
        
        // Convert session data to measurement rows
        if (result.data && Array.isArray(result.data)) {
          const loadedRows: MeasurementRow[] = result.data.map((item: any, index: number) => ({
            id: `loaded_${session.session_id}_${index}`,
            power: item.power || 0,
            lactate: item.lactate || 0,
            heartRate: item.heartRate || item.heart_rate || undefined,
            vo2: item.fatOxidation ? item.fatOxidation * 100 : (item.fat_oxidation ? item.fat_oxidation * 100 : undefined),
            timestamp: item.timestamp || new Date().toISOString(),
            notes: item.notes || undefined
          }))
          setMeasurementRows(loadedRows)
        }
      }
    } catch (error) {
      console.error('Error loading session data:', error)
      alert('Fehler beim Laden der Session-Daten')
    }
  }

  // Send data to global lactate service
  const sendToGlobalService = async (data: { 
    power: number; 
    lactate: number; 
    heartRate?: number; 
    fatOxidation?: number 
  }) => {
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
          testType: 'manual',
          customerId: selectedCustomer?.customer_id
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

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      })
      
      const data = await response.json()
      if (response.ok && data.success) {
        setSelectedCustomer(data.customer)
        setShowNewCustomerForm(false)
        setNewCustomer({ name: '', customerId: '', email: '', phone: '', dateOfBirth: '', notes: '' })
        setNewCustomerError(null)
      } else {
        setNewCustomerError(data.error || `Failed to create customer (HTTP ${response.status})`)
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      setNewCustomerError(error instanceof Error ? error.message : 'Failed to create customer')
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
      timestamp: new Date().toISOString(),
      notes: currentMeasurement.notes || undefined
    }

    setMeasurementRows(prev => [...prev, newRow])
    setCurrentMeasurement({ power: '', lactate: '', heartRate: '', notes: '' })
  }

  // Edit measurement row
  const editMeasurementRow = (row: MeasurementRow) => {
    setEditingRowId(row.id)
    setCurrentMeasurement({
      power: row.power.toString(),
      lactate: row.lactate.toString(),
      heartRate: row.heartRate?.toString() || '',
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
        notes: currentMeasurement.notes || undefined
      } : row
    ))
    
    setEditingRowId(null)
    setCurrentMeasurement({ power: '', lactate: '', heartRate: '', notes: '' })
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
        // Small delay to maintain order
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      alert(`✅ All ${measurementRows.length} measurements sent to dashboard successfully!`)
      // Clear measurements after successful send
      setMeasurementRows([])
    } catch (error) {
      alert('❌ Error sending measurements')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
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
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name, ID, or email..."
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium"
                >
                  {showNewCustomerForm ? 'Cancel' : 'New Customer'}
                </button>
              </div>
              
              {isSearching && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Searching...</p>
              )}
              
              {/* Search Results */}
              {customerResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md">
                  {customerResults.map(customer => (
                    <div
                      key={customer.customer_id}
                      onClick={() => handleCustomerSelect(customer)}
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

              {customerSearch.trim() && customerResults.length === 0 && !isSearching && (
                <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  No customers found. Use "New Customer" to create one.
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
                    onClick={createCustomer}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium"
                  >
                    Create Customer
                  </button>
                  <button
                    onClick={() => {
                      setShowNewCustomerForm(false)
                      setNewCustomerError(null)
                    }}
                    className="px-4 py-2 bg-zinc-500 hover:bg-zinc-600 text-white rounded-md font-medium"
                  >
                    Cancel
                  </button>
                  {newCustomerError && (
                    <span className="text-red-600 dark:text-red-400 text-sm font-medium ml-2 flex items-center gap-1">
                      ⚠️ {newCustomerError}
                    </span>
                  )}
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
              <div className="flex gap-2">
                <button
                  onClick={() => fetchCustomerSessions(selectedCustomer.customer_id)}
                  disabled={isLoadingSessions}
                  className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-md"
                >
                  {isLoadingSessions ? '⏳' : '📊'} Sessions
                </button>
                <button
                  onClick={() => {
                    setSelectedCustomer(null)
                    setSelectedSession(null)
                    setCustomerSessions([])
                    setShowSessionSelector(false)
                    setMeasurementRows([])
                  }}
                  className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                >
                  Change Customer
                </button>
              </div>
            </div>

            {/* Session Selection */}
            {showSessionSelector && customerSessions.length > 0 && (
              <div className="mt-3 border-t border-blue-200 dark:border-blue-700 pt-3">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Verfügbare Sessions ({customerSessions.length})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {customerSessions.map(session => (
                    <div
                      key={session.session_id}
                      onClick={() => handleSessionSelect(session)}
                      className={`p-2 rounded-md cursor-pointer border transition-colors ${
                        selectedSession?.session_id === session.session_id
                          ? 'border-blue-500 bg-blue-100 dark:bg-blue-800/50'
                          : 'border-blue-200 dark:border-blue-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-800/30'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {new Date(session.test_date).toLocaleDateString('de-DE')} - {session.test_type}
                          </div>
                          <div className="text-xs text-blue-700 dark:text-blue-300">
                            {session.point_count} Datenpunkte
                          </div>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {new Date(session.last_updated).toLocaleTimeString('de-DE')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSession && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                <div className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✅ Session ausgewählt: {new Date(selectedSession.test_date).toLocaleDateString('de-DE')}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  {selectedSession.point_count} Datenpunkte - {selectedSession.test_type}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Measurement Entry */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          ✏️ Manual Measurement Entry
        </h2>

        {/* Customer Required Message */}
        {!selectedCustomer && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              ⚠️ Please select or create a customer above before adding measurements.
            </p>
          </div>
        )}

        {/* Measurement Input Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={selectedCustomer ? '' : 'opacity-50 pointer-events-none'}>
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
                        setCurrentMeasurement({ power: '', lactate: '', heartRate: '', notes: '' })
                      }}
                      className="px-4 py-2 bg-zinc-500 hover:bg-zinc-600 text-white rounded-md font-medium"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={addMeasurementRow}
                    disabled={!selectedCustomer}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-400 text-white rounded-md font-medium"
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
              <div className="flex gap-2">
                {measurementRows.length > 0 && (
                  <>
                    <button
                      onClick={() => setIsEditingEnabled(!isEditingEnabled)}
                      className={`px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                        isEditingEnabled
                          ? 'bg-orange-500 hover:bg-orange-600 text-white'
                          : 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {isEditingEnabled ? '✏️ Bearbeitung An' : '🔒 Bearbeitung Aus'}
                    </button>
                    <button
                      onClick={sendAllMeasurements}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-md font-medium text-sm"
                    >
                      {isSubmitting ? 'Sending...' : `Send All ${measurementRows.length} to Dashboard`}
                    </button>
                  </>
                )}
              </div>
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
                        {isEditingEnabled && (
                          <th className="text-left p-2 font-medium text-zinc-700 dark:text-zinc-300">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {measurementRows.map((row) => (
                        <tr 
                          key={row.id} 
                          className={`border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                            editingRowId === row.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <td className="p-2 font-medium">{row.power} W</td>
                          <td className="p-2">{row.lactate} mmol/L</td>
                          <td className="p-2">{row.heartRate ? `${row.heartRate} bpm` : '-'}</td>
                          {isEditingEnabled && (
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
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-8 text-center text-zinc-500 dark:text-zinc-400">
                {selectedCustomer 
                  ? "No measurements entered yet. Add your first measurement using the form on the left."
                  : "Select a customer first to begin adding measurements."
                }
              </div>
            )}
            
            {measurementRows.length > 0 && (
              <div className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
                <p>💡 {isEditingEnabled ? 'Bearbeitung aktiviert - klicken Sie auf "Edit" oder "Delete"' : 'Klicken Sie auf "🔒 Bearbeitung Aus" um Daten zu bearbeiten'}</p>
                <p>🚀 Use "Send All" to transfer all measurements to the Performance Curve tab for analysis</p>
              </div>
            )}
          </div>
        </div>

        {/* Session Information */}
        {selectedCustomer && (
          <div className="mt-6 text-xs bg-zinc-50 dark:bg-zinc-800 p-3 rounded border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div><strong>Customer:</strong> {selectedCustomer.name}</div>
              <div><strong>Session ID:</strong> <code className="text-blue-600 dark:text-blue-400">{lactateDataService.getState().sessionId}</code></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}