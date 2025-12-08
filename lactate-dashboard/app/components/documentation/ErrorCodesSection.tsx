import React from 'react'

export default function ErrorCodesSection() {
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
