'use client'

import { useState, useEffect } from 'react'

type MeasurementInputStyle = 'measurement_by_measurement' | 'fast_input'

export default function GeneralSettings() {
  const [inputStyle, setInputStyle] = useState<MeasurementInputStyle>('measurement_by_measurement')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/general')
      if (response.ok) {
        const data = await response.json()
        if (data.settings?.measurement_input_style) {
          setInputStyle(data.settings.measurement_input_style as MeasurementInputStyle)
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveInputStyle = async (newStyle: MeasurementInputStyle) => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: 'measurement_input_style',
          setting_value: newStyle
        })
      })

      if (response.ok) {
        setInputStyle(newStyle)
        setMessage({ type: 'success', text: 'Settings saved successfully' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-zinc-600 dark:text-zinc-400">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Measurement Input Style */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Measurement Input Dialog Style
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Choose how you want to input lactate measurements during tests.
        </p>

        <div className="space-y-3">
          {/* Measurement by Measurement */}
          <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50 border-zinc-200 dark:border-zinc-700">
            <input
              type="radio"
              name="input-style"
              value="measurement_by_measurement"
              checked={inputStyle === 'measurement_by_measurement'}
              onChange={(e) => saveInputStyle(e.target.value as MeasurementInputStyle)}
              disabled={saving}
              className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                Measurement by Measurement
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Enter each stage's measurements individually with a dialog for each stage. 
                Recommended for careful, step-by-step data entry.
              </div>
            </div>
          </label>

          {/* Fast Input */}
          <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50 border-zinc-200 dark:border-zinc-700">
            <input
              type="radio"
              name="input-style"
              value="fast_input"
              checked={inputStyle === 'fast_input'}
              onChange={(e) => saveInputStyle(e.target.value as MeasurementInputStyle)}
              disabled={saving}
              className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                Fast Input
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Enter all measurements in a single table view for faster data entry. 
                Recommended for experienced users who want quick batch input.
              </div>
            </div>
          </label>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {saving && (
          <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Saving...
          </div>
        )}
      </div>

      {/* Future Settings Placeholder */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-600">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <span className="text-2xl">🚧</span>
          <span className="font-medium">Additional settings coming soon...</span>
        </div>
      </div>
    </div>
  )
}
