import { useState, useEffect, useCallback } from 'react'
import { getApiClient } from '../lib/api'
import type { AgentData, AgentInput } from '../types/agent'

const MAX_AGENTS_LITE = 5

export function useAgentCrud() {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = useCallback(async () => {
    try {
      const res = await getApiClient().get<{ agents: AgentData[] | null }>('/v1/agents')
      setAgents(res.agents ?? [])
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  const createAgent = useCallback(async (input: AgentInput) => {
    const res = await getApiClient().post<AgentData>('/v1/agents', input)
    setAgents((prev) => [...prev, res])
    return res
  }, [])

  const updateAgent = useCallback(async (id: string, input: Partial<AgentInput>) => {
    const res = await getApiClient().put<AgentData>(`/v1/agents/${id}`, input)
    setAgents((prev) => prev.map((a) => a.id === id ? res : a))
    return res
  }, [])

  const deleteAgent = useCallback(async (id: string) => {
    await getApiClient().delete(`/v1/agents/${id}`)
    setAgents((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const resummonAgent = useCallback(async (id: string) => {
    await getApiClient().post(`/v1/agents/${id}/resummon`, {})
    // Update status to summoning
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, status: 'summoning' } : a))
  }, [])

  const atLimit = agents.length >= MAX_AGENTS_LITE

  return { agents, loading, atLimit, fetchAgents, createAgent, updateAgent, deleteAgent, resummonAgent }
}
