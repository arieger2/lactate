import React from 'react'

interface DeviceApiSectionProps {
  selectedCustomer: { customer_id: string; name: string } | null
}

export default function DeviceApiSection({ selectedCustomer }: DeviceApiSectionProps) {
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
