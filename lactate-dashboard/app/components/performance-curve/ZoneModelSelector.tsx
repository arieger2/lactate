'use client'

import { ZoneModel } from '@/lib/lactateCalculations'

interface ZoneModelSelectorProps {
  selectedZoneModel: ZoneModel
  onZoneModelChange: (model: ZoneModel) => void
}

export default function ZoneModelSelector({ 
  selectedZoneModel, 
  onZoneModelChange 
}: ZoneModelSelectorProps) {
  const zoneModels: { value: ZoneModel; label: string; description: string }[] = [
    { 
      value: '5-zones', 
      label: '5 Zonen', 
      description: 'Standard 5-Zonen-Modell' 
    },
    { 
      value: '3-zones-a', 
      label: '3 Zonen Klassisch', 
      description: 'Einfache 3-Zonen (bis LT1, LT1-LT2, ab LT2)' 
    },
    { 
      value: '3-zones-b', 
      label: '3 Zonen Seiler', 
      description: 'Polarisiertes Training (Seiler)' 
    }
  ]

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
        Zonenmodell
      </h3>
      <div className="flex gap-2 flex-wrap">
        {zoneModels.map(({ value, label, description }) => (
          <button
            key={value}
            onClick={() => onZoneModelChange(value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              selectedZoneModel === value
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title={description}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
