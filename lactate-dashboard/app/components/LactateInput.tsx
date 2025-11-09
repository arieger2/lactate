'use client'

import { useState } from 'react'

interface LactateReading {
  id: string
  timestamp: string
  value: number
  notes?: string
}

export default function LactateInput() {
  const [readings, setReadings] = useState<LactateReading[]>([])
  const [currentValue, setCurrentValue] = useState('')
  const [currentNotes, setCurrentNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentValue || isNaN(Number(currentValue))) {
      alert('Please enter a valid lactate value')
      return
    }

    const newReading: LactateReading = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      value: Number(currentValue),
      notes: currentNotes.trim() || undefined
    }

    setReadings(prev => [newReading, ...prev])
    setCurrentValue('')
    setCurrentNotes('')
  }

  const handleDelete = (id: string) => {
    setReadings(prev => prev.filter(reading => reading.id !== id))
  }

  return (
    <div className="space-y-8">
      {/* Input Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          Add New Lactate Reading
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="lactate-value" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Lactate Value (mmol/L)
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

      {/* Readings List */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          Recent Readings ({readings.length})
        </h2>
        
        {readings.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">
            No readings recorded yet. Add your first reading above.
          </p>
        ) : (
          <div className="space-y-3">
            {readings.map((reading) => (
              <div
                key={reading.id}
                className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {reading.value} mmol/L
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(reading.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {reading.notes && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                      {reading.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(reading.id)}
                  className="text-red-500 hover:text-red-700 font-medium text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}