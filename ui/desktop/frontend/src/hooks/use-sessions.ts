import { useEffect, useCallback } from 'react'
import { getWsClient } from '../lib/ws'
import { useSessionStore } from '../stores/session-store'
import { useAgentStore } from '../stores/agent-store'
import { useChatStore } from '../stores/chat-store'

// Backend SessionInfo: { key, messageCount, created, updated, label, channel, userID }
interface SessionInfoResponse {
  key: string
  messageCount: number
  created: string  // ISO timestamp
  updated: string  // ISO timestamp
  label?: string
  channel?: string
}

export function useSessions() {
  const ws = getWsClient()
  const { sessions, activeSessionKey, setActiveSession, setSessions, addSession } = useSessionStore()
  const selectedAgentId = useAgentStore((s) => s.selectedAgentId)

  useEffect(() => {
    if (!ws || !selectedAgentId) return
    let cancelled = false
    ws.call('sessions.list', { agentId: selectedAgentId, limit: 30 })
      .then((result: unknown) => {
        if (cancelled) return
        const r = result as { sessions?: SessionInfoResponse[] }
        const list = (r?.sessions || []).map((s) => ({
          key: s.key,
          agentId: selectedAgentId,
          title: s.label || 'Untitled',
          lastMessageAt: new Date(s.updated || s.created).getTime(),
          messageCount: s.messageCount || 0,
        }))
        setSessions(list)
      })
      .catch(console.error)
    return () => { cancelled = true }
  }, [ws, selectedAgentId, setSessions])

  const createSession = useCallback(() => {
    if (!selectedAgentId) return
    const key = `agent:${selectedAgentId}:ws:direct:system:${crypto.randomUUID().slice(0, 8)}`
    const session = {
      key,
      agentId: selectedAgentId,
      title: 'New Chat',
      lastMessageAt: Date.now(),
      messageCount: 0,
    }
    addSession(session)
    setActiveSession(key)
    useChatStore.getState().clear()
  }, [selectedAgentId, addSession, setActiveSession])

  return { sessions, activeSessionKey, setActiveSession, createSession }
}
