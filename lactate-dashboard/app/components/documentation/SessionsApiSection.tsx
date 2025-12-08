import React from 'react'

interface SessionsApiSectionProps {
  selectedCustomer: { customer_id: string; name: string } | null
}

export default function SessionsApiSection({ selectedCustomer }: SessionsApiSectionProps) {
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
