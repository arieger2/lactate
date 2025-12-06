'use client'

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

interface TestInfoHeaderProps {
  selectedTestInfo: TestInfo
  onChangeProtocol: () => void
}

export default function TestInfoHeader({ selectedTestInfo, onChangeProtocol }: TestInfoHeaderProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-blue-900 dark:text-blue-100">
          {selectedTestInfo.testId}
        </h3>
        <button
          onClick={onChangeProtocol}
          className="px-3 py-1 text-sm bg-zinc-500 hover:bg-zinc-600 text-white rounded"
        >
          Change Protocol
        </button>
      </div>
      <div className="text-sm text-blue-700 dark:text-blue-300">
        {selectedTestInfo.device} • {selectedTestInfo.unit === 'watt' ? 'Power (W)' : 'Speed (km/h)'} • 
        Start: {selectedTestInfo.startLoad} • +{selectedTestInfo.increment} / {selectedTestInfo.stageDuration_min}min
      </div>
    </div>
  )
}
