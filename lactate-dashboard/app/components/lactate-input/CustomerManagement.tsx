'use client'

import { useState, useEffect } from 'react'

interface Customer {
  customer_id: string
  name: string
  email?: string
  phone?: string
  date_of_birth?: string
  height_cm?: number
  weight_kg?: number
  notes?: string
}

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

interface CustomerManagementProps {
  onCustomerSelected: (customer: Customer) => void
  selectedCustomer: Customer | null
  onCustomerChange: () => void
  testInfos: TestInfo[]
  onTestInfosChange: (testInfos: TestInfo[]) => void
}

export default function CustomerManagement({ 
  onCustomerSelected, 
  selectedCustomer,
  onCustomerChange,
  testInfos,
  onTestInfosChange
}: CustomerManagementProps) {
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [showEditCustomerForm, setShowEditCustomerForm] = useState(false)
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null)
  const [editCustomerError, setEditCustomerError] = useState<string | null>(null)
  
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

  const [currentTestInfo, setCurrentTestInfo] = useState<TestInfo>({
    testDate: new Date().toISOString().split('T')[0],
    testTime: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    device: 'bike',
    unit: 'watt',
    startLoad: '50',
    increment: '50',
    stageDuration_min: '3'
  })

  // Search customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 1) {
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
        console.error('Error searching customers:', error)
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(searchCustomers, 300)
    return () => clearTimeout(debounceTimer)
  }, [customerSearch])

  const createCustomer = async () => {
    if (!newCustomer.firstName || !newCustomer.lastName) {
      setNewCustomerError('First name and last name are required.')
      return
    }
    
    if (!newCustomer.profileId || newCustomer.profileId.trim() === '') {
      setNewCustomerError('Profile ID is required.')
      return
    }

    try {
      const payload = {
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        profileId: newCustomer.profileId,
        birthDate: newCustomer.birthDate || undefined,
        email: newCustomer.email || undefined,
        phone: newCustomer.phone || undefined,
        height_cm: newCustomer.height_cm ? parseFloat(newCustomer.height_cm) : undefined,
        weight_kg: newCustomer.weight_kg ? parseFloat(newCustomer.weight_kg) : undefined,
        additionalNotes: newCustomer.additionalNotes || undefined
      }

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        onCustomerSelected(data.customer)
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
      } else {
        const errorData = await response.json()
        setNewCustomerError(errorData.error || 'Failed to create customer')
      }
    } catch (error) {
      setNewCustomerError('Network error creating customer')
      console.error('Error creating customer:', error)
    }
  }

  const updateCustomer = async () => {
    if (!selectedCustomer || !newCustomer.firstName || !newCustomer.lastName) {
      setEditCustomerError('First name and last name are required.')
      return
    }

    try {
      const payload = {
        name: `${newCustomer.firstName} ${newCustomer.lastName}`,
        email: newCustomer.email || undefined,
        phone: newCustomer.phone || undefined,
        date_of_birth: newCustomer.birthDate || undefined,
        height_cm: newCustomer.height_cm ? parseFloat(newCustomer.height_cm) : undefined,
        weight_kg: newCustomer.weight_kg ? parseFloat(newCustomer.weight_kg) : undefined,
        notes: newCustomer.additionalNotes || undefined
      }

      const response = await fetch(`/api/customers/${selectedCustomer.customer_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        onCustomerSelected(data.customer)
        setShowEditCustomerForm(false)
        setEditCustomerError(null)
      } else {
        const errorData = await response.json()
        setEditCustomerError(errorData.error || 'Failed to update customer')
      }
    } catch (error) {
      setEditCustomerError('Network error updating customer')
      console.error('Error updating customer:', error)
    }
  }

  const addTestInfo = () => {
    if (!currentTestInfo.testDate || !currentTestInfo.device) {
      return
    }
    onTestInfosChange([...testInfos, { ...currentTestInfo }])
  }

  const removeTestInfo = (index: number) => {
    onTestInfosChange(testInfos.filter((_, i) => i !== index))
  }

  if (selectedCustomer) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          👤 Customer / Patient
        </h2>
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
                onClick={onCustomerChange}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md"
              >
                Change Customer
              </button>
            </div>
          </div>

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
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
        👤 Customer / Patient
      </h2>
      
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
                    onCustomerSelected(customer)
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
                    onChange={(e) => {
                      const device = e.target.value
                      setCurrentTestInfo(prev => {
                        if (device === 'treadmill') {
                          return { ...prev, device, unit: 'kmh', startLoad: '8', increment: '1' }
                        } else if (device === 'bike') {
                          return { ...prev, device, unit: 'watt', startLoad: '50', increment: '50' }
                        }
                        return { ...prev, device }
                      })
                    }}
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
                    step="0.1"
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
                    step="0.1"
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
    </div>
  )
}
