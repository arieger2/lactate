import React from 'react'

export default function TrainingZonesSection() {
  const zones = [
    { id: 1, name: 'Aktive Regeneration', color: 'rgb(144, 238, 144)', lactate: '< 2.0 mmol/L', hr: '< 65% HFmax', description: 'Regeneration & Fettstoffwechsel, sehr leichte Intensität' },
    { id: 2, name: 'Aerobe Basis', color: 'rgb(0, 200, 83)', lactate: '2.0-2.5 mmol/L', hr: '65-75% HFmax', description: 'Grundlagenausdauer 1, aerobe Kapazität' },
    { id: 3, name: 'Aerobe Schwelle', color: 'rgb(255, 235, 59)', lactate: '2.5-4.0 mmol/L', hr: '75-85% HFmax', description: 'Grundlagenausdauer 2 / Tempo, LT1 Bereich' },
    { id: 4, name: 'Laktatschwelle', color: 'rgb(255, 152, 0)', lactate: '4.0-8.0 mmol/L', hr: '85-95% HFmax', description: 'Wettkampftempo / Schwellenbereich, LT2/MLSS' },
    { id: 5, name: 'VO₂max', color: 'rgb(244, 67, 54)', lactate: '> 8.0 mmol/L', hr: '> 95% HFmax', description: 'Anaerobe Kapazität, neuromuskuläre Leistung' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          🎯 5-Zonen Trainingsmodell
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Die 5 Trainingszonen werden automatisch basierend auf LT1 und LT2 der gewählten 
          Schwellenmethode berechnet. Die Zonengrenzen sind nahtlos und können interaktiv 
          per Drag &amp; Drop angepasst werden.
        </p>

        {/* Zone Visual Bar */}
        <div className="mb-8">
          <div className="flex h-16 rounded-lg overflow-hidden border-2 border-zinc-300 dark:border-zinc-600 shadow-inner">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="flex-1 flex flex-col items-center justify-center text-xs font-bold text-zinc-800 border-r-2 border-white/50 last:border-r-0"
                style={{ backgroundColor: zone.color }}
              >
                <span className="text-lg">Z{zone.id}</span>
                <span className="text-[10px] opacity-75">{zone.hr}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-zinc-500">
            <span>← Niedrige Intensität</span>
            <span>Hohe Intensität →</span>
          </div>
        </div>

        {/* Zone Details Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">Zone</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">Name</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">Laktat</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">Herzfrequenz</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">Beschreibung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {zones.map((zone) => (
                <tr key={zone.id}>
                  <td className="p-3">
                    <span 
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm"
                      style={{ backgroundColor: zone.color, color: zone.id >= 3 ? '#1f2937' : '#fff' }}
                    >
                      {zone.id}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">{zone.name}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">{zone.lactate}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">{zone.hr}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400 text-xs">{zone.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zone Boundary Adjustment */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          🖱️ Interaktive Zonenanpassung
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-zinc-800 dark:text-zinc-200 mb-2">So funktioniert es:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Wechseln Sie zum &quot;Performance Kurve&quot; Tab</li>
              <li>Fahren Sie mit der Maus über eine der <span className="text-blue-600 font-medium">blauen Zonenlinien</span></li>
              <li>Der Cursor wechselt zu einem Resize-Symbol</li>
              <li>Klicken und ziehen Sie, um die Grenze zu verschieben</li>
              <li>Änderungen werden automatisch gespeichert</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-zinc-800 dark:text-zinc-200 mb-2">Zonengrenzen:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <span className="w-16 font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">Z1|Z2</span>
                <span>Übergang Regeneration → Aerobe Basis</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <span className="w-16 font-mono bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">Z2|Z3</span>
                <span>Aerobe Schwelle (LT1)</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <span className="w-16 font-mono bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">Z3|Z4</span>
                <span>Anaerobe Schwelle (LT2)</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <span className="w-16 font-mono bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded">Z4|Z5</span>
                <span>Übergang Schwelle → VO₂max</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Physiological Explanation */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-green-800 dark:text-green-200">
          🧬 Physiologischer Hintergrund
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700 dark:text-green-300">
          <div>
            <strong>Zone 1-2 (unter LT1):</strong><br/>
            Fettstoffwechsel dominiert, primär aerobe Energiebereitstellung, 
            Laktatproduktion und -elimination im Gleichgewicht.
          </div>
          <div>
            <strong>Zone 3 (LT1 bis LT2):</strong><br/>
            Übergangsbereich, steigende Kohlenhydratnutzung, 
            Laktat beginnt zu akkumulieren.
          </div>
          <div>
            <strong>Zone 4 (bei LT2/MLSS):</strong><br/>
            Maximales Laktat-Steady-State, höchste nachhaltige Intensität, 
            ca. 1 Stunde maximal haltbar.
          </div>
          <div>
            <strong>Zone 5 (über LT2):</strong><br/>
            Anaerobe Glykolyse dominiert, schnelle Laktatakkumulation, 
            VO₂max-Training, nur kurze Intervalle möglich.
          </div>
        </div>
      </div>
    </div>
  )
}
