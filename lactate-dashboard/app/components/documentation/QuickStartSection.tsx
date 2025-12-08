'use client'

export default function QuickStartSection() {
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

        {/* Navigation */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 Inhalt</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>
              <button 
                onClick={() => document.getElementById('step1')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} 
                className="hover:underline cursor-pointer bg-transparent border-none p-0 text-blue-800 dark:text-blue-200 font-normal"
              >
                Benutzer/Athleten anlegen
              </button>
            </li>
            <li>
              <button 
                onClick={() => document.getElementById('step2')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} 
                className="hover:underline cursor-pointer bg-transparent border-none p-0 text-blue-800 dark:text-blue-200 font-normal"
              >
                Mess-Protokoll anlegen
              </button>
            </li>
            <li>
              <button 
                onClick={() => document.getElementById('step3')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} 
                className="hover:underline cursor-pointer bg-transparent border-none p-0 text-blue-800 dark:text-blue-200 font-normal"
              >
                Messwerte als Stages eingeben
              </button>
            </li>
            <li>
              <button 
                onClick={() => document.getElementById('step4')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} 
                className="hover:underline cursor-pointer bg-transparent border-none p-0 text-blue-800 dark:text-blue-200 font-normal"
              >
                Werte nachträglich ändern
              </button>
            </li>
            <li>
              <button 
                onClick={() => document.getElementById('step5')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} 
                className="hover:underline cursor-pointer bg-transparent border-none p-0 text-blue-800 dark:text-blue-200 font-normal"
              >
                Performance-Dashboard ansehen
              </button>
            </li>
            <li>
              <button 
                onClick={() => document.getElementById('step6')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} 
                className="hover:underline cursor-pointer bg-transparent border-none p-0 text-blue-800 dark:text-blue-200 font-normal"
              >
                Zusätzliches Mess-Protokoll anlegen
              </button>
            </li>
          </ol>
        </div>

        {/* Step 1: Create Customer */}
        <div id="step1" className="mb-8 scroll-mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white font-bold text-lg">1</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Benutzer/Athleten anlegen</h3>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5 ml-13">
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

        {/* Step 2: Create Protocol */}
        <div id="step2" className="mb-8 scroll-mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 text-white font-bold text-lg">2</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Mess-Protokoll anlegen</h3>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-5 ml-13">
            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
              Nach dem Anlegen eines Kunden müssen Sie ein Test-Protokoll erstellen, bevor Sie Messwerte eingeben können.
            </p>
            
            <ol className="list-decimal list-inside space-y-2 text-sm text-green-700 dark:text-green-300 mb-4">
              <li>Stellen Sie sicher, dass ein Kunde ausgewählt ist (oben sichtbar)</li>
              <li>Scrollen Sie zum Bereich <strong>&quot;Test Protocol Information&quot;</strong></li>
              <li>Füllen Sie die Protokoll-Daten aus:
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li><strong>Test Date & Time</strong> - Datum und Uhrzeit des Tests</li>
                  <li><strong>Device</strong> - Wählen Sie: Bike oder Treadmill</li>
                  <li><strong>Unit</strong> - Wählen Sie: Watt (W) oder km/h</li>
                  <li><strong>Start Load</strong> - Anfangsbelastung (z.B. 50 Watt)</li>
                  <li><strong>Increment</strong> - Steigerung pro Stufe (z.B. 50 Watt)</li>
                  <li><strong>Duration</strong> - Stufendauer in Minuten (z.B. 3)</li>
                </ul>
              </li>
              <li>Klicken Sie auf <strong>&quot;Create Protocol&quot;</strong></li>
            </ol>
            
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded text-xs text-green-900 dark:text-green-100">
              <strong>✅ Beispiel-Protokoll:</strong><br/>
              Fahrrad-Stufentest: Start 50W, +50W alle 3 Minuten<br/>
              → Stufen: 50W, 100W, 150W, 200W, 250W, 300W...
            </div>
          </div>
        </div>

        {/* Step 3: Enter Stages */}
        <div id="step3" className="mb-8 scroll-mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500 text-white font-bold text-lg">3</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Messwerte als Stages eingeben</h3>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-5 ml-13">
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
              Nach Anlegen des Protokolls können Sie die Messwerte für jede Stufe eingeben.
            </p>
            
            <ol className="list-decimal list-inside space-y-2 text-sm text-purple-700 dark:text-purple-300 mb-4">
              <li>Scrollen Sie zum Bereich <strong>&quot;Stage Input&quot;</strong></li>
              <li>Für jede Test-Stufe geben Sie ein:
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li><strong>Load</strong> - Die Belastung (wird automatisch vorgeschlagen)</li>
                  <li><strong>Lactate</strong> - Laktatwert in mmol/L (z.B. 2.3)</li>
                  <li><strong>Duration</strong> - Dauer der Stufe (wird aus Protokoll übernommen)</li>
                  <li>Optional: <strong>Heart Rate</strong> (BPM)</li>
                  <li>Optional: <strong>Blood Pressure</strong> (z.B. 120/80)</li>
                </ul>
              </li>
              <li>Klicken Sie <strong>&quot;+ Add Stage&quot;</strong> nach jeder Stufe</li>
              <li>Die eingegebenen Stages erscheinen in der Tabelle darunter</li>
              <li>Wiederholen Sie für alle Teststufen (typisch 5-8 Stufen)</li>
            </ol>
            
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded text-xs text-purple-900 dark:text-purple-100">
              <strong>📊 Beispiel-Eingabe:</strong>
              <table className="mt-2 text-xs w-full border-collapse">
                <thead>
                  <tr className="border-b border-purple-300">
                    <th className="text-left py-1 pr-2">Stufe</th>
                    <th className="text-left py-1 pr-2">Load</th>
                    <th className="text-left py-1 pr-2">Lactate</th>
                    <th className="text-left py-1">HR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>1</td><td>50 W</td><td>1.2</td><td>120</td></tr>
                  <tr><td>2</td><td>100 W</td><td>1.5</td><td>135</td></tr>
                  <tr><td>3</td><td>150 W</td><td>2.1</td><td>150</td></tr>
                  <tr><td>4</td><td>200 W</td><td>3.2</td><td>165</td></tr>
                  <tr><td>5</td><td>250 W</td><td>4.8</td><td>178</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Step 4: Edit Values */}
        <div id="step4" className="mb-8 scroll-mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 text-white font-bold text-lg">4</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Werte nachträglich ändern</h3>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-5 ml-13">
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
              Falls Sie einen Fehler bemerken oder Werte korrigieren möchten:
            </p>
            
            <ol className="list-decimal list-inside space-y-2 text-sm text-amber-700 dark:text-amber-300 mb-4">
              <li>In der <strong>Stages-Tabelle</strong> finden Sie alle eingegebenen Stufen</li>
              <li>Jede Zeile hat zwei Buttons:
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li><strong>✏️ Edit</strong> - Zum Bearbeiten der Werte</li>
                  <li><strong>🗑️ Delete</strong> - Zum Löschen der Stufe</li>
                </ul>
              </li>
              <li>Beim Klick auf <strong>Edit</strong>:
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Die Werte werden ins Eingabeformular geladen</li>
                  <li>Ändern Sie die gewünschten Felder</li>
                  <li>Klicken Sie <strong>&quot;💾 Update Stage&quot;</strong></li>
                </ul>
              </li>
              <li>Beim Klick auf <strong>Delete</strong>:
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Die Stufe wird nach Bestätigung gelöscht</li>
                  <li>Sie können danach eine neue Stufe hinzufügen</li>
                </ul>
              </li>
            </ol>
            
            <div className="bg-amber-100 dark:bg-amber-900 p-3 rounded text-xs text-amber-900 dark:text-amber-100">
              <strong>💡 Tipp:</strong> Alle Änderungen werden sofort in der Datenbank gespeichert und im Dashboard aktualisiert
            </div>
          </div>
        </div>

        {/* Step 5: View Dashboard */}
        <div id="step5" className="mb-8 scroll-mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white font-bold text-lg">5</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Performance-Dashboard ansehen</h3>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-5 ml-13">
            <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
              Nachdem Sie Messwerte eingegeben haben, können Sie die Performance-Analyse ansehen.
            </p>
            
            <ol className="list-decimal list-inside space-y-2 text-sm text-orange-700 dark:text-orange-300 mb-4">
              <li>Wechseln Sie zum Tab <strong>&quot;📊 Performance Curve&quot;</strong></li>
              <li>Wählen Sie Ihren Kunden aus dem Dropdown oben</li>
              <li>Das Dashboard zeigt automatisch:
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>📈 <strong>Laktat-Leistungskurve</strong> mit allen Messpunkten</li>
                  <li>🎯 <strong>Berechnete Schwellen</strong> (LT1 und LT2)</li>
                  <li>🌈 <strong>5 farbige Trainingszonen</strong></li>
                  <li>📋 <strong>Detaillierte Zonentabelle</strong> mit Watt/HR-Bereichen</li>
                </ul>
              </li>
              <li>Wählen Sie eine <strong>Schwellenmethode</strong> aus dem Dropdown:
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li><strong>DMAX</strong> - Empfohlen für gut trainierte Athleten</li>
                  <li><strong>Mader 4mmol</strong> - Klassische 4mmol/L Schwelle</li>
                  <li><strong>Dickhuth</strong> - Individuelle Baseline-Methode</li>
                  <li>+ 5 weitere wissenschaftliche Methoden</li>
                </ul>
              </li>
              <li>Optional: <strong>Zonengrenzen anpassen</strong> per Drag & Drop:
                <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                  <li>Fahren Sie mit der Maus über eine blaue Zonenlinie</li>
                  <li>Der Cursor wird zum ↔ Symbol</li>
                  <li>Ziehen Sie die Linie nach links/rechts</li>
                  <li>Änderungen werden automatisch gespeichert</li>
                </ul>
              </li>
            </ol>
            
            <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded text-xs text-orange-900 dark:text-orange-100">
              <strong>🎨 Trainingszonen-Farben:</strong><br/>
              <div className="mt-2 flex gap-2 flex-wrap">
                <span className="px-2 py-1 rounded" style={{backgroundColor: 'rgb(144, 238, 144)'}}>Zone 1: Regeneration</span>
                <span className="px-2 py-1 rounded text-white" style={{backgroundColor: 'rgb(0, 200, 83)'}}>Zone 2: Aerobe Basis</span>
                <span className="px-2 py-1 rounded" style={{backgroundColor: 'rgb(255, 235, 59)'}}>Zone 3: Aerobe Schwelle</span>
                <span className="px-2 py-1 rounded" style={{backgroundColor: 'rgb(255, 152, 0)'}}>Zone 4: Laktatschwelle</span>
                <span className="px-2 py-1 rounded text-white" style={{backgroundColor: 'rgb(244, 67, 54)'}}>Zone 5: VO₂max</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 6: Additional Protocol */}
        <div id="step6" className="mb-8 scroll-mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500 text-white font-bold text-lg">6</span>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Zusätzliches Mess-Protokoll anlegen</h3>
          </div>
          <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-5 ml-13">
            <p className="text-sm text-cyan-700 dark:text-cyan-300 mb-4">
              Sie können für denselben Kunden mehrere Tests zu verschiedenen Zeitpunkten durchführen.
            </p>
            
            <ol className="list-decimal list-inside space-y-2 text-sm text-cyan-700 dark:text-cyan-300 mb-4">
              <li>Gehen Sie zurück zum Tab <strong>&quot;✏️ Lactate Input&quot;</strong></li>
              <li>Wählen Sie den bestehenden Kunden aus der Suche aus</li>
              <li>Klicken Sie auf <strong>&quot;➕ Add New Protocol&quot;</strong></li>
              <li>Geben Sie die neuen Test-Parameter ein (wie in Schritt 2)</li>
              <li>Erfassen Sie die Messwerte des neuen Tests (wie in Schritt 3)</li>
              <li>Im Dashboard können Sie zwischen den verschiedenen Test-Zeitpunkten wechseln</li>
            </ol>
            
            <div className="bg-cyan-100 dark:bg-cyan-900 p-3 rounded text-xs text-cyan-900 dark:text-cyan-100">
              <strong>📈 Verwendungszweck:</strong><br/>
              Mehrere Tests ermöglichen die Verfolgung von Trainingsfortschritten über Wochen/Monate hinweg.
              So sehen Sie, wie sich Schwellen und Leistung entwickeln!
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-5 mt-8">
          <h3 className="text-lg font-semibold mb-3 text-red-800 dark:text-red-200">
            ⚠️ Häufige Probleme & Lösungen
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <strong className="text-red-900 dark:text-red-100">&quot;Protocol not found&quot; beim Hinzufügen von Stages</strong><br/>
              <span className="text-red-700 dark:text-red-300">
                → Sie müssen erst ein Test-Protokoll anlegen (Schritt 2), bevor Sie Messwerte eingeben können
              </span>
            </div>
            <div>
              <strong className="text-red-900 dark:text-red-100">Kunde erscheint nicht im Performance Dashboard</strong><br/>
              <span className="text-red-700 dark:text-red-300">
                → Stellen Sie sicher, dass Sie mindestens 3 Stages mit verschiedenen Laktatwerten eingegeben haben
              </span>
            </div>
            <div>
              <strong className="text-red-900 dark:text-red-100">Kurve wird nicht richtig berechnet</strong><br/>
              <span className="text-red-700 dark:text-red-300">
                → Für aussagekräftige Schwellen werden mindestens 5-6 Stufen mit steigenden Laktatwerten empfohlen
              </span>
            </div>
            <div>
              <strong className="text-red-900 dark:text-red-100">Kann keinen neuen Kunden anlegen</strong><br/>
              <span className="text-red-700 dark:text-red-300">
                → First Name und Last Name sind Pflichtfelder. Profile ID wird automatisch generiert.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
