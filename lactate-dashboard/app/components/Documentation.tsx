'use client'

import { useCustomer } from '@/lib/CustomerContext'

export default function Documentation() {
  const { selectedCustomer } = useCustomer()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
          📚 API Dokumentation
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Schnittstellen zur automatischen Datenübertragung von Messgeräten
        </p>
      </div>

      {/* Device Interface API */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          🔗 Device Interface API
        </h3>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-6">
          <p className="text-sm text-green-700 dark:text-green-300 mb-3">
            Messgeräte können automatisch Daten an den folgenden Endpunkt senden:
          </p>
          <div className="bg-green-100 dark:bg-green-800 p-3 rounded-md">
            <code className="text-green-900 dark:text-green-100 font-mono text-sm">
              POST {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/device-interface
            </code>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">📡 Webhook URL</h4>
            <code className="text-xs text-blue-600 dark:text-blue-400 break-all">
              {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/lactate-webhook
            </code>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">🧪 Test Seite</h4>
            <a 
              href="/device-test.html" 
              target="_blank" 
              className="text-sm text-blue-600 dark:text-blue-400 underline hover:text-blue-800"
            >
              Device Test Interface öffnen →
            </a>
          </div>
        </div>

        <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 mb-6">
          <p>✅ <strong>Datenbank:</strong> localhost PostgreSQL (laktat database)</p>
          <p>📊 <strong>Auto-Verarbeitung:</strong> Messungen werden automatisch zum Performance Kurve Tab gesendet</p>
          <p>👤 <strong>Kunden-Verknüpfung:</strong> Daten werden mit ausgewähltem Kunden verknüpft ({selectedCustomer?.name || 'Keiner ausgewählt'})</p>
        </div>
      </div>

      {/* Request Format */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          📋 Request Format
        </h3>
        <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`POST /api/device-interface
Content-Type: application/json

{
  "deviceId": "lactate-analyzer-01",
  "customerId": "${selectedCustomer?.customer_id || 'CUSTOMER_ID'}",
  "measurementData": [
    {
      "lactate": 1.3,
      "power": 150,
      "heartRate": 128,
      "vo2": 28.5
    },
    {
      "lactate": 2.0,
      "power": 200,
      "heartRate": 145,
      "vo2": 35.5
    },
    {
      "lactate": 4.1,
      "power": 250,
      "heartRate": 163,
      "vo2": 43.2
    }
  ]
}`}
        </pre>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Pflichtfelder</h4>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">deviceId</code>
                <span>Geräte-Identifikator</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">customerId</code>
                <span>Kunden-ID</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">measurementData</code>
                <span>Array von Messungen</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">lactate</code>
                <span>Laktatwert (mmol/L)</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">power</code>
                <span>Leistung in Watt</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Optionale Felder</h4>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">heartRate</code>
                <span>Herzfrequenz (bpm)</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">vo2</code>
                <span>VO₂ (mL/kg/min)</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">timestamp</code>
                <span>ISO Zeitstempel</span>
              </li>
              <li className="flex items-start gap-2">
                <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-xs">notes</code>
                <span>Zusätzliche Notizen</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Response Format */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          📤 Response Format
        </h3>
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

      {/* Webhook API */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          🪝 Webhook API (Einzelmessungen)
        </h3>
        
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Für einzelne Datenpunkte kann auch der Webhook-Endpunkt verwendet werden:
        </p>

        <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-4 rounded-lg text-xs overflow-x-auto mb-4">
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

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Hinweis</h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Der Webhook-Endpunkt eignet sich für Live-Streaming von einzelnen Datenpunkten während eines Tests.
            Für Batch-Uploads von mehreren Messungen verwenden Sie den Device Interface Endpunkt.
          </p>
        </div>
      </div>

      {/* Sessions API */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          📊 Sessions API
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Alle Sessions abrufen</h4>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
{`GET /api/sessions`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Sessions für einen Kunden</h4>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
{`GET /api/customer-sessions?customerId=${selectedCustomer?.customer_id || 'CUSTOMER_ID'}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Session-Daten abrufen</h4>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
{`GET /api/lactate-webhook?sessionId=SESSION_ID`}
            </pre>
          </div>
        </div>
      </div>

      {/* Customers API */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          👥 Customers API
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Kunden suchen</h4>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
{`GET /api/customers?search=SUCHBEGRIFF`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Neuen Kunden anlegen</h4>
            <pre className="bg-zinc-900 dark:bg-zinc-950 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
{`POST /api/customers
Content-Type: application/json

{
  "name": "Max Mustermann",
  "customerId": "CUST001",
  "email": "max@example.com",
  "phone": "+49 123 456789",
  "dateOfBirth": "1990-01-15",
  "notes": "Radfahrer, VO2max Test geplant"
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Error Codes */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          ⚠️ Fehlercodes
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="text-left p-3 font-medium text-zinc-700 dark:text-zinc-300">Code</th>
                <th className="text-left p-3 font-medium text-zinc-700 dark:text-zinc-300">Bedeutung</th>
                <th className="text-left p-3 font-medium text-zinc-700 dark:text-zinc-300">Lösung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              <tr>
                <td className="p-3"><code className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">200</code></td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Erfolg</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">-</td>
              </tr>
              <tr>
                <td className="p-3"><code className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">400</code></td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Ungültige Anfrage</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Überprüfen Sie das Request-Format</td>
              </tr>
              <tr>
                <td className="p-3"><code className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded">404</code></td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Nicht gefunden</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Überprüfen Sie die Session/Customer ID</td>
              </tr>
              <tr>
                <td className="p-3"><code className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded">500</code></td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Serverfehler</td>
                <td className="p-3 text-zinc-600 dark:text-zinc-400">Überprüfen Sie die Datenbankverbindung</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
