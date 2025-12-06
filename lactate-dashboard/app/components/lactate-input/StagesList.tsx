'use client'

/**
 * Convert decimal minutes (3.0 or 0.833) to min:sec string (3:00 or 0:50)
 */
function formatDurationDisplay(decimalMinutes: number): string {
  const minutes = Math.floor(decimalMinutes)
  const seconds = Math.round((decimalMinutes - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

interface Stage {
  stage: number
  load: number
  lactate: number
  heartRate?: number
  rrSystolic?: number
  rrDiastolic?: number
  duration?: number
  theoreticalLoad?: number
  notes?: string
}

interface StagesListProps {
  stages: Stage[]
  currentStageNumber: number
  unit: string
  onStageClick: (stage: Stage) => void
  onStageRemove: (stageNumber: number) => void
}

export default function StagesList({ 
  stages, 
  currentStageNumber, 
  unit,
  onStageClick, 
  onStageRemove 
}: StagesListProps) {
  
  if (stages.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">
        Recorded Stages ({stages.length}) - Click to Edit
      </h4>
      <div className="space-y-2">
        {stages.map((stage) => (
          <div 
            key={stage.stage} 
            className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
              stage.stage === currentStageNumber
                ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
            }`}
            onClick={() => onStageClick(stage)}
          >
            <div className="flex-1">
              <span className="font-medium text-green-900 dark:text-green-100">Stage {stage.stage}</span>
              {stage.duration && (
                <>
                  <span className="mx-2 text-green-700 dark:text-green-300">•</span>
                  <span className="text-green-700 dark:text-green-300">
                    {formatDurationDisplay(stage.duration)} min
                  </span>
                </>
              )}
              <span className="mx-2 text-green-700 dark:text-green-300">•</span>
              <span className="text-green-700 dark:text-green-300">
                {stage.load} {unit}
              </span>
              {stage.theoreticalLoad && (
                <>
                  <span className="mx-1 text-red-600 dark:text-red-400">(theoretical: </span>
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    {stage.theoreticalLoad.toFixed(2)} {unit}
                  </span>
                  <span className="text-red-600 dark:text-red-400">)</span>
                </>
              )}
              <span className="mx-2 text-green-700 dark:text-green-300">•</span>
              <span className="text-green-700 dark:text-green-300">{stage.lactate} mmol/L</span>
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
                onStageRemove(stage.stage)
              }}
              className="ml-2 px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

