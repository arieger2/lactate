import React from 'react'

export default function ThresholdMethodsSection() {
  const methods = [
    {
      name: 'DMAX',
      authors: 'Cheng et al. (1992)',
      color: '#dc2626',
      lt1: 'Erster Deflektionspunkt (Steigung +50%)',
      lt2: 'Maximale Distanz zur Baseline',
      math: 'Polynomiale Regression 3. Grades',
      description: 'Die DMAX-Methode berechnet den Punkt maximaler senkrechter Distanz zwischen der gefitteten Laktatkurve und einer Geraden vom ersten zum letzten Messpunkt. Dies approximiert das maximale Laktat-Steady-State (MLSS).',
      physiology: 'Repräsentiert den Punkt maximaler Diskrepanz zwischen aerobem und anaerobem Energiestoffwechsel. Der Athlet kann bei dieser Intensität noch ein Laktat-Gleichgewicht aufrechterhalten.'
    },
    {
      name: 'Dickhuth (IANS)',
      authors: 'Dickhuth et al. (1999)',
      color: '#7c2d12',
      lt1: 'Baseline + 0.5 mmol/L',
      lt2: 'Baseline + 1.5 mmol/L',
      math: 'Lineare Interpolation',
      description: 'Die Individuelle Anaerobe Schwelle (IANS) verwendet die individuelle Baseline als Referenz statt fixer Schwellenwerte. Dies berücksichtigt interindividuelle Unterschiede in Ruhelaktatwerten.',
      physiology: 'LT1 (+0.5 mmol/L) markiert den Beginn der aeroben Energiebereitstellung mit messbarer Laktaterhöhung. LT2 (+1.5 mmol/L) zeigt den Übergang zur vorwiegend anaeroben Energiebereitstellung.'
    },
    {
      name: 'Mader 4 mmol/L',
      authors: 'Mader (1976)',
      color: '#ef4444',
      lt1: '2.0 mmol/L (interpoliert)',
      lt2: '4.0 mmol/L (OBLA)',
      math: 'Lineare Interpolation zwischen Messpunkten',
      description: 'Die klassische "4 mmol/L Schwelle" oder OBLA (Onset of Blood Lactate Accumulation) ist historisch die am häufigsten verwendete Methode. Sie basiert auf der Beobachtung, dass bei ca. 4 mmol/L eine kritische Schwelle für die Laktatakkumulation erreicht wird.',
      physiology: '4 mmol/L entspricht der maximalen Dauerleistungsgrenze (ca. 1 Stunde) und der Grenze des Laktat-Steady-State für die meisten Athleten. Einschränkung: Ignoriert individuelle Unterschiede in Baseline-Laktatwerten.'
    },
    {
      name: 'Log-Log',
      authors: 'Beaver et al. (1985)',
      color: '#8b5cf6',
      lt1: 'Steigungsänderung vor Breakpoint',
      lt2: 'Breakpoint der Zwei-Linien-Regression',
      math: 'Logarithmische Transformation beider Achsen',
      description: 'Diese Methode nutzt die logarithmische Transformation beider Achsen (Leistung und Laktat), um nichtlineare Beziehungen zu linearisieren. Der Breakpoint in der log-log Darstellung entspricht dem Laktatschwellenpunkt.',
      physiology: 'Die log-log Transformation verstärkt Änderungen bei niedrigen Werten und ist weniger sensitiv gegenüber Ausreißern als lineare Methoden. Der Breakpoint markiert den Übergang von aerober zu anaerober Dominanz.'
    },
    {
      name: '+1.0 mmol/L',
      authors: 'Faude et al. (2009)',
      color: '#10b981',
      lt1: 'Laktat-Minimum',
      lt2: 'Baseline + 1.0 mmol/L',
      math: 'Lineare Interpolation',
      description: 'Diese in der deutschen Sportwissenschaft entwickelte Methode verwendet den minimalen Laktatwert während des Tests als Referenz und definiert LT2 als +1.0 mmol/L über diesem Minimum.',
      physiology: 'Das Laktat-Minimum repräsentiert den Punkt optimaler aerober Funktion. +1.0 mmol/L ist ein konservativer Schwellenwert, besonders geeignet für Ausdauerathleten mit niedrigen Baseline-Werten.'
    },
    {
      name: 'ModDMAX',
      authors: 'Bishop et al. (1998)',
      color: '#f59e0b',
      lt1: 'Laktat-Minimum',
      lt2: 'Max. Distanz ab Laktat-Minimum',
      math: 'Polynomiale Regression 3. Grades ab Minimum',
      description: 'Die modifizierte DMAX-Methode verbessert die ursprüngliche DMAX, indem sie den Startpunkt der Baseline-Linie am Laktat-Minimum statt am ersten Messpunkt setzt.',
      physiology: 'Eliminiert "Warm-up"-Artefakte in den frühen Teststufen. Der Laktat-Minimum-Punkt repräsentiert die wahre aerobe Baseline und führt zu genauerer MLSS-Schätzung.'
    },
    {
      name: 'Seiler 3-Zone',
      authors: 'Seiler & Kjerland (2006)',
      color: '#06b6d4',
      lt1: 'VT1 ≈ Baseline + 0.5 mmol/L',
      lt2: 'VT2 ≈ Baseline + 2.0 mmol/L',
      math: 'Lineare Interpolation',
      description: 'Stephen Seiler entwickelte das "Polarized Training" Konzept basierend auf der Beobachtung, dass erfolgreiche Ausdauerathleten den Großteil ihres Trainings entweder mit niedriger oder hoher Intensität absolvieren.',
      physiology: 'Zone 1 (<VT1): Regeneration, Grundlagenausdauer. Zone 2 (VT1-VT2): "Graue Zone", oft ineffektiv. Zone 3 (>VT2): Hochintensives Training, VO₂max-Entwicklung.'
    },
    {
      name: 'FatMax/LT',
      authors: 'San-Millán & Brooks (2018)',
      color: '#ec4899',
      lt1: 'Baseline + 0.5 mmol/L (bei FatMax)',
      lt2: 'Baseline + 1.5 mmol/L (MLSS)',
      math: 'Kombinierte Laktat- und Fettoxidationsanalyse',
      description: 'Diese Methode kombiniert die Laktatanalyse mit der Fettoxidationsrate. Sie basiert auf dem "Crossover Concept", das beschreibt, wie die Substratnutzung von Fett zu Kohlenhydraten wechselt.',
      physiology: 'FatMax ist die Intensität mit maximaler Fettverbrennung (typischerweise bei 60-70% VO₂max) und korreliert oft mit LT1. Bei steigender Intensität sinkt die Fettoxidation zugunsten der Kohlenhydratverbrennung.'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          📊 Wissenschaftliche Schwellenmethoden
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Das Lactate Dashboard implementiert 8 peer-reviewed Schwellenmethoden zur Bestimmung 
          der aeroben (LT1) und anaeroben (LT2) Laktatschwelle. Jede Methode basiert auf 
          unterschiedlichen physiologischen und mathematischen Ansätzen.
        </p>

        {/* Summary Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700">Methode</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700">Autoren</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700">LT1 (Aerob)</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700">LT2 (Anaerob)</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700">Mathematik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {methods.map((method) => (
                <tr key={method.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="p-3">
                    <span 
                      className="inline-block w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: method.color }}
                    />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{method.name}</span>
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400 text-xs">{method.authors}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400 text-xs">{method.lt1}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400 text-xs">{method.lt2}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400 text-xs">{method.math}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Method Cards */}
      {methods.map((method) => (
        <div key={method.name} className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <span 
              className="inline-block w-4 h-4 rounded-full" 
              style={{ backgroundColor: method.color }}
            />
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {method.name}
            </h3>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              ({method.authors})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-zinc-800 dark:text-zinc-200 mb-2 flex items-center gap-2">
                <span className="text-blue-500">📐</span> Beschreibung
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {method.description}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-zinc-800 dark:text-zinc-200 mb-2 flex items-center gap-2">
                <span className="text-green-500">🧬</span> Physiologie
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {method.physiology}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
              <span className="text-blue-700 dark:text-blue-300">LT1: {method.lt1}</span>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-full">
              <span className="text-red-700 dark:text-red-300">LT2: {method.lt2}</span>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded-full">
              <span className="text-purple-700 dark:text-purple-300">Mathematik: {method.math}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Recommendations */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-amber-800 dark:text-amber-200">
          💡 Empfehlungen zur Methodenwahl
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white/50 dark:bg-zinc-800/50 p-3 rounded-lg">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">Hochtrainierte Athleten</h4>
            <p className="text-amber-700 dark:text-amber-300">DMAX, ModDMAX - Berücksichtigt individuelle Kurvenform</p>
          </div>
          <div className="bg-white/50 dark:bg-zinc-800/50 p-3 rounded-lg">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">Ausdauerathleten</h4>
            <p className="text-amber-700 dark:text-amber-300">Dickhuth, +1.0 mmol/L - Baseline-basiert, niedrigere absolute Werte</p>
          </div>
          <div className="bg-white/50 dark:bg-zinc-800/50 p-3 rounded-lg">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">Untrainierte / Breitensport</h4>
            <p className="text-amber-700 dark:text-amber-300">Mader 4mmol - Konservativ, breite Validierung</p>
          </div>
          <div className="bg-white/50 dark:bg-zinc-800/50 p-3 rounded-lg">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">Polarisiertes Training</h4>
            <p className="text-amber-700 dark:text-amber-300">Seiler 3-Zone - Direkt anwendbare Trainingszonen</p>
          </div>
        </div>
      </div>
    </div>
  )
}
