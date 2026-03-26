import { useState } from 'react'
import { useAgentCrud } from '../../../hooks/use-agent-crud'
import { useAgentStore } from '../../../stores/agent-store'
import { AgentCard } from './AgentCard'
import { AgentFormDialog } from './AgentFormDialog'
import { ConfirmDeleteDialog } from '../../common/ConfirmDeleteDialog'
import { SummoningModal } from '../../onboarding/SummoningModal'
import type { AgentData, AgentInput } from '../../../types/agent'

export function AgentList() {
  const { agents, loading, atLimit, createAgent, updateAgent, deleteAgent, resummonAgent, fetchAgents } = useAgentCrud()
  const refreshSidebar = useAgentStore((s) => s.setAgents)

  const [formOpen, setFormOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentData | null>(null)
  const [deletingAgent, setDeletingAgent] = useState<AgentData | null>(null)
  const [summoningAgent, setSummoningAgent] = useState<{ id: string; name: string } | null>(null)

  const handleCreate = () => {
    if (atLimit) return
    setEditingAgent(null)
    setFormOpen(true)
  }

  const handleEdit = (agent: AgentData) => {
    setEditingAgent(agent)
    setFormOpen(true)
  }

  const handleSubmit = async (input: AgentInput) => {
    if (editingAgent) {
      await updateAgent(editingAgent.id, input)
    } else {
      const created = await createAgent(input)
      // Show summoning modal if agent is summoning
      if (created.status === 'summoning') {
        setSummoningAgent({ id: created.id, name: created.display_name || created.agent_key })
      }
    }
    refreshSidebarAgents()
  }

  const handleDelete = async () => {
    if (!deletingAgent) return
    await deleteAgent(deletingAgent.id)
    setDeletingAgent(null)
    refreshSidebarAgents()
  }

  const handleResummon = async (agent: AgentData) => {
    await resummonAgent(agent.id)
    setSummoningAgent({ id: agent.id, name: agent.display_name || agent.agent_key })
  }

  const handleSummoningComplete = () => {
    setSummoningAgent(null)
    fetchAgents()
    refreshSidebarAgents()
  }

  // Refresh sidebar agent list by re-fetching via store
  const refreshSidebarAgents = () => {
    // Trigger sidebar hook refresh by updating store — use-agents.ts fetches on mount
    // Simple approach: directly update store with current CRUD agents mapped to sidebar format
    refreshSidebar(agents.map((a) => ({
      id: a.id,
      key: a.agent_key,
      name: a.display_name || a.agent_key,
      model: a.model ?? 'unknown',
      status: 'online' as const,
    })))
  }

  if (loading) {
    return <p className="text-xs text-text-muted py-4">Loading agents...</p>
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Agents</h3>
          <button
            onClick={handleCreate}
            disabled={atLimit}
            className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            + Add Agent
          </button>
        </div>

        {atLimit && (
          <p className="text-xs text-warning">Max 5 agents in Lite edition.</p>
        )}

        {agents.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">No agents configured.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {agents.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                onEdit={handleEdit}
                onDelete={setDeletingAgent}
                onResummon={handleResummon}
              />
            ))}
          </div>
        )}
      </div>

      <AgentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        agent={editingAgent}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={!!deletingAgent}
        onOpenChange={(open) => { if (!open) setDeletingAgent(null) }}
        title="Delete agent?"
        description="This will permanently delete this agent and all its data."
        confirmValue={deletingAgent?.display_name || deletingAgent?.agent_key || ''}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      {summoningAgent && (
        <SummoningModal
          agentId={summoningAgent.id}
          agentName={summoningAgent.name}
          onContinue={handleSummoningComplete}
        />
      )}
    </>
  )
}
