'use client'

import { useState } from 'react'

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

interface TestProtocolManagerProps {
  customerId: string
  testInfos: TestInfo[]
  onTestInfosChange: (testInfos: TestInfo[]) => void
  onTestSelected: (testInfo: TestInfo) => void
}

export default function TestProtocolManager({
  customerId,
  testInfos,
  onTestInfosChange,
  onTestSelected
}: TestProtocolManagerProps) {
  const [showNewTestProtocolForm, setShowNewTestProtocolForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetTestId, setDeleteTargetTestId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentTestInfo, setCurrentTestInfo] = useState<TestInfo>({
    testDate: new Date().toISOString().split('T')[0],
    testTime: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    device: 'bike',
    unit: 'watt',
    startLoad: '50',
    increment: '50',
    stageDuration_min: '3'
  })

  const createNewTestProtocol = async () => {
    if (!currentTestInfo.testDate || !currentTestInfo.device) {
      return
    }

    try {
      const testId = `TEST-${String(Date.now()).slice(-5)}`
      const payload = {
        test_id: testId,
        customer_id: customerId,
        test_date: currentTestInfo.testDate,
        test_time: currentTestInfo.testTime || '00:00',
        device: currentTestInfo.device,
        unit: currentTestInfo.unit,
        start_load: parseFloat(currentTestInfo.startLoad),
        increment: parseFloat(currentTestInfo.increment),
        stage_duration_min: parseInt(currentTestInfo.stageDuration_min)
      }

      const response = await fetch('/api/test-infos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const newTestInfo = { ...currentTestInfo, testId }
        onTestInfosChange([...testInfos, newTestInfo])
        setShowNewTestProtocolForm(false)
      } else {
        console.error('Failed to create test protocol')
      }
    } catch (error) {
      console.error('Error creating test protocol:', error)
    }
  }

  const handleDeleteProtocol = async () => {
    if (!deleteTargetTestId) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/test-infos?testId=${encodeURIComponent(deleteTargetTestId)}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Remove from local state
        onTestInfosChange(testInfos.filter(ti => ti.testId !== deleteTargetTestId))
        setShowDeleteConfirm(false)
        setDeleteTargetTestId(null)
      } else {
        const error = await response.json()
        console.error('Failed to delete test protocol:', error)
        alert('Failed to delete test protocol: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting test protocol:', error)
      alert('Error deleting test protocol')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
        🧪 Stage-by-Stage Data Entry
      </h2>

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
              <div
                key={ti.testId || `test-${idx}`}
                className="relative w-full p-4 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onTestSelected(ti)}
                  className="w-full text-left"
                >
                  <div className="font-medium text-blue-900 dark:text-blue-100">{ti.testId}</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {ti.testDate} • {ti.device} • {ti.unit === 'watt' ? 'Power (W)' : 'Speed (km/h)'}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Start: {ti.startLoad} {ti.unit} • Increment: +{ti.increment} • Duration: {ti.stageDuration_min} min
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTargetTestId(ti.testId || null)
                    setShowDeleteConfirm(true)
                  }}
                  className="absolute top-3 right-3 px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded-md font-medium"
                  title="Delete Protocol"
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && deleteTargetTestId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              ⚠️ Delete Test Protocol?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Are you sure you want to delete protocol <strong>{deleteTargetTestId}</strong>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-6">
              This will permanently delete the protocol and all associated stage data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteTargetTestId(null)
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-zinc-300 hover:bg-zinc-400 disabled:bg-zinc-200 disabled:cursor-not-allowed text-zinc-700 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProtocol}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-md font-medium flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span> Deleting...
                  </>
                ) : (
                  <>🗑️ Delete Protocol</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
