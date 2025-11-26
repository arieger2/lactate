'use client'

import { useState } from 'react'
import { useCustomer } from '@/lib/CustomerContext'

type DocSection = 'overview' | 'threshold-methods' | 'training-zones' | 'api-device' | 'api-webhook' | 'api-sessions' | 'api-customers' | 'errors'

export default function Documentation() {
  const { selectedCustomer } = useCustomer()
  const [activeSection, setActiveSection] = useState<DocSection>('overview')

  const sections: { id: DocSection; title: string; icon: string }[] = [
    { id: 'overview', title: 'Übersicht', icon: '🏠' },
    { id: 'threshold-methods', title: 'Schwellenmethoden', icon: '📊' },
    { id: 'training-zones', title: 'Trainingszonen', icon: '🎯' },
    { id: 'api-device', title: 'Device API', icon: '🔗' },
    { id: 'api-webhook', title: 'Webhook API', icon: '🪝' },
    { id: 'api-sessions', title: 'Sessions API', icon: '📋' },
    { id: 'api-customers', title: 'Customers API', icon: '👥' },
    { id: 'errors', title: 'Fehlercodes', icon: '⚠️' },
  ]

  return (
    <div className="flex gap-6">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4 sticky top-4">
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            📚 Dokumentation
          </h3>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {activeSection === 'overview' && <OverviewSection />}
        {activeSection === 'threshold-methods' && <ThresholdMethodsSection />}
        {activeSection === 'training-zones' && <TrainingZonesSection />}
        {activeSection === 'api-device' && <DeviceApiSection selectedCustomer={selectedCustomer} />}
        {activeSection === 'api-webhook' && <WebhookApiSection selectedCustomer={selectedCustomer} />}
        {activeSection === 'api-sessions' && <SessionsApiSection selectedCustomer={selectedCustomer} />}
        {activeSection === 'api-customers' && <CustomersApiSection />}
        {activeSection === 'errors' && <ErrorCodesSection />}
      </div>
    </div>
  )
}

// ============================================================================
// OVERVIEW SECTION
// ============================================================================
function OverviewSection() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          🏠 Willkommen zur Lactate Dashboard Dokumentation
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Das Lactate Dashboard ist ein wissenschaftliches Tool zur Laktatdiagnostik und 
          Trainingszonenberechnung für Ausdauersportler. Es bietet präzise Schwellenanalysen 
          basierend auf peer-reviewten Methoden.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureCard
            icon="📊"
            title="8 Schwellenmethoden"
            description="DMAX, Dickhuth, Mader 4mmol, Log-Log, +1.0 mmol/L, ModDMAX, Seiler, FatMax/LT"
          />
          <FeatureCard
            icon="🎯"
            title="5-Zonen Trainingsmodell"
            description="Automatische Berechnung nahtloser Trainingszonen basierend auf LT1 und LT2"
          />
          <FeatureCard
            icon="🖱️"
            title="Interaktive Anpassung"
            description="Zonengrenzen per Drag & Drop verschieben mit automatischer Speicherung"
          />
          <FeatureCard
            icon="🔗"
            title="Geräteintegration"
            description="REST API für automatische Datenübertragung von Laktatmessgeräten"
          />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">
          🚀 Schnellstart
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <li>Wählen Sie einen Kunden im &quot;Lactate Input&quot; Tab aus</li>
          <li>Geben Sie Laktatmesswerte manuell ein oder importieren Sie via API</li>
          <li>Wechseln Sie zum &quot;Performance Kurve&quot; Tab</li>
          <li>Wählen Sie eine Schwellenmethode aus</li>
          <li>Passen Sie Zonengrenzen bei Bedarf manuell an (Drag &amp; Drop auf blauen Linien)</li>
        </ol>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{title}</h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// THRESHOLD METHODS SECTION
// ============================================================================
function ThresholdMethodsSection() {
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

// ============================================================================
// TRAINING ZONES SECTION
// ============================================================================
function TrainingZonesSection() {
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

// ============================================================================
// DEVICE API SECTION
// ============================================================================
function DeviceApiSection({ selectedCustomer }: { selectedCustomer: { customer_id: string; name: string } | null }) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          🔗 Device Interface API
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Schnittstelle für die automatische Datenübertragung von Laktatmessgeräten. 
          Ermöglicht Batch-Uploads von mehreren Messungen in einem Request.
        </p>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-6">
          <p className="text-sm text-green-700 dark:text-green-300 mb-3">
            <strong>Endpoint:</strong>
          </p>
          <div className="bg-green-100 dark:bg-green-800 p-3 rounded-md">
            <code className="text-green-900 dark:text-green-100 font-mono text-sm">
              POST {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/device-interface
            </code>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Request Format (mit Device Metadaten)</h3>
        <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-4 rounded-lg text-xs overflow-x-auto mb-6">
{`POST /api/device-interface
Content-Type: application/json

{
  "deviceId": "lactate-pro-2",
  "customerId": "${selectedCustomer?.customer_id || 'CUSTOMER_ID'}",
  "measurementData": [
    {
      "lactate": 1.3,
      "power": 150,
      "heartRate": 128,
      
      // Device Metadaten (optional)
      "sampleId": "001",        // oder SampleID
      "glucose": 5.2,           // mmol/L
      "ph": 7.38,               // oder pH
      "temperature": 37.2,
      "measurementDate": "2024-11-25",  // oder Date
      "measurementTime": "10:30:15",    // oder Time
      "errorCode": null         // null wenn erfolgreich
    },
    {
      "lactate": 2.0,
      "power": 200,
      "sampleId": "002",
      "glucose": 5.5
    }
  ]
}`}
        </pre>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Pflichtfelder</h4>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">lactate</code>
                <span>Laktatwert in mmol/L</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Messdaten (optional)</h4>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">power</code>
                <span>Leistung in Watt</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">heartRate</code>
                <span>Herzfrequenz in bpm</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">vo2</code>
                <span>VO₂ in mL/kg/min</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">fatOxidation</code>
                <span>Fettoxidation in g/min</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Device Metadaten (optional)</h4>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <li className="flex items-start gap-2">
                <code className="bg-purple-200 dark:bg-purple-700 px-2 py-0.5 rounded text-xs">sampleId</code>
                <span>Proben-Position/Nummer</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-purple-200 dark:bg-purple-700 px-2 py-0.5 rounded text-xs">glucose</code>
                <span>Glukose in mmol/L</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-purple-200 dark:bg-purple-700 px-2 py-0.5 rounded text-xs">ph</code>
                <span>pH-Wert</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-purple-200 dark:bg-purple-700 px-2 py-0.5 rounded text-xs">temperature</code>
                <span>Temperatur Messeinheit</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-purple-200 dark:bg-purple-700 px-2 py-0.5 rounded text-xs">measurementDate</code>
                <span>Datum (YYYY-MM-DD)</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-purple-200 dark:bg-purple-700 px-2 py-0.5 rounded text-xs">measurementTime</code>
                <span>Uhrzeit (HH:MM:SS)</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-purple-200 dark:bg-purple-700 px-2 py-0.5 rounded text-xs">errorCode</code>
                <span>Fehlercode (wenn fehlgeschlagen)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Device Native Format */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">📟 Geräte-natives Format</h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            Die API akzeptiert auch das native Format von Laktatmessgeräten:
          </p>
          <pre className="bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 p-3 rounded-lg text-xs overflow-x-auto">
{`{
  "SampleID": "001",
  "Lactate": 1.8,
  "Glucose": 5.1,
  "pH": 7.38,
  "Temperature": 37.2,
  "Date": "2024-11-25",
  "Time": "10:30:15",
  "Error_code": null
}`}
          </pre>
        </div>

        <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Response Format</h3>
        <pre className="bg-zinc-900 dark:bg-zinc-950 text-blue-400 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "success": true,
  "message": "Processed 3 measurements",
  "sessionId": "auto_1234567890_abc123",
  "processedCount": 3,
  "customerId": "${selectedCustomer?.customer_id || 'CUSTOMER_ID'}"
}`}
        </pre>
      </div>

      {/* Database Migration Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💾 Datenbank-Migration</h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
          Um die Device Metadaten zu speichern, muss die Datenbank-Migration ausgeführt werden:
        </p>
        <pre className="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 p-3 rounded-lg text-xs overflow-x-auto">
{`# Migration ausführen:
chmod +x scripts/run-migration.sh
./scripts/run-migration.sh

# Oder manuell:
psql -d laktat -f scripts/add-device-metadata.sql`}
        </pre>
      </div>
    </div>
  )
}

// ============================================================================
// WEBHOOK API SECTION
// ============================================================================
function WebhookApiSection({ selectedCustomer }: { selectedCustomer: { customer_id: string; name: string } | null }) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          🪝 Webhook API (Einzelmessungen)
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Für Live-Streaming von einzelnen Datenpunkten während eines Tests.
          Ideal für Echtzeit-Datenübertragung.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            <strong>Endpoint:</strong>
          </p>
          <div className="bg-blue-100 dark:bg-blue-800 p-3 rounded-md">
            <code className="text-blue-900 dark:text-blue-100 font-mono text-sm">
              POST /api/lactate-webhook?sessionId=SESSION_ID
            </code>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Request Format</h3>
        <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-4 rounded-lg text-xs overflow-x-auto mb-6">
{`POST /api/lactate-webhook?sessionId=SESSION_ID
Content-Type: application/json

{
  "timestamp": "2025-11-25T10:30:00.000Z",
  "power": 200,
  "lactate": 2.5,
  "heartRate": 155,
  "fatOxidation": 0.8,
  "testType": "manual",
  "customerId": "${selectedCustomer?.customer_id || 'CUSTOMER_ID'}"
}`}
        </pre>

        <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Session-Daten abrufen</h3>
        <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`GET /api/lactate-webhook?sessionId=SESSION_ID

Response:
{
  "sessionId": "SESSION_ID",
  "data": [
    { "power": 150, "lactate": 1.2, "heartRate": 120, ... },
    { "power": 200, "lactate": 2.5, "heartRate": 155, ... },
    ...
  ]
}`}
        </pre>
      </div>
    </div>
  )
}

// ============================================================================
// SESSIONS API SECTION
// ============================================================================
function SessionsApiSection({ selectedCustomer }: { selectedCustomer: { customer_id: string; name: string } | null }) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          📋 Sessions API
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Verwaltung und Abruf von Testsessions.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Alle Sessions abrufen</h3>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`GET /api/sessions

Response:
[
  {
    "session_id": "auto_1234567890_abc123",
    "customer_id": "100",
    "created_at": "2025-11-25T10:00:00.000Z",
    "point_count": 8
  },
  ...
]`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Sessions für einen Kunden</h3>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`GET /api/customer-sessions?customerId=${selectedCustomer?.customer_id || 'CUSTOMER_ID'}

Response:
[
  {
    "session_id": "auto_1234567890_abc123",
    "last_updated": "2025-11-25T10:30:00.000Z",
    "point_count": 8
  },
  ...
]`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CUSTOMERS API SECTION
// ============================================================================
function CustomersApiSection() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          👥 Customers API
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Kundenverwaltung und -suche.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Kunden suchen</h3>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`GET /api/customers?search=SUCHBEGRIFF

Response:
[
  {
    "customer_id": "100",
    "name": "Max Mustermann",
    "email": "max@example.com",
    "phone": "+49 123 456789"
  },
  ...
]`}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Neuen Kunden anlegen</h3>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`POST /api/customers
Content-Type: application/json

{
  "name": "Max Mustermann",
  "customerId": "CUST001",
  "email": "max@example.com",
  "phone": "+49 123 456789",
  "dateOfBirth": "1990-01-15",
  "notes": "Radfahrer, VO2max Test geplant"
}

Response:
{
  "success": true,
  "customer": { ... }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ERROR CODES SECTION
// ============================================================================
function ErrorCodesSection() {
  const errors = [
    { code: '200', type: 'success', meaning: 'Erfolg', solution: '-' },
    { code: '201', type: 'success', meaning: 'Erfolgreich erstellt', solution: '-' },
    { code: '400', type: 'warning', meaning: 'Ungültige Anfrage', solution: 'Überprüfen Sie das Request-Format und Pflichtfelder' },
    { code: '404', type: 'error', meaning: 'Nicht gefunden', solution: 'Überprüfen Sie die Session/Customer ID' },
    { code: '409', type: 'warning', meaning: 'Konflikt', solution: 'Ressource existiert bereits (z.B. doppelte Customer ID)' },
    { code: '500', type: 'error', meaning: 'Serverfehler', solution: 'Überprüfen Sie die Datenbankverbindung und Server-Logs' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          ⚠️ HTTP Fehlercodes
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Übersicht der API-Statuscodes und deren Bedeutung.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">Code</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">Bedeutung</th>
                <th className="text-left p-3 font-semibold text-zinc-700 dark:text-zinc-300">Lösung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {errors.map((error) => (
                <tr key={error.code}>
                  <td className="p-3">
                    <code className={`px-2 py-0.5 rounded ${
                      error.type === 'success' 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : error.type === 'warning'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {error.code}
                    </code>
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">{error.meaning}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">{error.solution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Common Error Examples */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          Beispiele für Fehler-Responses
        </h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">400 - Fehlende Pflichtfelder</h4>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-red-400 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "error": "Missing required fields",
  "details": {
    "missing": ["lactate", "power"]
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">404 - Session nicht gefunden</h4>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-red-400 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "error": "Session not found",
  "sessionId": "invalid_session_id"
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">500 - Datenbankfehler</h4>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-red-400 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "error": "Database connection failed",
  "message": "Connection refused"
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
