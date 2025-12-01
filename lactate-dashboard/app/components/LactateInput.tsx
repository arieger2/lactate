'use client'

import { useState, useEffect } from 'react'
import { useCustomer, Customer } from '@/lib/CustomerContext'

interface CustomerSession {
  session_id: string
  test_date: string
  test_type: string
  point_count: number
  last_updated: string
  notes?: string
}

interface TestInfo {
  testId: string
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

interface PatientProfile {
  firstName: string
  lastName: string
  birthDate?: string
  height_cm?: number
  weight_kg?: number
  email?: string
  phone?: string
  additionalNotes?: string
}

interface CustomerProfile {
  profileId: string
  patient: PatientProfile
  testInfos: TestInfo[]
  stages: Stage[]
}

export default function LactateInput() {
  // Use global customer context
  const { selectedCustomer, setSelectedCustomer, selectedSessionId, setSelectedSessionId } = useCustomer()
  
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
    firstName: '',
    lastName: '',
    profileId: '',
    birthDate: '',
    height_cm: '',
    weight_kg: '',
    email: '',
    phone: '',
    additionalNotes: ''
  })

  // Edit Customer States
  const [showEditCustomerForm, setShowEditCustomerForm] = useState(false)
  const [editCustomerError, setEditCustomerError] = useState<string | null>(null)

  // New Test Protocol States
  const [showNewTestProtocolForm, setShowNewTestProtocolForm] = useState(false)

  // Test Protocol States
  const [testInfos, setTestInfos] = useState<TestInfo[]>([])
  const [currentTestInfo, setCurrentTestInfo] = useState<TestInfo>({
    testId: '',
    testDate: new Date().toISOString().split('T')[0],
    testTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    device: 'bike',
    unit: 'watt',
    startLoad: '50',
    increment: '50',
    stageDuration_min: '3'
  })

  // Stage Input States
  const [selectedTestInfo, setSelectedTestInfo] = useState<TestInfo | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [currentStage, setCurrentStage] = useState({
    stage: 1,
    load: '50',
    lactate: '',
    heartRate: '',
    rrSystolic: '',
    rrDiastolic: '',
    duration: '3',
    notes: ''
  })

  // Search customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 2) {
        setCustomerResults([])
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        if (response.ok) {
          const data = await response.json()
          setCustomerResults(data.customers || [])
        }
      } catch (error) {
        // Silent error handling
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(searchCustomers, 300)
    return () => clearTimeout(debounceTimer)
  }, [customerSearch])

  // Fetch customer sessions
  const fetchCustomerSessions = async (customerId: string) => {
    setIsLoadingSessions(true)
    try {
      const response = await fetch(`/api/customer-sessions?customerId=${customerId}`)
      if (response.ok) {
        const data = await response.json()
        setCustomerSessions(data.sessions || [])
        setShowSessionSelector(true)
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setIsLoadingSessions(false)
    }
  }

  // Fetch test infos for selected customer
  const fetchTestInfos = async (profileId: string) => {
    try {
      const response = await fetch(`/api/test-infos?profile_id=${profileId}`)
      if (response.ok) {
        const data = await response.json()
        // Transform snake_case from API to camelCase for component
        const transformedTestInfos = (data.testInfos || []).map((ti: any) => ({
          testId: ti.test_id,
          testDate: ti.test_date,
          testTime: ti.test_time,
          device: ti.device,
          unit: ti.unit,
          startLoad: ti.start_load?.toString() || '50',
          increment: ti.increment?.toString() || '50',
          stageDuration_min: ti.stage_duration_min?.toString() || '3'
        }))
        setTestInfos(transformedTestInfos)
      }
    } catch (error) {
      console.error('Error fetching test infos:', error)
    }
  }

  // Handle session selection
  const handleSessionSelect = (session: CustomerSession) => {
    setSelectedSession(session)
    setSelectedSessionId(session.session_id)
  }

  // Create new customer
  const createCustomer = async () => {
    try {
      const finalFirstName = (newCustomer.firstName || '').trim() || 'Max'
      const finalLastName = (newCustomer.lastName || '').trim() || 'Mustermann'
      const finalProfileId = (newCustomer.profileId || '').trim() || `CUST-${Date.now()}`

      console.log('Creating customer with:', {
        firstName: finalFirstName,
        lastName: finalLastName,
        profileId: finalProfileId,
        original: newCustomer
      })

      const customerProfile: CustomerProfile = {
        profileId: finalProfileId,
        patient: {
          firstName: finalFirstName,
          lastName: finalLastName,
          birthDate: newCustomer.birthDate || undefined,
          height_cm: newCustomer.height_cm ? parseFloat(newCustomer.height_cm) : undefined,
          weight_kg: newCustomer.weight_kg ? parseFloat(newCustomer.weight_kg) : undefined,
          email: newCustomer.email || undefined,
          phone: newCustomer.phone || undefined,
          additionalNotes: newCustomer.additionalNotes || undefined
        },
        testInfos: testInfos.map(ti => ({
          testId: ti.testId || `TEST-${Date.now()}`,
          testDate: ti.testDate,
          testTime: ti.testTime,
          device: ti.device,
          unit: ti.unit,
          startLoad: ti.startLoad,
          increment: ti.increment,
          stageDuration_min: ti.stageDuration_min
        })),
        stages: []
      }

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerProfile)
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedCustomer({
          customer_id: data.customer.customer_id,
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone
        })
        
        // Save test infos to database
        for (const testInfo of customerProfile.testInfos) {
          await fetch('/api/test-infos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              test_id: testInfo.testId,
              profile_id: finalProfileId,
              test_date: testInfo.testDate,
              test_time: testInfo.testTime,
              device: testInfo.device,
              unit: testInfo.unit,
              start_load: parseFloat(testInfo.startLoad),
              increment: parseFloat(testInfo.increment),
              stage_duration_min: parseInt(testInfo.stageDuration_min)
            })
          })
        }

        setShowNewCustomerForm(false)
        setNewCustomerError(null)
        setNewCustomer({
          firstName: '',
          lastName: '',
          profileId: '',
          birthDate: '',
          height_cm: '',
          weight_kg: '',
          email: '',
          phone: '',
          additionalNotes: ''
        })
        
        // Fetch test infos for the new customer
        await fetchTestInfos(finalProfileId)
      } else {
        const error = await response.json()
        const errorMsg = error.error || 'Failed to create customer'
        const technicalDetails = error.technicalDetails ? `\n\nTechnical details: ${error.technicalDetails}` : ''
        setNewCustomerError(errorMsg + technicalDetails)
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          setNewCustomerError('Cannot connect to server. Please check if the application is running.')
        } else {
          setNewCustomerError(`Network error: ${error.message}`)
        }
      } else {
        setNewCustomerError('Network error. Please try again.')
      }
    }
  }

  // Update existing customer
  const updateCustomer = async () => {
    if (!selectedCustomer) return
    
    try {
      const response = await fetch(`/api/customers/${selectedCustomer.customer_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newCustomer.firstName || selectedCustomer.name.split(' ')[0],
          lastName: newCustomer.lastName || selectedCustomer.name.split(' ').slice(1).join(' '),
          birthDate: newCustomer.birthDate || undefined,
          height_cm: newCustomer.height_cm ? parseFloat(newCustomer.height_cm) : undefined,
          weight_kg: newCustomer.weight_kg ? parseFloat(newCustomer.weight_kg) : undefined,
          email: newCustomer.email || undefined,
          phone: newCustomer.phone || undefined,
          additionalNotes: newCustomer.additionalNotes || undefined
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setSelectedCustomer(result.customer)
        setShowEditCustomerForm(false)
        setEditCustomerError(null)
      } else {
        const error = await response.json()
        setEditCustomerError(error.error || 'Failed to update customer')
      }
    } catch (error) {
      setEditCustomerError('Network error. Please try again.')
    }
  }

  // Create new test protocol for existing customer
  const createNewTestProtocol = async () => {
    if (!selectedCustomer) return
    
    const testId = `TEST-${Date.now()}`
    
    try {
      const response = await fetch('/api/test-infos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: testId,
          profile_id: selectedCustomer.customer_id,
          test_date: currentTestInfo.testDate || new Date().toISOString().split('T')[0],
          test_time: currentTestInfo.testTime || new Date().toTimeString().split(' ')[0].substring(0, 5),
          device: currentTestInfo.device || 'bike',
          unit: currentTestInfo.unit || 'watt',
          start_load: parseFloat(currentTestInfo.startLoad || '50'),
          increment: parseFloat(currentTestInfo.increment || '50'),
          stage_duration_min: parseInt(currentTestInfo.stageDuration_min || '3')
        })
      })
      
      if (response.ok) {
        setShowNewTestProtocolForm(false)
        setCurrentTestInfo({
          testId: '',
          testDate: new Date().toISOString().split('T')[0],
          testTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
          device: 'bike',
          unit: 'watt',
          startLoad: '50',
          increment: '50',
          stageDuration_min: '3'
        })
        // Manually add to list instead of fetching
        const newTest: TestInfo = {
          testId: testId,
          testDate: currentTestInfo.testDate || new Date().toISOString().split('T')[0],
          testTime: currentTestInfo.testTime || new Date().toTimeString().split(' ')[0].substring(0, 5),
          device: currentTestInfo.device || 'bike',
          unit: currentTestInfo.unit || 'watt',
          startLoad: currentTestInfo.startLoad || '50',
          increment: currentTestInfo.increment || '50',
          stageDuration_min: currentTestInfo.stageDuration_min || '3'
        }
        setTestInfos(prev => [...prev, newTest])
      } else {
        const error = await response.json()
      }
    } catch (error) {
      // Silent error handling
    }
  }

  // Add test info
  const addTestInfo = () => {
    const testId = `TEST-${Date.now()}`
    const newTestInfo: TestInfo = {
      ...currentTestInfo,
      testId,
      testDate: currentTestInfo.testDate || new Date().toISOString().split('T')[0],
      testTime: currentTestInfo.testTime || new Date().toTimeString().split(' ')[0].substring(0, 5),
      device: currentTestInfo.device || 'bike',
      unit: currentTestInfo.unit || 'watt',
      startLoad: currentTestInfo.startLoad || '50',
      increment: currentTestInfo.increment || '50',
      stageDuration_min: currentTestInfo.stageDuration_min || '3'
    }
    
    setTestInfos(prev => [...prev, newTestInfo])
    setCurrentTestInfo({
      testId: '',
      testDate: new Date().toISOString().split('T')[0],
      testTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
      device: 'bike',
      unit: 'watt',
      startLoad: '50',
      increment: '50',
      stageDuration_min: '3'
    })
  }

  const removeTestInfo = (index: number) => {
    setTestInfos(prev => prev.filter((_, i) => i !== index))
  }

  // Auto-save stage data to database whenever values change
  const autoSaveStage = async (stageData: typeof currentStage) => {
    if (!selectedTestInfo || !stageData.load || !stageData.lactate) {
      return
    }
    
    try {
      const payload = {
        testId: selectedTestInfo.testId,
        stage: stageData.stage,
        load: parseFloat(stageData.load),
        lactate: parseFloat(stageData.lactate),
        heartRate: stageData.heartRate ? parseInt(stageData.heartRate) : undefined,
        rrSystolic: stageData.rrSystolic ? parseInt(stageData.rrSystolic) : undefined,
        rrDiastolic: stageData.rrDiastolic ? parseInt(stageData.rrDiastolic) : undefined,
        duration: stageData.duration ? parseInt(stageData.duration) : undefined,
        notes: stageData.notes || undefined
      }
      
      const response = await fetch('/api/lactate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const responseData = await response.json()
      
      if (response.ok) {
        // Update local stages array
        setStages(prev => {
          const existing = prev.find(s => s.stage === stageData.stage)
          if (existing) {
            return prev.map(s => s.stage === stageData.stage ? {
              stage: stageData.stage,
              load: parseFloat(stageData.load),
              lactate: parseFloat(stageData.lactate),
              heartRate: stageData.heartRate ? parseInt(stageData.heartRate) : undefined,
              rrSystolic: stageData.rrSystolic ? parseInt(stageData.rrSystolic) : undefined,
              rrDiastolic: stageData.rrDiastolic ? parseInt(stageData.rrDiastolic) : undefined,
              duration: stageData.duration ? parseInt(stageData.duration) : undefined,
              notes: stageData.notes || undefined
            } : s)
          } else {
            return [...prev, {
              stage: stageData.stage,
              load: parseFloat(stageData.load),
              lactate: parseFloat(stageData.lactate),
              heartRate: stageData.heartRate ? parseInt(stageData.heartRate) : undefined,
              rrSystolic: stageData.rrSystolic ? parseInt(stageData.rrSystolic) : undefined,
              rrDiastolic: stageData.rrDiastolic ? parseInt(stageData.rrDiastolic) : undefined,
              duration: stageData.duration ? parseInt(stageData.duration) : undefined,
              notes: stageData.notes || undefined
            }].sort((a, b) => a.stage - b.stage)
          }
        })
      } else {
        console.error('Failed to save stage:', response.status, responseData)
      }
    } catch (error) {
      console.error('❌ Error auto-saving stage:', error)
    }
  }
  
  const addStage = () => {
    if (!selectedTestInfo || !currentStage.load || !currentStage.lactate) {
      return
    }
    
    // Calculate next load based on increment
    const nextLoad = parseFloat(currentStage.load) + parseFloat(selectedTestInfo.increment)
    
    // Move to next stage
    setCurrentStage({
      stage: currentStage.stage + 1,
      load: nextLoad.toString(),
      lactate: '',
      heartRate: '',
      rrSystolic: '',
      rrDiastolic: '',
      duration: currentStage.duration,
      notes: ''
    })
  }
  
  const removeStage = async (stageNumber: number) => {
    if (!selectedTestInfo) return
    
    try {
      const remainingStages = stages.filter(s => s.stage !== stageNumber)
      
      // Delete entire test and re-save stages (cascade delete)
      await fetch(`/api/lactate-webhook?testId=${selectedTestInfo.testId}`, {
        method: 'DELETE'
      })
      
      // Re-save test_info
      await fetch('/api/test-infos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: selectedTestInfo.testId,
          profile_id: selectedCustomer?.customer_id,
          test_date: selectedTestInfo.testDate,
          test_time: selectedTestInfo.testTime,
          device: selectedTestInfo.device,
          unit: selectedTestInfo.unit,
          start_load: parseFloat(selectedTestInfo.startLoad),
          increment: parseFloat(selectedTestInfo.increment),
          stage_duration_min: parseInt(selectedTestInfo.stageDuration_min)
        })
      })
      
      // Re-save all remaining stages
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
      // Silent error handling
    }
  }
  
  const selectTestForStageEntry = async (testInfo: TestInfo) => {
    setSelectedTestInfo(testInfo)
    
    // Load existing stages from database
    try {
      const response = await fetch(`/api/lactate-webhook?testId=${testInfo.testId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.data && data.data.length > 0) {
          const loadedStages = data.data.map((s: any) => ({
            stage: s.stage,
            load: s.load,
            lactate: s.lactate,
            heartRate: s.heartRate,
            rrSystolic: s.rrSystolic,
            rrDiastolic: s.rrDiastolic,
            duration: s.duration,
            notes: s.notes
          }))
          setStages(loadedStages)
          
          const maxStage = Math.max(...loadedStages.map((s: any) => s.stage))
          const nextLoad = parseFloat(testInfo.startLoad) + (parseFloat(testInfo.increment) * maxStage)
          setCurrentStage({
            stage: maxStage + 1,
            load: nextLoad.toString(),
            lactate: '',
            heartRate: '',
            rrSystolic: '',
            rrDiastolic: '',
            duration: testInfo.stageDuration_min,
            notes: ''
          })
        } else {
          setStages([])
          setCurrentStage({
            stage: 1,
            load: testInfo.startLoad,
            lactate: '',
            heartRate: '',
            rrSystolic: '',
            rrDiastolic: '',
            duration: testInfo.stageDuration_min,
            notes: ''
          })
        }
      }
    } catch (error) {
      setCurrentStage({
        stage: 1,
        load: testInfo.startLoad,
        lactate: '',
        heartRate: '',
        rrSystolic: '',
        rrDiastolic: '',
        duration: testInfo.stageDuration_min,
        notes: ''
      })
      setStages([])
    }
  }

  // Load test infos when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      fetchTestInfos(selectedCustomer.customer_id)
    }
  }, [selectedCustomer])

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          👤 Customer / Patient
        </h2>

        {!selectedCustomer ? (
          <div>
            {/* Customer Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Search Existing Customer
              </label>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
              />
              {isSearching && <p className="text-sm text-zinc-500 mt-1">Searching...</p>}
              {customerResults.length > 0 && (
                <div className="mt-2 border border-zinc-200 dark:border-zinc-700 rounded-md max-h-48 overflow-y-auto">
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
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">ID: {customer.customer_id}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create New Customer Button */}
            <button
              onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
            >
              {showNewCustomerForm ? '✕ Cancel' : '➕ Create New Customer'}
            </button>

            {/* New Customer Form */}
            {showNewCustomerForm && (
              <div className="mt-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">New Customer Information</h3>
                
                {/* Patient Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomer.firstName}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Max"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomer.lastName}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Mustermann"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Profile ID
                    </label>
                    <input
                      type="text"
                      value={newCustomer.profileId}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, profileId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Auto-generated if empty"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      value={newCustomer.birthDate}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, birthDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={newCustomer.height_cm}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, height_cm: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="175"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={newCustomer.weight_kg}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, weight_kg: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="75"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="max@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>

                {/* Test Protocol Section */}
                <div className="mb-4 p-3 border border-blue-200 dark:border-blue-800 rounded bg-blue-50 dark:bg-blue-900/20">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Test Protocol (Optional)</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Date</label>
                      <input
                        type="date"
                        value={currentTestInfo.testDate}
                        onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, testDate: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Time</label>
                      <input
                        type="time"
                        value={currentTestInfo.testTime}
                        onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, testTime: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Device</label>
                      <select
                        value={currentTestInfo.device}
                        onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, device: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                      >
                        <option value="bike">Bike</option>
                        <option value="treadmill">Treadmill</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Unit</label>
                      <select
                        value={currentTestInfo.unit}
                        onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, unit: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                      >
                        <option value="watt">Watt (W)</option>
                        <option value="kmh">Speed (km/h)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Start Load</label>
                      <input
                        type="number"
                        value={currentTestInfo.startLoad}
                        onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, startLoad: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                        placeholder="50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Increment</label>
                      <input
                        type="number"
                        value={currentTestInfo.increment}
                        onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, increment: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                        placeholder="50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Duration (min)</label>
                      <input
                        type="number"
                        value={currentTestInfo.stageDuration_min}
                        onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, stageDuration_min: e.target.value }))}
                        className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                        placeholder="3"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={addTestInfo}
                        className="w-full px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                      >
                        + Add Protocol
                      </button>
                    </div>
                  </div>

                  {testInfos.length > 0 && (
                    <div className="space-y-1">
                      {testInfos.map((ti, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-blue-900/30 p-2 rounded">
                          <div className="flex-1">
                            <span className="font-medium text-blue-900 dark:text-blue-100">{ti.testDate}</span>
                            <span className="mx-2 text-blue-700 dark:text-blue-300">•</span>
                            <span className="text-blue-700 dark:text-blue-300">
                              {ti.device} ({ti.unit}): {ti.startLoad} +{ti.increment} / {ti.stageDuration_min}min
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTestInfo(idx)}
                            className="ml-2 px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={newCustomer.additionalNotes}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, additionalNotes: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                    placeholder="Additional notes..."
                    rows={2}
                  />
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
                    <div className="text-red-600 dark:text-red-400 text-sm ml-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                      <div className="font-medium mb-1">⚠️ Error</div>
                      <div className="whitespace-pre-line">{newCustomerError}</div>
                    </div>
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
                {selectedCustomer.date_of_birth && <p className="text-sm text-blue-700 dark:text-blue-300">DOB: {new Date(selectedCustomer.date_of_birth).toLocaleDateString()}</p>}
                {selectedCustomer.height_cm && <p className="text-sm text-blue-700 dark:text-blue-300">Height: {selectedCustomer.height_cm} cm</p>}
                {selectedCustomer.weight_kg && <p className="text-sm text-blue-700 dark:text-blue-300">Weight: {selectedCustomer.weight_kg} kg</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setNewCustomer({
                      firstName: selectedCustomer.name.split(' ')[0] || '',
                      lastName: selectedCustomer.name.split(' ').slice(1).join(' ') || '',
                      profileId: selectedCustomer.customer_id,
                      birthDate: selectedCustomer.date_of_birth || '',
                      height_cm: selectedCustomer.height_cm?.toString() || '',
                      weight_kg: selectedCustomer.weight_kg?.toString() || '',
                      email: selectedCustomer.email || '',
                      phone: selectedCustomer.phone || '',
                      additionalNotes: selectedCustomer.notes || ''
                    })
                    setShowEditCustomerForm(true)
                  }}
                  className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md"
                >
                  ✏️ Edit Profile
                </button>
                <button
                  onClick={() => {
                    setSelectedCustomer(null)
                    setSelectedSession(null)
                    setSelectedSessionId(null)
                    setCustomerSessions([])
                    setShowSessionSelector(false)
                    setTestInfos([])
                    setSelectedTestInfo(null)
                    setStages([])
                  }}
                  className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                >
                  Change Customer
                </button>
              </div>
            </div>

            {/* Edit Customer Form */}
            {showEditCustomerForm && (
              <div className="mt-4 p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-3">Edit Customer Profile</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">First Name</label>
                    <input
                      type="text"
                      value={newCustomer.firstName}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded dark:bg-green-900/50 dark:text-green-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={newCustomer.lastName}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded dark:bg-green-900/50 dark:text-green-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">Birth Date</label>
                    <input
                      type="date"
                      value={newCustomer.birthDate}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, birthDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded dark:bg-green-900/50 dark:text-green-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={newCustomer.height_cm}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, height_cm: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded dark:bg-green-900/50 dark:text-green-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={newCustomer.weight_kg}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, weight_kg: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded dark:bg-green-900/50 dark:text-green-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded dark:bg-green-900/50 dark:text-green-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded dark:bg-green-900/50 dark:text-green-100"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">Additional Notes</label>
                  <textarea
                    value={newCustomer.additionalNotes}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, additionalNotes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded dark:bg-green-900/50 dark:text-green-100"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={updateCustomer}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium text-sm"
                  >
                    💾 Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setShowEditCustomerForm(false)
                      setEditCustomerError(null)
                    }}
                    className="px-4 py-2 bg-zinc-400 hover:bg-zinc-500 text-white rounded-md font-medium text-sm"
                  >
                    Cancel
                  </button>
                  {editCustomerError && (
                    <span className="text-red-600 dark:text-red-400 text-sm font-medium ml-2 flex items-center gap-1">
                      ⚠️ {editCustomerError}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Protocol Selection & Stage Entry */}
      {selectedCustomer && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            🧪 Stage-by-Stage Data Entry
          </h2>

          {!selectedTestInfo ? (
            <div>
              {/* Test Protocol Selection */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    Select Test Protocol
                  </h3>
                  <button
                    onClick={() => setShowNewTestProtocolForm(!showNewTestProtocolForm)}
                    className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                  >
                    {showNewTestProtocolForm ? '✕ Cancel' : '➕ New Protocol'}
                  </button>
                </div>

                {/* New Test Protocol Form */}
                {showNewTestProtocolForm && (
                  <div className="mb-4 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Create New Test Protocol</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Date</label>
                        <input
                          type="date"
                          value={currentTestInfo.testDate}
                          onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, testDate: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Time</label>
                        <input
                          type="time"
                          value={currentTestInfo.testTime}
                          onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, testTime: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Device</label>
                        <select
                          value={currentTestInfo.device}
                          onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, device: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                        >
                          <option value="bike">Bike</option>
                          <option value="treadmill">Treadmill</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Unit</label>
                        <select
                          value={currentTestInfo.unit}
                          onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, unit: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                        >
                          <option value="watt">Watt (W)</option>
                          <option value="kmh">Speed (km/h)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Start Load</label>
                        <input
                          type="number"
                          value={currentTestInfo.startLoad}
                          onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, startLoad: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Increment</label>
                        <input
                          type="number"
                          value={currentTestInfo.increment}
                          onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, increment: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Stage Duration (min)</label>
                        <input
                          type="number"
                          value={currentTestInfo.stageDuration_min}
                          onChange={(e) => setCurrentTestInfo(prev => ({ ...prev, stageDuration_min: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded dark:bg-blue-900/50 dark:text-blue-100"
                        />
                      </div>
                    </div>

                    <button
                      onClick={createNewTestProtocol}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium text-sm"
                    >
                      💾 Create Protocol
                    </button>
                  </div>
                )}

                {testInfos.length === 0 && !showNewTestProtocolForm ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center py-4">
                    No test protocols available. Click "New Protocol" to create one.
                  </p>
                ) : !showNewTestProtocolForm ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {testInfos.map((ti, idx) => (
                      <button
                        key={ti.testId || `test-${idx}`}
                        type="button"
                        onClick={() => selectTestForStageEntry(ti)}
                        className="w-full p-4 text-left border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <div className="font-medium text-blue-900 dark:text-blue-100">{ti.testId}</div>
                        <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          {ti.testDate} • {ti.device} • {ti.unit === 'watt' ? 'Power (W)' : 'Speed (km/h)'}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Start: {ti.startLoad} {ti.unit} • Increment: +{ti.increment} • Duration: {ti.stageDuration_min} min
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div>
              {/* Selected Protocol Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">{selectedTestInfo.testId}</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {selectedTestInfo.device} • {selectedTestInfo.unit === 'watt' ? 'Power (W)' : 'Speed (km/h)'} • 
                      Start: {selectedTestInfo.startLoad} • +{selectedTestInfo.increment} / {selectedTestInfo.stageDuration_min}min
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTestInfo(null)
                      setStages([])
                    }}
                    className="px-3 py-1 text-sm bg-zinc-500 hover:bg-zinc-600 text-white rounded"
                  >
                    Change Protocol
                  </button>
                </div>
              </div>

              {/* Stage Input Form */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg mb-4" key={`stage-${currentStage.stage}`}>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                  Stage {currentStage.stage}
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {selectedTestInfo.unit === 'watt' ? 'Power (W)' : 'Speed (km/h)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step={selectedTestInfo.unit === 'watt' ? '5' : '0.5'}
                      value={currentStage.load || ''}
                      onBlur={(e) => {
                        if (e.target.value && currentStage.lactate) {
                          autoSaveStage(currentStage)
                        }
                      }}
                      onChange={(e) => {
                        setCurrentStage(prev => ({ ...prev, load: e.target.value }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder={selectedTestInfo.unit === 'watt' ? '200' : '10.0'}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Lactate (mmol/L) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={currentStage.lactate || ''}
                      onBlur={(e) => {
                        if (e.target.value && currentStage.load) {
                          autoSaveStage(currentStage)
                        }
                      }}
                      onChange={(e) => {
                        setCurrentStage(prev => ({ ...prev, lactate: e.target.value }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="2.5"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Heart Rate (bpm)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={currentStage.heartRate || ''}
                      onBlur={() => {
                        if (currentStage.load && currentStage.lactate) {
                          autoSaveStage(currentStage)
                        }
                      }}
                      onChange={(e) => {
                        setCurrentStage(prev => ({ ...prev, heartRate: e.target.value }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="150"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={currentStage.duration || ''}
                      onBlur={() => {
                        if (currentStage.load && currentStage.lactate) {
                          autoSaveStage(currentStage)
                        }
                      }}
                      onChange={(e) => {
                        setCurrentStage(prev => ({ ...prev, duration: e.target.value }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="3"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Blood Pressure Systolic
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={currentStage.rrSystolic || ''}
                      onBlur={() => {
                        if (currentStage.load && currentStage.lactate) {
                          autoSaveStage(currentStage)
                        }
                      }}
                      onChange={(e) => {
                        setCurrentStage(prev => ({ ...prev, rrSystolic: e.target.value }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="120"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Blood Pressure Diastolic
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={currentStage.rrDiastolic || ''}
                      onBlur={() => {
                        if (currentStage.load && currentStage.lactate) {
                          autoSaveStage(currentStage)
                        }
                      }}
                      onChange={(e) => {
                        setCurrentStage(prev => ({ ...prev, rrDiastolic: e.target.value }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="80"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={currentStage.notes || ''}
                      onBlur={() => {
                        if (currentStage.load && currentStage.lactate) {
                          autoSaveStage(currentStage)
                        }
                      }}
                      onChange={(e) => {
                        setCurrentStage(prev => ({ ...prev, notes: e.target.value }))
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                
                <button
                  onClick={addStage}
                  disabled={!currentStage.load || !currentStage.lactate}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-zinc-400 text-white rounded font-medium"
                >
                  ✓ Continue to Next Stage
                </button>
              </div>

              {/* Stages List */}
              {stages.length > 0 && (
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                    Recorded Stages ({stages.length}) - Click to Edit
                  </h4>
                  <div className="space-y-2">
                    {stages.map((stage) => (
                      <div 
                        key={stage.stage} 
                        className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer transition-colors"
                        onClick={() => {
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
                        }}
                      >
                        <div className="flex-1">
                          <span className="font-medium text-green-900 dark:text-green-100">Stage {stage.stage}</span>
                          <span className="mx-2 text-green-700 dark:text-green-300">•</span>
                          <span className="text-green-700 dark:text-green-300">
                            {stage.load} {selectedTestInfo.unit} • {stage.lactate} mmol/L
                          </span>
                          {stage.heartRate && (
                            <>
                              <span className="mx-2 text-green-700 dark:text-green-300">•</span>
                              <span className="text-green-700 dark:text-green-300">{stage.heartRate} bpm</span>
                            </>
                          )}
                          {(stage.rrSystolic || stage.rrDiastolic) && (
                            <>
                              <span className="mx-2 text-green-700 dark:text-green-300">•</span>
                              <span className="text-green-700 dark:text-green-300">
                                RR: {stage.rrSystolic}/{stage.rrDiastolic}
                              </span>
                            </>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeStage(stage.stage)
                          }}
                          className="ml-2 px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
