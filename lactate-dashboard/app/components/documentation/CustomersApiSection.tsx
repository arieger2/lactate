import React from 'react'

export default function CustomersApiSection() {
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
