'use client'

import { TrainingZone } from '@/lib/types'

interface TrainingZonesDescriptionProps {
  trainingZones: TrainingZone[]
  unit: string
}

export default function TrainingZonesDescription({
  trainingZones,
  unit
}: TrainingZonesDescriptionProps) {
  if (trainingZones.length === 0) {
    return null
  }

  const unitLabel = unit === 'kmh' ? 'km/h' : 'W'

  // Helper to format zone range text
  const getZoneRangeText = (zone: TrainingZone, index: number, total: number) => {
    const isFirst = index === 0
    const isLast = index === total - 1

    if (isFirst) {
      // First zone: only show upper bound (e.g., "- 8 km/h")
      return `- ${Math.round(zone.range[1])} ${unitLabel}`
    } else if (isLast) {
      // Last zone: only show lower bound (e.g., "14 km/h -")
      return `${Math.round(zone.range[0])} ${unitLabel} -`
    } else {
      // Middle zones: show both bounds (e.g., "8 - 10 km/h")
      return `${Math.round(zone.range[0])} - ${Math.round(zone.range[1])} ${unitLabel}`
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
        5-Zonen Trainingssystem
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {trainingZones.map((zone, index) => (
          /* eslint-disable-next-line react/forbid-dom-props */
          <div
            key={zone.id}
            className="p-4 rounded-lg border-2"
            style={{
              backgroundColor: zone.color,
              borderColor: zone.borderColor
            }}
          >
            <h4 className="font-semibold text-zinc-900">{zone.name}</h4>
            <p className="text-sm text-zinc-700">{zone.description}</p>
            <p className="text-xs mt-2 text-zinc-600 font-medium">
              {getZoneRangeText(zone, index, trainingZones.length)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
