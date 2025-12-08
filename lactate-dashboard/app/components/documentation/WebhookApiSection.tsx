import React from 'react'

interface WebhookApiSectionProps {
  selectedCustomer: { customer_id: string; name: string } | null
}

export default function WebhookApiSection({ selectedCustomer }: WebhookApiSectionProps) {
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
