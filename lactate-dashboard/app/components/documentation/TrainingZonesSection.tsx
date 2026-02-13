import React, { useState } from 'react'

type ZoneModelTab = '5-zones' | '3-zones-klassisch' | '3-zones-seiler'

export default function TrainingZonesSection() {
  const [activeModel, setActiveModel] = useState<ZoneModelTab>('5-zones')

  const zones5 = [
    { id: 1, name: 'Aktive Regeneration', color: 'rgb(144, 238, 144)', lactate: '< 2.0 mmol/L', hr: '< 65% HFmax', description: 'Regeneration & Fettstoffwechsel, sehr leichte Intensität' },
    { id: 2, name: 'Aerobe Basis', color: 'rgb(0, 200, 83)', lactate: '2.0-2.5 mmol/L', hr: '65-75% HFmax', description: 'Grundlagenausdauer 1, aerobe Kapazität' },
    { id: 3, name: 'Aerobe Schwelle', color: 'rgb(255, 235, 59)', lactate: '2.5-4.0 mmol/L', hr: '75-85% HFmax', description: 'Grundlagenausdauer 2 / Tempo, LT1 Bereich' },
    { id: 4, name: 'Laktatschwelle', color: 'rgb(255, 152, 0)', lactate: '4.0-8.0 mmol/L', hr: '85-95% HFmax', description: 'Wettkampftempo / Schwellenbereich, LT2/MLSS' },
    { id: 5, name: 'VO₂max', color: 'rgb(244, 67, 54)', lactate: '> 8.0 mmol/L', hr: '> 95% HFmax', description: 'Anaerobe Kapazität, neuromuskuläre Leistung' },
  ]

  const zones3Klassisch = [
    { id: 1, name: 'Aerobe Basis', color: 'rgb(144, 238, 144)', lactate: '< LT1', hr: '< 75% HFmax', description: 'Grundlagenausdauer, Fettstoffwechsel, aerobe Kapazität' },
    { id: 2, name: 'Schwellenbereich', color: 'rgb(255, 235, 59)', lactate: 'LT1 - LT2', hr: '75-85% HFmax', description: 'Tempo, Schwellentraining, Laktattoleranz' },
    { id: 3, name: 'Anaerober Bereich', color: 'rgb(244, 67, 54)', lactate: '> LT2', hr: '> 85% HFmax', description: 'Intervalle, VO₂max, anaerobe Kapazität' },
  ]

  const zones3Seiler = [
    { id: 1, name: 'Niedrige Intensität', color: 'rgb(144, 238, 144)', lactate: '< 80% LT1', hr: '60-75% HFmax', description: '75-85% des Trainingsumfangs, lockeres Training' },
    { id: 2, name: 'Schwellenbereich', color: 'rgb(255, 235, 59)', lactate: '~80% LT1 - ~105% LT2', hr: '75-90% HFmax', description: '<5% des Umfangs (vermeiden!), "Grauzone"' },
    { id: 3, name: 'Hohe Intensität', color: 'rgb(244, 67, 54)', lactate: '> 105% LT2', hr: '> 90% HFmax', description: '15-20% des Umfangs, intensive Intervalle' },
  ]

  const getCurrentZones = () => {
    switch (activeModel) {
      case '5-zones': return zones5
      case '3-zones-klassisch': return zones3Klassisch
      case '3-zones-seiler': return zones3Seiler
    }
  }

  const zones = getCurrentZones()

  return (
    <div className="space-y-6">
      {/* Model Selector */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveModel('5-zones')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeModel === '5-zones'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            🎯 5 Zonen
          </button>
          <button
            onClick={() => setActiveModel('3-zones-klassisch')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeModel === '3-zones-klassisch'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            📊 3 Zonen Klassisch
          </button>
          <button
            onClick={() => setActiveModel('3-zones-seiler')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeModel === '3-zones-seiler'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            🏃 3 Zonen Seiler
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          {activeModel === '5-zones' && '🎯 5-Zonen Trainingsmodell'}
          {activeModel === '3-zones-klassisch' && '📊 3-Zonen Modell (Klassisch)'}
          {activeModel === '3-zones-seiler' && '🏃 3-Zonen Modell (Seiler / Polarisiert)'}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {activeModel === '5-zones' && 'Die 5 Trainingszonen werden automatisch basierend auf LT1 und LT2 der gewählten Schwellenmethode berechnet. Die Zonengrenzen sind nahtlos und können interaktiv per Drag & Drop angepasst werden.'}
          {activeModel === '3-zones-klassisch' && 'Das klassische 3-Zonen-Modell bietet eine einfache Einteilung der Trainingsintensitäten mit klarer Trennung an den physiologischen Übergangspunkten LT1 und LT2. Ideal für Breitensportler und einfache Trainingsplanung.'}
          {activeModel === '3-zones-seiler' && 'Das polarisierte Trainingsmodell nach Stephen Seiler basiert auf der Analyse von Weltklasse-Ausdauerathleten. Kernprinzip: 80% niedrige Intensität, <5% mittlere Intensität (vermeiden!), 15-20% hohe Intensität.'}
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
        
        {activeModel === '5-zones' && (
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
        )}

        {activeModel === '3-zones-klassisch' && (
          <div className="space-y-4 text-sm text-green-700 dark:text-green-300">
            <div>
              <strong>Zone 1 (bis LT1 / Aerobe Basis):</strong><br/>
              Vollständig aerober Stoffwechsel, Laktatproduktion und -elimination im Gleichgewicht. 
              Fettstoffwechsel dominiert, ideale Zone für Grundlagenausdauer und hohe Trainingsumfänge. 
              70-80% des Gesamttrainings sollten in dieser Zone stattfinden.
            </div>
            <div>
              <strong>Zone 2 (LT1 bis LT2 / Schwellenbereich):</strong><br/>
              Übergangsbereich zwischen aerobem und anaerobem Stoffwechsel. Laktat beginnt zu akkumulieren, 
              kann aber noch kompensiert werden. Tempoläufe und Schwellentraining. 15-20% des Gesamtumfangs.
            </div>
            <div>
              <strong>Zone 3 (ab LT2 / Anaerober Bereich):</strong><br/>
              Überwiegend anaerober Stoffwechsel, starke Laktatakkumulation. VO₂max-Training, 
              Intervalle und Sprinttraining. Nur 5-10% des Gesamttrainings, da sehr ermüdend.
            </div>
          </div>
        )}

        {activeModel === '3-zones-seiler' && (
          <div className="space-y-4 text-sm text-green-700 dark:text-green-300">
            <div>
              <strong>Zone 1 (bis ~80% LT1 / Niedrige Intensität):</strong><br/>
              Bewusst unterhalb der LT1, um hohe Trainingsumfänge ohne übermäßige Ermüdung zu ermöglichen. 
              Vollständig aerobes Training mit minimaler Laktatproduktion. 
              <span className="font-semibold"> 75-85% des gesamten Trainingsumfangs!</span>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-3 rounded">
              <strong>Zone 2 (~80% LT1 bis ~105% LT2 / "Grauzone"):</strong><br/>
              Diese Zone sollte <span className="font-semibold">aktiv vermieden</span> werden! 
              Zu hart für echte Regeneration, zu leicht für maximale Trainingsreize. 
              Hohe mechanische Belastung ohne optimale Anpassungen. 
              <span className="font-semibold">{'<5%'} des Trainings!</span>
            </div>
            <div>
              <strong>Zone 3 (ab ~105% LT2 / Hohe Intensität):</strong><br/>
              Klar definierte, strukturierte Intervalleinheiten. VO₂max-Bereich mit maximaler kardiovaskulärer 
              Beanspruchung. Kurze, intensive Belastungen mit vollständiger Regeneration zwischen den Einheiten. 
              <span className="font-semibold"> 15-20% des Trainingsumfangs.</span>
            </div>
            <div className="pt-3 border-t border-green-300 dark:border-green-700">
              <strong>📊 80/0/20 Regel (Polarisiertes Training):</strong><br/>
              Studien mit Olympioniken und Weltmeistern zeigen konsistent diese bimodale Verteilung: 
              Sehr viel lockeres Training (Zone 1) kombiniert mit klaren intensiven Einheiten (Zone 3), 
              während die "mittlere" Zone 2 minimiert wird.
            </div>
          </div>
        )}
      </div>

      {/* Training Distribution */}
      {activeModel === '3-zones-seiler' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
            📈 Beispiel Wochenstruktur (Polarisiertes Training)
          </h3>
          <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-2 font-medium">Montag:</div>
              <div className="col-span-10">Zone 1 (60 min) - Lockerer Dauerlauf</div>
            </div>
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-2 font-medium">Dienstag:</div>
              <div className="col-span-10">Zone 1 (90 min) - Grundlagenausdauer</div>
            </div>
            <div className="grid grid-cols-12 gap-1 bg-blue-100 dark:bg-blue-900/40 p-1 rounded">
              <div className="col-span-2 font-medium">Mittwoch:</div>
              <div className="col-span-10"><strong>Zone 3 Intervalle</strong> (30 min Belastung + Warm-up/Cool-down)</div>
            </div>
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-2 font-medium">Donnerstag:</div>
              <div className="col-span-10">Zone 1 (75 min) - Regeneratives Training</div>
            </div>
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-2 font-medium">Freitag:</div>
              <div className="col-span-10">Zone 1 (60 min) oder Pause</div>
            </div>
            <div className="grid grid-cols-12 gap-1 bg-blue-100 dark:bg-blue-900/40 p-1 rounded">
              <div className="col-span-2 font-medium">Samstag:</div>
              <div className="col-span-10"><strong>Zone 3 Intervalle</strong> (30 min Belastung + Warm-up/Cool-down)</div>
            </div>
            <div className="grid grid-cols-12 gap-1">
              <div className="col-span-2 font-medium">Sonntag:</div>
              <div className="col-span-10">Zone 1 (150-240 min) - Langer Dauerlauf</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-300 dark:border-blue-700 text-sm text-blue-700 dark:text-blue-300">
            <strong>📚 Wissenschaftliche Quelle:</strong> Seiler, K. S., & Kjerland, G. Ø. (2006). 
            Quantifying training intensity distribution in elite endurance athletes. 
            <em>Scandinavian Journal of Medicine & Science in Sports</em>, 16(1), 49-56.
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          🔄 Vergleich der Modelle
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">Aspekt</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">5 Zonen</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">3 Zonen Klassisch</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">3 Zonen Seiler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              <tr>
                <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Zielgruppe</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Alle Leistungsniveaus</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Breitensport, Einsteiger</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Leistungssport, Elite</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Komplexität</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Mittel bis hoch</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Niedrig</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Mittel</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Differenzierung</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Sehr detailliert</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Einfach</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Fokussiert</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Hauptvorteil</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Präzise Steuerung</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Einfach verständlich</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Wissenschaftlich optimal</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Trainingsphilosophie</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Ausgewogene Verteilung</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Pyramidale Verteilung</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Polarisierte Verteilung</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Zeitaufwand</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Flexibel</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Mittel</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Hoch (viel Zone 1)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
