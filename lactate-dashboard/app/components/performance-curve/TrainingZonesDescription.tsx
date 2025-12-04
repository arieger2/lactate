'use client'

import { TrainingZone } from '@/lib/types'

interface TrainingZonesDescriptionProps {
  trainingZones: TrainingZone[]
}

export default function TrainingZonesDescription({ trainingZones }: TrainingZonesDescriptionProps) {
  if (trainingZones.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
        5-Zonen Trainingssystem
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {trainingZones.map(zone => (
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
            <p className="text-xs mt-2 text-zinc-600">
              {Math.round(zone.range[0])}W - {Math.round(zone.range[1])}W
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
