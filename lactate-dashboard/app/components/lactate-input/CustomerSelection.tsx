'use client'

import { useState, useEffect } from 'react'

interface Customer {
  customer_id: string
  name: string
  email?: string
  phone?: string
}

interface CustomerSelectionProps {
  onCustomerSelected: (customer: Customer) => void
  selectedCustomer: Customer | null
  onCreateNew: () => void
}

export default function CustomerSelection({ onCustomerSelected, selectedCustomer, onCreateNew }: CustomerSelectionProps) {
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [isSearching, setIsSearching] = useState(false)

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

  if (selectedCustomer) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          👤 Selected Customer
        </h2>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="font-medium text-blue-900 dark:text-blue-100">{selectedCustomer.name}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">ID: {selectedCustomer.customer_id}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
        👤 Customer / Patient
      </h2>
      
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

      <button
        onClick={onCreateNew}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium"
      >
        ➕ Create New Customer
      </button>
    </div>
  )
}
