'use client'

import { useState } from 'react'
import { useCustomer } from '@/lib/CustomerContext'

type DocSection = 'overview' | 'quick-start' | 'threshold-methods' | 'training-zones' | 'api-device' | 'api-webhook' | 'api-sessions' | 'api-customers' | 'errors'

export default function Documentation() {
  const { selectedCustomer } = useCustomer()
  const [activeSection, setActiveSection] = useState<DocSection>('overview')

  const sections: { id: DocSection; title: string; icon: string }[] = [
    { id: 'overview', title: 'Übersicht', icon: '🏠' },
    { id: 'quick-start', title: 'Schnellstart', icon: '🚀' },
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
        {activeSection === 'overview' && <OverviewSection setActiveSection={setActiveSection} />}
        {activeSection === 'quick-start' && <QuickStartSection />}
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
function OverviewSection({ setActiveSection }: { setActiveSection: (section: DocSection) => void }) {
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
              title="8 Schwellenmethoden"
              description="DMAX, Dickhuth, Mader 4mmol, Log-Log, +1.0 mmol/L, ModDMAX, Seiler, FatMax/LT"
            />
          </button>
          <button
            onClick={() => setActiveSection('training-zones')}
            className="text-left hover:shadow-lg transition-shadow"
            title="5-Zonen Trainingsmodell anzeigen"
          >
            <InteractiveFeatureCard
              icon="🎯"
              title="5-Zonen Trainingsmodell"
              description="Automatische Berechnung nahtloser Trainingszonen basierend auf LT1 und LT2"
            />
          </button>
          <button
            onClick={() => setActiveSection('api-device')}
            className="text-left hover:shadow-lg transition-shadow"
            title="API-Dokumentation für Geräteintegration anzeigen"
          >
            <InteractiveFeatureCard
              icon="🔗"
              title="Geräteintegration"
              description="REST API für automatische Datenübertragung von Laktatmessgeräten"
            />
          </button>
        </div>
      </div>
    </div>
  )
}

function InteractiveFeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors">
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
// QUICK START SECTION
// ============================================================================
function QuickStartSection() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          🚀 Schritt-für-Schritt Anleitung
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Komplette Anleitung zum Verwenden des Lactate Dashboards - 
          vom Anlegen eines Athleten bis zur Performance-Analyse.
        </p>

        {/* Step 1: Create Customer */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white font-bold text-lg">1</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Benutzer/Athleten anlegen</h3>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5 ml-13">
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg mb-4">
              <div className="text-sm text-blue-900 dark:text-blue-100 mb-2">
                <strong>📸 Screenshot 1: Benutzer-Suche und Anlegen</strong>
              </div>
              <img 
                src="/docs/screenshot-1-customer-search.png" 
                alt="Benutzer suchen und anlegen"
                className="w-full rounded border border-blue-200 dark:border-blue-700 mb-2"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Suchfeld zum Finden bestehender Kunden und Button zum Anlegen neuer Kunden
              </p>
            </div>
            
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300 mb-4">
              <li>Gehen Sie zum Tab <strong>&quot;✏️ Lactate Input&quot;</strong></li>
              <li>Klicken Sie auf <strong>&quot;+ Create New Customer&quot;</strong></li>
              <li>Füllen Sie die Kundendaten aus:
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li><strong>First Name</strong> (Pflicht) - z.B. &quot;Max&quot;</li>
                  <li><strong>Last Name</strong> (Pflicht) - z.B. &quot;Mustermann&quot;</li>
                  <li><strong>Profile ID</strong> - wird automatisch generiert (z.B. 100)</li>
                  <li>Optional: Birth Date, Height (cm), Weight (kg)</li>
                  <li>Optional: Email, Phone</li>
                </ul>
              </li>
            </ol>
            
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 mt-4">
              Bestehenden Kunden wiederfinden
            </h4>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded text-xs text-blue-900 dark:text-blue-100">
              <p className="mb-2"><strong>Nach Anlegen eines Kunden können Sie diesen jederzeit wiederfinden:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-3">
                <li>Geben Sie die <strong>ersten Buchstaben</strong> des Vor- oder Nachnamens in das Suchfeld ein</li>
                <li>z.B. &quot;Karl&quot; oder &quot;Val&quot; für &quot;Karl Valentin&quot;</li>
                <li>Die Suche funktioniert in Echtzeit - passende Kunden erscheinen sofort</li>
                <li>Klicken Sie auf den gewünschten Kunden, um ihn auszuwählen</li>
              </ol>
              <p className="mt-2 text-xs italic">
                💡 Tipp: Die Suche ist nicht case-sensitive und findet auch Teilstrings im Namen
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Create Test Protocol */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 text-white font-bold text-lg">2</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Mess-Protokoll anlegen</h3>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-5 ml-13">
            <div className="bg-indigo-100 dark:bg-indigo-900 p-4 rounded-lg mb-4">
              <div className="text-sm text-indigo-900 dark:text-indigo-100 mb-2">
                <strong>📸 Screenshot 3: Protokoll-Auswahl und Anlegen</strong>
              </div>
              <img 
                src="/docs/screenshot-3-protocol.png" 
                alt="Protokoll auswählen und anlegen"
                className="w-full rounded border border-indigo-200 dark:border-indigo-700 mb-2"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                Test-Protokoll Liste mit Button &quot;+ New Protocol&quot; zum Anlegen weiterer Protokolle
              </p>
            </div>
            <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3">
              Was ist ein Mess-Protokoll?
            </h4>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-4">
              Das Mess-Protokoll gibt die <strong>Vorgaben für den Test</strong> an: Testgerät, Einheit, 
              Startbelastung, Steigerung pro Stufe und Stufendauer. Diese Werte definieren die Struktur 
              des Laktat-Stufentests.
            </p>
            
            <ol className="list-decimal list-inside space-y-3 text-sm text-indigo-700 dark:text-indigo-300 mb-4">
              <li>
                <strong>Testdatum und -zeit eingeben</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Date: z.B. 08.12.2025</li>
                  <li>Time: z.B. 13:58</li>
                </ul>
              </li>
              <li>
                <strong>Testgerät wählen (Device)</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li><strong>Treadmill (Laufband)</strong> - für Lauftests → Einheit: <code className="bg-indigo-100 dark:bg-indigo-900 px-1">km/h</code></li>
                  <li><strong>Bike (Fahrrad-Ergometer)</strong> - für Radtests → Einheit: <code className="bg-indigo-100 dark:bg-indigo-900 px-1">Watt (W)</code></li>
                </ul>
              </li>
              <li>
                <strong>Test-Parameter festlegen</strong>
                <div className="mt-2 bg-indigo-100 dark:bg-indigo-900 p-3 rounded">
                  <strong>Beispiel Rad-Test (Watt):</strong>
                  <ul className="list-disc list-inside ml-3 mt-1 space-y-1">
                    <li>Start Load: <code className="bg-white dark:bg-indigo-950 px-2">50</code> Watt</li>
                    <li>Increment: <code className="bg-white dark:bg-indigo-950 px-2">50</code> Watt (Steigerung pro Stufe)</li>
                    <li>Duration: <code className="bg-white dark:bg-indigo-950 px-2">3</code> min (Stufendauer)</li>
                  </ul>
                  <p className="text-xs mt-2">→ Stufen: 50W, 100W, 150W, 200W, ... (jeweils 3 min)</p>
                </div>
                <div className="mt-2 bg-indigo-100 dark:bg-indigo-900 p-3 rounded">
                  <strong>Beispiel Lauf-Test (km/h):</strong>
                  <ul className="list-disc list-inside ml-3 mt-1 space-y-1">
                    <li>Start Load: <code className="bg-white dark:bg-indigo-950 px-2">6</code> km/h</li>
                    <li>Increment: <code className="bg-white dark:bg-indigo-950 px-2">2</code> km/h (Steigerung pro Stufe)</li>
                    <li>Duration: <code className="bg-white dark:bg-indigo-950 px-2">3</code> min (Stufendauer)</li>
                  </ul>
                  <p className="text-xs mt-2">→ Stufen: 6 km/h, 8 km/h, 10 km/h, 12 km/h, ... (jeweils 3 min)</p>
                </div>
              </li>
              <li>
                <strong>Protokoll hinzufügen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Klicken Sie <strong>&quot;+ Add Protocol&quot;</strong></li>
                  <li>Das Protokoll erscheint unterhalb als Zeile (z.B. &quot;2025-12-08 • treadmill (kmh) • 6 + 2 / 3min&quot;)</li>
                </ul>
              </li>
              <li>
                <strong>Kunde mit Protokoll erstellen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Klicken Sie auf <strong>&quot;Create Customer&quot;</strong></li>
                  <li>✅ Kunde und Test-Protokoll werden gemeinsam angelegt</li>
                </ul>
              </li>
            </ol>
            
            <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded text-xs text-indigo-900 dark:text-indigo-100">
              <strong>💡 Das Protokoll erscheint in der Liste und kann später für weitere Tests wiederverwendet werden</strong>
            </div>
          </div>
        </div>

        {/* Step 3: Enter Data */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500 text-white font-bold text-lg">3</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Messwerte als Stages eingeben</h3>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-5 ml-13">
            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">
              Stage-by-Stage Dateneingabe
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
              Nach Anlegen des Kunden und Protokolls können Sie die <strong>gemessenen Werte für jede Stufe</strong> eingeben.
              Die Eingabemaske erscheint automatisch und führt Sie durch den Test.
            </p>
            
            <ol className="list-decimal list-inside space-y-3 text-sm text-purple-700 dark:text-purple-300 mb-4">
              <li>
                <strong>Kunde auswählen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Wählen Sie Ihren zuvor angelegten Kunden aus dem Dropdown</li>
                  <li>Die blaue Info-Box zeigt die Kundendaten an</li>
                  <li>Das Test-Protokoll wird automatisch geladen</li>
                </ul>
              </li>
              <li>
                <strong>Werte für jede Stufe eingeben</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li><strong>Load</strong> (Pflicht) - Belastung in Watt oder km/h (vorausgefüllt aus Protokoll)</li>
                  <li><strong>Lactate</strong> (Pflicht) - Laktatwert in mmol/L</li>
                  <li><strong>Heart Rate</strong> (Optional) - Herzfrequenz in bpm</li>
                  <li><strong>Duration</strong> - Stufendauer (vorausgefüllt mit Protokoll-Vorgabe, z.B. 3:00 min)</li>
                  <li>Optional: Blood Pressure (Systolic/Diastolic), Notes</li>
                </ul>
              </li>
              <li>
                <strong>⚠️ WICHTIG: Unvollständige letzte Stufe</strong>
                <div className="mt-2 bg-purple-100 dark:bg-purple-900 p-3 rounded">
                  <p className="font-medium mb-2">Bei den meisten Tests erreicht der Athlet die letzte Stufe nicht komplett!</p>
                  <p className="text-xs mb-2"><strong>Beispiel:</strong></p>
                  <ul className="list-disc list-inside ml-3 text-xs space-y-1">
                    <li>Stufe 7: 18 km/h → 3:00 min geschafft</li>
                    <li>Stufe 8: 20 km/h → <strong>nur 0:50 min</strong> geschafft (statt 3:00 min)</li>
                  </ul>
                  <p className="text-xs mt-2"><strong>→ Geben Sie die tatsächliche Zeit ein: <code className="bg-white dark:bg-purple-950 px-1">0:50</code></strong></p>
                  <p className="text-xs mt-2 font-semibold">
                    ✨ Das System berechnet automatisch die <strong>theoretische Load</strong> (z.B. 18.6 km/h)
                  </p>
                  <p className="text-xs mt-1">
                    Die theoretische Load ist die Belastung, die der Athlet bei voller Stufendauer erreicht hätte.
                    Sie wird für die Schwellenberechnungen verwendet.
                  </p>
                </div>
              </li>
              <li>
                <strong>Stufe hinzufügen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Klicken Sie <strong>&quot;✓ Continue to Next Stage&quot;</strong></li>
                  <li>Die Stufe wird gespeichert und erscheint in der Liste unten</li>
                  <li>Die Eingabemaske springt automatisch zur nächsten Stufe</li>
                  <li>Load, Duration und Stage-Nummer werden automatisch hochgezählt</li>
                </ul>
              </li>
              <li>
                <strong>Alle Stufen eingeben und Test abschließen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Wiederholen Sie Schritt 2-4 für alle Teststufen (typisch: 5-9 Stufen)</li>
                  <li>Letzte Stufe mit tatsächlicher Zeit eingeben (siehe Wichtig oben)</li>
                  <li>Test ist automatisch gespeichert</li>
                </ul>
              </li>
            </ol>
            
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded text-xs text-purple-900 dark:text-purple-100 mb-3">
              <strong>📊 Beispiel vollständiger Test (Laufband):</strong>
              <table className="mt-2 text-xs w-full border-collapse">
                <thead>
                  <tr className="border-b border-purple-200 dark:border-purple-700">
                    <th className="text-left py-1 px-2">Stage</th>
                    <th className="text-left py-1 px-2">Duration</th>
                    <th className="text-left py-1 px-2">Load (km/h)</th>
                    <th className="text-left py-1 px-2">Lactate</th>
                    <th className="text-left py-1 px-2">HR</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr><td className="px-2">1</td><td className="px-2">3:00 min</td><td className="px-2">6.00 km/h</td><td className="px-2">0.95 mmol/L</td><td className="px-2">104 bpm</td></tr>
                  <tr><td className="px-2">2</td><td className="px-2">3:00 min</td><td className="px-2">8.00 km/h</td><td className="px-2">1 mmol/L</td><td className="px-2">120 bpm</td></tr>
                  <tr><td className="px-2">3</td><td className="px-2">3:00 min</td><td className="px-2">10.00 km/h</td><td className="px-2">1.12 mmol/L</td><td className="px-2">135 bpm</td></tr>
                  <tr><td className="px-2">4</td><td className="px-2">3:00 min</td><td className="px-2">12.00 km/h</td><td className="px-2">1.45 mmol/L</td><td className="px-2">148 bpm</td></tr>
                  <tr><td className="px-2">5</td><td className="px-2">3:00 min</td><td className="px-2">14.00 km/h</td><td className="px-2">2.07 mmol/L</td><td className="px-2">161 bpm</td></tr>
                  <tr><td className="px-2">6</td><td className="px-2">3:00 min</td><td className="px-2">16.00 km/h</td><td className="px-2">3.49 mmol/L</td><td className="px-2">175 bpm</td></tr>
                  <tr><td className="px-2">7</td><td className="px-2">3:00 min</td><td className="px-2">18.00 km/h</td><td className="px-2">6.45 mmol/L</td><td className="px-2">183 bpm</td></tr>
                  <tr className="bg-purple-200 dark:bg-purple-800 font-bold">
                    <td className="px-2">8</td>
                    <td className="px-2 text-red-600 dark:text-red-400">0:50 min</td>
                    <td className="px-2">20.00 km/h <span className="text-red-600 dark:text-red-400">(theoretical: 18.56 km/h)</span></td>
                    <td className="px-2">8.24 mmol/L</td>
                    <td className="px-2">183 bpm</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs"><strong>→ Stufe 8:</strong> Athlet schaffte nur 50 Sekunden statt 3 Minuten. System berechnet theoretische Load von 18.56 km/h.</p>
            </div>
            
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded text-xs text-purple-900 dark:text-purple-100">
              <strong>ℹ️ Die eingegebenen Stages werden automatisch gespeichert und erscheinen in der Liste unterhalb der Eingabemaske</strong>
            </div>
          </div>
        </div>

        {/* Step 5: Edit Data */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-white font-bold text-lg">4</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Werte nachträglich ändern</h3>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-5 ml-13">
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
              Eingegebene Werte können jederzeit korrigiert werden. Die Stages werden als Liste unterhalb der Eingabemaske angezeigt.
            </p>
            
            <ol className="list-decimal list-inside space-y-3 text-sm text-amber-700 dark:text-amber-300 mb-4">
              <li>
                <strong>Stage anklicken zum Bearbeiten</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Klicken Sie auf eine Stage-Zeile in der Liste (z.B. &quot;Stage 3 • 3:00 min • 10.00 km/h • 1.12 mmol/L • 135 bpm&quot;)</li>
                  <li>Die Werte werden in die Eingabemaske übernommen</li>
                  <li>Die Stage-Nummer wird automatisch erkannt</li>
                </ul>
              </li>
              <li>
                <strong>Werte ändern</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Ändern Sie Lactate, Heart Rate, Duration oder andere Werte</li>
                  <li>Klicken Sie erneut auf <strong>&quot;✓ Continue to Next Stage&quot;</strong></li>
                  <li>Die Stage wird aktualisiert</li>
                </ul>
              </li>
              <li>
                <strong>⚠️ ACHTUNG: Load-Änderung erstellt neue Stage!</strong>
                <div className="mt-2 bg-amber-100 dark:bg-amber-900 p-3 rounded">
                  <p className="font-medium mb-2">Wenn Sie die <strong>Load</strong> (Belastung) ändern:</p>
                  <ul className="list-disc list-inside ml-3 text-xs space-y-1">
                    <li><strong>Es wird KEINE bestehende Stage überschrieben</strong></li>
                    <li><strong>Es wird eine NEUE Stage mit der neuen Load eingefügt</strong></li>
                    <li>Die Stage-Nummern werden automatisch neu sortiert</li>
                  </ul>
                  <p className="text-xs mt-2"><strong>Beispiel:</strong></p>
                  <ul className="list-disc list-inside ml-3 text-xs space-y-1">
                    <li>Vorher: Stage 1 (50W), Stage 2 (100W), Stage 3 (150W)</li>
                    <li>Sie ändern Stage 2 von 100W auf 120W</li>
                    <li>Nachher: Stage 1 (50W), Stage 2 (100W), <strong>Stage 3 (120W - NEU)</strong>, Stage 4 (150W)</li>
                  </ul>
                  <p className="text-xs mt-2 font-semibold text-amber-900 dark:text-amber-100">
                    → Zum Löschen einer Stage verwenden Sie den <strong>&quot;Remove&quot;</strong> Button!
                  </p>
                </div>
              </li>
              <li>
                <strong>Stage löschen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Klicken Sie auf den roten <strong>&quot;Remove&quot;</strong> Button neben der Stage</li>
                  <li>Die Stage wird sofort gelöscht</li>
                  <li>Die nachfolgenden Stages werden automatisch neu nummeriert</li>
                </ul>
              </li>
            </ol>
            
            <div className="bg-amber-100 dark:bg-amber-900 p-3 rounded text-xs text-amber-900 dark:text-amber-100">
              <strong>💡 Tipp:</strong> Zum Korrigieren von Laktat/HR-Werten: Stage anklicken → Wert ändern → Speichern<br/>
              <strong>💡 Tipp:</strong> Zum Einfügen einer zusätzlichen Belastungsstufe: Neue Load eingeben → wird automatisch einsortiert
            </div>
          </div>
        </div>

        {/* Step 4: View Dashboard */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white font-bold text-lg">5</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Performance-Dashboard ansehen</h3>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-5 ml-13">
            <div className="bg-orange-100 dark:bg-orange-900 p-4 rounded-lg mb-4">
              <div className="text-sm text-orange-900 dark:text-orange-100 mb-2">
                <strong>📸 Screenshot 2: Performance Curve Ansicht</strong>
              </div>
              <img 
                src="/docs/screenshot-2-performance-curve.png" 
                alt="Performance Curve mit Trainingszonen"
                className="w-full rounded border border-orange-200 dark:border-orange-700 mb-2"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Laktat-Leistungskurve mit Herzfrequenz, Schwellenmarkierungen (LT1/LT2) und farbigen Trainingszonen
              </p>
            </div>
            <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-3">
              Messdaten visualisieren und analysieren
            </h4>
            <ol className="list-decimal list-inside space-y-3 text-sm text-orange-700 dark:text-orange-300 mb-4">
              <li>
                <strong>Zur Performance Curve wechseln</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Klicken Sie auf den Tab <strong>&quot;📈 Performance Curve&quot;</strong></li>
                </ul>
              </li>
              <li>
                <strong>Kunden auswählen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Wählen Sie Ihren Kunden aus dem Dropdown (z.B. &quot;Karl Valentin&quot;)</li>
                  <li>Die Kundeninformationen werden oben angezeigt</li>
                </ul>
              </li>
              <li>
                <strong>Mess-Protokoll/Test-Session auswählen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Im Dropdown <strong>&quot;Session&quot;</strong> sehen Sie alle verfügbaren Tests</li>
                  <li>Jeder Test zeigt: Test-ID, Anzahl Stages, Datum, Uhrzeit</li>
                  <li>z.B. &quot;TEST-28895 | 8 Punkte | 08/12/2025, 00:00:00&quot;</li>
                  <li>Wählen Sie das gewünschte Protokoll aus</li>
                  <li>Die Leistungskurve wird automatisch geladen</li>
                </ul>
              </li>
              <li>
                <strong>Darstellung analysieren</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>📈 <strong>Laktat-Leistungskurve</strong> (rote Linie) - zeigt die gemessenen Laktatwerte</li>
                  <li>💙 <strong>Herzfrequenz-Kurve</strong> (blaue Linie, rechte Y-Achse) - zeigt die Herzfrequenz</li>
                  <li>🎯 <strong>Schwellenmarkierungen</strong> - gestrichelte vertikale Linien für LT1 und LT2</li>
                  <li>🌈 <strong>5 farbige Trainingszonen</strong> - Hintergrundfarben zeigen die Bereiche</li>
                  <li>📊 <strong>Schwellenwerte-Tabelle</strong> - zeigt LT1 und LT2 mit Load, Lactate und HR</li>
                </ul>
              </li>
              <li>
                <strong>Schwellenmethode wählen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Oberhalb des Diagramms: <strong>&quot;Wissenschaftliche Schwellenmethoden&quot;</strong></li>
                  <li>Klicken Sie auf eine der Methoden-Buttons:
                    <ul className="list-circle list-inside ml-5 mt-1 space-y-1">
                      <li><strong>Dickhuth IAT</strong> - Individuelle anaerobe Schwelle (Baseline + 1.5 mmol/L)</li>
                      <li><strong>DMAX</strong> - Empfohlen für trainierte Athleten (maximale Distanz zur Baseline)</li>
                      <li><strong>4 mmol OBLA</strong> - Klassische 4 mmol/L Schwelle nach Mader</li>
                      <li><strong>ModDMAX</strong> - Modifizierte DMAX-Methode</li>
                    </ul>
                  </li>
                  <li>Die Schwellenlinien und Zonen werden automatisch neu berechnet</li>
                </ul>
              </li>
              <li>
                <strong>🎯 Schwellen manuell anpassen (LT1 und LT2)</strong>
                <div className="mt-2 bg-orange-100 dark:bg-orange-900 p-3 rounded">
                  <p className="font-medium mb-2 text-orange-900 dark:text-orange-100">Sie können die Schwellenlinien individuell verschieben:</p>
                  <ol className="list-decimal list-inside ml-3 text-xs space-y-1 text-orange-800 dark:text-orange-200">
                    <li>Fahren Sie mit der <strong>Maus über eine gestrichelte Linie</strong> (LT1 grün-gestrichelt oder LT2 orange-gestrichelt)</li>
                    <li>Der <strong>Cursor ändert sich zu ↔</strong> (Verschiebe-Symbol)</li>
                    <li><strong>Klicken und ziehen</strong> Sie die Linie nach links oder rechts</li>
                    <li>Die Position wird in Echtzeit aktualisiert</li>
                    <li>Automatisch erscheint ein zusätzlicher Button: <strong>&quot;Manuell (Laden)&quot;</strong></li>
                    <li>Ihre manuelle Anpassung wird <strong>automatisch in der Datenbank gespeichert</strong></li>
                  </ol>
                  <p className="text-xs mt-2 font-semibold text-orange-900 dark:text-orange-100">
                    📱 Touch-Geräte: Tippen und halten Sie die gestrichelte Linie, dann ziehen
                  </p>
                </div>
              </li>
              <li>
                <strong>🌈 Trainingszonen manuell anpassen</strong>
                <div className="mt-2 bg-orange-100 dark:bg-orange-900 p-3 rounded">
                  <p className="font-medium mb-2 text-orange-900 dark:text-orange-100">Zonengrenzen können unabhängig von den Schwellen verschoben werden:</p>
                  <ol className="list-decimal list-inside ml-3 text-xs space-y-1 text-orange-800 dark:text-orange-200">
                    <li>Fahren Sie mit der Maus über ein <strong>schwarzes Rechteck an der X-Achse</strong> (unten im Diagramm)</li>
                    <li>Der <strong>Cursor ändert sich zu ↔</strong></li>
                    <li><strong>Klicken und ziehen</strong> Sie das Rechteck nach links oder rechts</li>
                    <li>Die Zonengrenzen (vertikale schwarze Linien) verschieben sich entsprechend</li>
                    <li>Die Änderung wird ebenfalls automatisch gespeichert</li>
                    <li>Der Button <strong>&quot;Manuell (Laden)&quot;</strong> wird eingeblendet/aktualisiert</li>
                  </ol>
                  <p className="text-xs mt-2 italic text-orange-800 dark:text-orange-200">
                    💡 Unterschied: Schwellenlinien (LT1/LT2) beeinflussen die Berechnung, Zonengrenzen nur die Visualisierung der 5 Zonen
                  </p>
                </div>
              </li>
              <li>
                <strong>↔️ Zwischen Manuell und Methoden wechseln</strong>
                <div className="mt-2 bg-orange-100 dark:bg-orange-900 p-3 rounded">
                  <p className="font-medium mb-2 text-orange-900 dark:text-orange-100">Vergleichen Sie Ihre manuelle Anpassung mit wissenschaftlichen Methoden:</p>
                  <ul className="list-disc list-inside ml-3 text-xs space-y-1 text-orange-800 dark:text-orange-200">
                    <li>Nach manueller Anpassung: Klicken Sie <strong>&quot;Manuell (Laden)&quot;</strong> um Ihre Einstellungen anzuzeigen</li>
                    <li>Zum Vergleich: Wählen Sie eine wissenschaftliche Methode (z.B. <strong>&quot;DMAX&quot;</strong>)</li>
                    <li>Die Kurve zeigt die automatisch berechneten Schwellen</li>
                    <li>Wechseln Sie zurück zu <strong>&quot;Manuell (Laden)&quot;</strong> um Ihre Anpassungen wieder zu sehen</li>
                    <li><strong>Ihre manuellen Werte bleiben gespeichert</strong>, auch wenn Sie zwischen Methoden wechseln</li>
                    <li>So können Sie verschiedene Ansätze direkt vergleichen</li>
                  </ul>
                  <p className="text-xs mt-2 font-semibold text-orange-900 dark:text-orange-100">
                    ⚡ Anwendungsfall: Erfahrene Trainer können die automatischen Berechnungen mit ihrer Expertise verfeinern und individuell anpassen
                  </p>
                </div>
              </li>
            </ol>
            
            <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded text-xs text-orange-900 dark:text-orange-100">
              <strong>🎨 Trainingszonenfarben:</strong><br/>
              <div className="mt-2 flex gap-2 flex-wrap">
                <span className="px-2 py-1 rounded" style={{backgroundColor: 'rgb(144, 238, 144)'}}>Zone 1: Regeneration</span>
                <span className="px-2 py-1 rounded" style={{backgroundColor: 'rgb(135, 206, 250)'}}>Zone 2: Aerobe Basis</span>
                <span className="px-2 py-1 rounded" style={{backgroundColor: 'rgb(255, 235, 59)'}}>Zone 3: Aerobe Schwelle</span>
                <span className="px-2 py-1 rounded" style={{backgroundColor: 'rgb(255, 192, 203)'}}>Zone 4: Anaerober Bereich</span>
                <span className="px-2 py-1 rounded" style={{backgroundColor: 'rgb(221, 160, 221)'}}>Zone 5: Power</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Step 6: Additional Protocol */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500 text-white font-bold text-lg">6</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Zusätzliches Mess-Protokoll anlegen</h3>
          </div>
          <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-5 ml-13">
            <h4 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-3">
              Weitere Tests für bestehende Kunden
            </h4>
            <p className="text-sm text-cyan-700 dark:text-cyan-300 mb-4">
              Sie können für jeden Kunden <strong>mehrere Mess-Protokolle</strong> anlegen, um verschiedene Tests 
              zu vergleichen (z.B. Rad-Test und Lauf-Test, oder Tests zu verschiedenen Zeitpunkten).
            </p>
            
            <ol className="list-decimal list-inside space-y-3 text-sm text-cyan-700 dark:text-cyan-300 mb-4">
              <li>
                <strong>Kunden auswählen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Gehen Sie zum Tab <strong>&quot;✏️ Lactate Input&quot;</strong></li>
                  <li>Suchen und wählen Sie den bestehenden Kunden (z.B. &quot;Karl Valentin&quot;)</li>
                  <li>Die Kundeninformationen werden in der blauen Box angezeigt</li>
                </ul>
              </li>
              <li>
                <strong>Neues Protokoll erstellen</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Im Bereich <strong>&quot;Select Test Protocol&quot;</strong> klicken Sie auf <strong>&quot;+ New Protocol&quot;</strong></li>
                  <li>Ein neues Protokoll-Formular erscheint</li>
                </ul>
              </li>
              <li>
                <strong>Protokoll-Daten eingeben</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Date & Time: Neues Testdatum und -zeit</li>
                  <li>Device: z.B. &quot;Treadmill&quot; wenn vorher &quot;Bike&quot; verwendet wurde</li>
                  <li>Unit: entsprechend dem Device (km/h oder Watt)</li>
                  <li>Start Load, Increment, Duration: gemäß neuem Testprotokoll</li>
                </ul>
              </li>
              <li>
                <strong>Protokoll speichern und Daten eingeben</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Das neue Protokoll wird in der Liste angezeigt</li>
                  <li>Es ist automatisch ausgewählt</li>
                  <li>Geben Sie die Messwerte wie in Schritt 4 beschrieben ein</li>
                </ul>
              </li>
              <li>
                <strong>Zwischen Protokollen wechseln</strong>
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>In der <strong>&quot;Select Test Protocol&quot;</strong> Liste sehen Sie alle Protokolle</li>
                  <li>Jedes zeigt: Test-ID, Datum, Zeit, Device, Unit, Parameter</li>
                  <li>Klicken Sie auf ein Protokoll, um es auszuwählen</li>
                  <li>Die bestehenden Stages werden geladen</li>
                  <li><strong>Vergleichstests:</strong> Mit/ohne Höhentraining, verschiedene Jahreszeiten</li>
                </ul>
              </li>
            </ol>
            
            <div className="bg-cyan-100 dark:bg-cyan-900 p-3 rounded text-xs text-cyan-900 dark:text-cyan-100">
              <strong>ℹ️ Alle Protokolle eines Kunden sind in der Session-Auswahl verfügbar und können jederzeit zwischen ihnen gewechselt werden</strong>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-3 text-amber-800 dark:text-amber-200">
            ⚠️ Häufige Probleme & Lösungen
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <strong className="text-amber-900 dark:text-amber-100">Kunde erscheint nicht in Performance Curve</strong><br/>
              <span className="text-amber-700 dark:text-amber-300">
                → Stellen Sie sicher, dass Sie mindestens eine Stage eingegeben und gespeichert haben
              </span>
            </div>
            <div>
              <strong className="text-amber-900 dark:text-amber-100">Keine Kurve sichtbar</strong><br/>
              <span className="text-amber-700 dark:text-amber-300">
                → Mindestens 3 Stufen mit unterschiedlichen Laktatwerten erforderlich
              </span>
            </div>
            <div>
              <strong className="text-amber-900 dark:text-amber-100">Theoretische Load wird nicht berechnet</strong><br/>
              <span className="text-amber-700 dark:text-amber-300">
                → Stellen Sie sicher, dass die Duration unter der Zielzeit liegt (z.B. 0:50 statt 3:00)
              </span>
            </div>
          </div>
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
