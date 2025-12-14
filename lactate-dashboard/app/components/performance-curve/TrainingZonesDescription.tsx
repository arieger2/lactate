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
  const zoneCount = trainingZones.length

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

  // Determine title and description based on zone count
  const getModelInfo = () => {
    if (zoneCount === 5) {
      return {
        title: '5-Zonen Trainingssystem',
        description: 'Detaillierte Trainingssteuerung mit differenzierten Intensitätsbereichen für präzise Belastungsplanung.',
        gridCols: 'md:grid-cols-5'
      }
    } else if (zoneCount === 3) {
      // Check zone names to determine if it's Klassisch or Seiler
      const firstZoneName = trainingZones[0]?.name || ''
      if (firstZoneName.includes('Niedrige Intensität')) {
        return {
          title: '3-Zonen Trainingssystem (Seiler / Polarisiert)',
          description: 'Polarisiertes Training nach Seiler: 80% in Zone 1 (locker), <5% in Zone 2 (vermeiden!), 15-20% in Zone 3 (intensiv). Optimal für Hochleistungssport und hohe Trainingsumfänge.',
          gridCols: 'md:grid-cols-3'
        }
      } else {
        return {
          title: '3-Zonen Trainingssystem (Klassisch)',
          description: 'Klassisches Modell mit klarer aerob/anaerob Trennung an LT1 und LT2. Ideal für einfache Trainingsplanung im Breitensport.',
          gridCols: 'md:grid-cols-3'
        }
      }
    } else {
      return {
        title: 'Trainingszonen',
        description: '',
        gridCols: 'md:grid-cols-3'
      }
    }
  }

  const modelInfo = getModelInfo()

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {modelInfo.title}
        </h3>
        {modelInfo.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            {modelInfo.description}
          </p>
        )}
      </div>
      <div className={`grid grid-cols-1 ${modelInfo.gridCols} gap-4`}>
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
      
      {/* Additional Info for 3-Zone Models */}
      {zoneCount === 3 && (
        <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-700 dark:text-zinc-300">
            {trainingZones[0]?.name.includes('Niedrige Intensität') ? (
              // Seiler Model
              <>
                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
                  <h5 className="font-semibold mb-2">🎯 Trainingsverteilung (80/0/20)</h5>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Zone 1:</strong> 75-85% des Gesamtumfangs</li>
                    <li>• <strong>Zone 2:</strong> {'<5%'} (so wenig wie möglich!)</li>
                    <li>• <strong>Zone 3:</strong> 15-20% (intensive Intervalle)</li>
                  </ul>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
                  <h5 className="font-semibold mb-2">📊 Wissenschaftlicher Hintergrund</h5>
                  <ul className="space-y-1 text-xs">
                    <li>• Analyse von Weltklasse-Ausdauerathleten</li>
                    <li>• Vermeidung der ermüdenden "Grauzone" (Zone 2)</li>
                    <li>• Maximierung von Umfang UND Intensität</li>
                    <li>• Quelle: Seiler & Kjerland (2006)</li>
                  </ul>
                </div>
              </>
            ) : (
              // Klassisch Model
              <>
                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
                  <h5 className="font-semibold mb-2">🎯 Trainingsverteilung</h5>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>Zone 1:</strong> 70-80% des Gesamtumfangs</li>
                    <li>• <strong>Zone 2:</strong> 15-20% (Schwellentraining)</li>
                    <li>• <strong>Zone 3:</strong> 5-10% (Intervalle)</li>
                  </ul>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
                  <h5 className="font-semibold mb-2">💡 Vorteile</h5>
                  <ul className="space-y-1 text-xs">
                    <li>• Einfach verständlich und umsetzbar</li>
                    <li>• Klare physiologische Übergänge</li>
                    <li>• Bewährtes Modell im Breitensport</li>
                    <li>• Ideal für Trainingseinsteiger</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Additional Info for 5-Zone Model */}
      {zoneCount === 5 && (
        <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-700 dark:text-zinc-300">
            <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
              <h5 className="font-semibold mb-2">🎯 Trainingsverteilung</h5>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Zone 1:</strong> 20-30% (Regeneration)</li>
                <li>• <strong>Zone 2:</strong> 40-50% (Grundlage)</li>
                <li>• <strong>Zone 3:</strong> 15-20% (Tempo)</li>
                <li>• <strong>Zone 4:</strong> 10-15% (HIT)</li>
                <li>• <strong>Zone 5:</strong> ~5% (Sprints)</li>
              </ul>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
              <h5 className="font-semibold mb-2">💡 Vorteile</h5>
              <ul className="space-y-1 text-xs">
                <li>• Maximale Differenzierung</li>
                <li>• Präzise Trainingssteuerung</li>
                <li>• Flexible Periodisierung</li>
                <li>• Für alle Trainingsphasen geeignet</li>
              </ul>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
              <h5 className="font-semibold mb-2">📊 Ideal für</h5>
              <ul className="space-y-1 text-xs">
                <li>• Detaillierte Trainingsplanung</li>
                <li>• Verschiedene Trainingsphasen</li>
                <li>• Wissenschaftliche Steuerung</li>
                <li>• Wettkampfvorbereitung</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
