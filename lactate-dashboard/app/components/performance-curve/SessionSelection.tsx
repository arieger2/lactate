'use client'

interface Session {
  id: string
  point_count: number
  test_date: string
}

interface SessionSelectionProps {
  availableSessions: Session[]
  selectedSessionId: string | null
  onSessionChange: (sessionId: string) => void
}

export default function SessionSelection({
  availableSessions,
  selectedSessionId,
  onSessionChange
}: SessionSelectionProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">Session</label>
      <select
        value={selectedSessionId || ''}
        onChange={(e) => onSessionChange(e.target.value)}
        className="w-full p-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        aria-label="Session auswählen"
      >
        <option value="">Session auswählen...</option>
        {availableSessions.map(session => (
          <option key={session.id} value={session.id}>
            {session.id} | {session.point_count} Punkte | {new Date(session.test_date).toLocaleString()}
          </option>
        ))}
      </select>
    </div>
  )
}
