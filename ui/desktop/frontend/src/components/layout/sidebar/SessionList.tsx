import { useMemo } from 'react'
import { useSessions } from '../../../hooks/use-sessions'

function groupByDate(sessions: Array<{ key: string; title: string; lastMessageAt: number }>) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000

  const groups: { label: string; items: typeof sessions }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Older', items: [] },
  ]

  for (const s of sessions) {
    if (s.lastMessageAt >= today) groups[0].items.push(s)
    else if (s.lastMessageAt >= yesterday) groups[1].items.push(s)
    else groups[2].items.push(s)
  }

  return groups.filter((g) => g.items.length > 0)
}

export function SessionList() {
  const { sessions, activeSessionKey, setActiveSession } = useSessions()

  const groups = useMemo(() => groupByDate(sessions), [sessions])

  if (sessions.length === 0) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-xs text-text-muted">No conversations yet</p>
      </div>
    )
  }

  return (
    <div className="px-2 space-y-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted px-1 mb-1">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((session) => (
              <button
                key={session.key}
                onClick={() => setActiveSession(session.key)}
                className={[
                  'w-full text-left px-2 py-1.5 rounded-lg text-xs truncate transition-colors',
                  activeSessionKey === session.key
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
                ].join(' ')}
              >
                {session.title}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
