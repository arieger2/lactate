'use client'

interface Stage {
  stage: number
  load: string
  lactate: string
  heartRate?: string
  rrSystolic?: string
  rrDiastolic?: string
  duration?: string
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

interface StageInputFormProps {
  currentStage: Stage
  selectedTestInfo: TestInfo
  onStageChange: (updates: Partial<Stage>) => void
  onSave: () => void
  hasUnsavedChanges?: boolean
  onChangeProtocol?: () => void
}

export default function StageInputForm({ 
  currentStage, 
  selectedTestInfo, 
  onStageChange,
  onSave,
  hasUnsavedChanges = false,
  onChangeProtocol
}: StageInputFormProps) {
  
  const isValid = currentStage.load && currentStage.lactate

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
        ✏️ Stage-by-Stage Data Entry
      </h2>

      {/* Selected Protocol Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4 flex justify-between items-center">
        <div>
          <h3 className="font-medium text-blue-900 dark:text-blue-100">{selectedTestInfo.testId}</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            {selectedTestInfo.device} • {selectedTestInfo.unit === 'watt' ? 'Power (W)' : 'Speed (km/h)'} • 
            Start: {selectedTestInfo.startLoad} • +{selectedTestInfo.increment} / {selectedTestInfo.stageDuration_min}min
          </p>
        </div>
        {onChangeProtocol && (
          <button
            onClick={onChangeProtocol}
            className="px-4 py-2 bg-zinc-500 hover:bg-zinc-600 text-white rounded-md text-sm font-medium"
          >
            Change Protocol
          </button>
        )}
      </div>

      {/* Stage Input Form */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg" key={`stage-${currentStage.stage}`}>
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
              step="0.1"
              value={currentStage.load || ''}
              onChange={(e) => onStageChange({ load: e.target.value })}
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
              onChange={(e) => onStageChange({ lactate: e.target.value })}
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
              onChange={(e) => onStageChange({ heartRate: e.target.value })}
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
              onChange={(e) => onStageChange({ duration: e.target.value })}
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
              onChange={(e) => onStageChange({ rrSystolic: e.target.value })}
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
              onChange={(e) => onStageChange({ rrDiastolic: e.target.value })}
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
              onChange={(e) => onStageChange({ notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-zinc-100"
              placeholder="Optional"
            />
          </div>
        </div>
        
        <button
          onClick={onSave}
          disabled={!isValid}
          className={`px-4 py-2 ${
            isValid && hasUnsavedChanges
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-zinc-400'
          } text-white rounded font-medium disabled:bg-zinc-400 disabled:cursor-not-allowed`}
        >
          ✓ Continue to Next Stage
        </button>
      </div>
    </div>
  )
}
