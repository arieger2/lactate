'use client'

type DocSection = 'overview' | 'quick-start' | 'threshold-methods' | 'training-zones' | 'api-device' | 'api-webhook' | 'api-sessions' | 'api-customers' | 'errors'

interface OverviewSectionProps {
  setActiveSection: (section: DocSection) => void
}

function InteractiveFeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  )
}

export default function OverviewSection({ setActiveSection }: OverviewSectionProps) {
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
          <button
            onClick={() => setActiveSection('quick-start')}
            className="text-left hover:shadow-lg transition-shadow"
            title="Schritt-für-Schritt Anleitung öffnen"
          >
            <InteractiveFeatureCard
              icon="🚀"
              title="Schritt-für-Schritt Anleitung"
              description="Komplette Anleitung: Datenbank anlegen, Kunden erstellen, Daten eingeben und Dashboard nutzen"
            />
          </button>
          <button
            onClick={() => setActiveSection('threshold-methods')}
            className="text-left hover:shadow-lg transition-shadow"
            title="Informationen zu den 8 Schwellenmethoden anzeigen"
          >
            <InteractiveFeatureCard
              icon="📊"
              title="8 Wissenschaftliche Methoden"
              description="Dickhuth, DMAX, ModDMAX, 4mmol OBLA, Baseline+1.5, Log-Log, Exp-Dmax, Dmax+1"
            />
          </button>
          <button
            onClick={() => setActiveSection('training-zones')}
            className="text-left hover:shadow-lg transition-shadow"
            title="Details zu den 5 Trainingszonen anzeigen"
          >
            <InteractiveFeatureCard
              icon="🎯"
              title="5 Trainingszonen"
              description="Automatische Berechnung und Visualisierung: Regeneration, Aerobe Basis, Aerobe Schwelle, Anaerob, Power"
            />
          </button>
          <button
            onClick={() => setActiveSection('api-device')}
            className="text-left hover:shadow-lg transition-shadow"
            title="Device Interface API Dokumentation"
          >
            <InteractiveFeatureCard
              icon="🔗"
              title="Device Interface"
              description="API für externe Messgeräte zur automatischen Datenübertragung"
            />
          </button>
        </div>

        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">
            🎯 Hauptfunktionen
          </h3>
          <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
              <span><strong>Laktat-Leistungskurve:</strong> Visualisierung mit Herzfrequenz und Schwellenmarkierungen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
              <span><strong>8 Schwellenmethoden:</strong> Wissenschaftlich validierte Berechnungen für LT1 und LT2</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
              <span><strong>Manuelle Anpassung:</strong> Drag-and-drop Schwellenlinien und Zonengrenzen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
              <span><strong>Automatische Berechnung:</strong> Theoretische Load für unvollständige letzte Stufen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
              <span><strong>Device Interface:</strong> Automatische Datenübernahme von Messgeräten</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
              <span><strong>Mehrere Protokolle:</strong> Vergleich verschiedener Tests pro Kunde</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
