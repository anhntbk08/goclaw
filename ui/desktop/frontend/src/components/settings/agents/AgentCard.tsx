import type { AgentData } from '../../../types/agent'

interface AgentCardProps {
  agent: AgentData
  onEdit: (agent: AgentData) => void
  onDelete: (agent: AgentData) => void
  onResummon: (agent: AgentData) => void
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success',
  running: 'bg-blue-500 animate-pulse',
  summoning: 'bg-warning animate-pulse',
  summon_failed: 'bg-error',
  idle: 'bg-success',
}

export function AgentCard({ agent, onEdit, onDelete, onResummon }: AgentCardProps) {
  const emoji = agent.other_config?.emoji
  const status = agent.status ?? 'active'
  const isSummoning = status === 'summoning'
  const isFailed = status === 'summon_failed'

  return (
    <div className="rounded-lg border border-border p-4 hover:bg-surface-tertiary/30 transition-colors space-y-2">
      {/* Header: emoji/icon + name + status */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-xl shrink-0">
          {emoji || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">
              {agent.display_name || agent.agent_key}
            </span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[status] ?? 'bg-idle'}`} />
          </div>
          {agent.display_name && (
            <p className="text-[11px] text-text-muted font-mono truncate">{agent.agent_key}</p>
          )}
        </div>
      </div>

      {/* Meta: provider + model */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-tertiary text-text-muted">
          {agent.provider}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-tertiary text-text-muted font-mono">
          {agent.model}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-tertiary text-text-muted">
          {agent.agent_type}
        </span>
        {agent.is_default && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
            default
          </span>
        )}
      </div>

      {/* Frontmatter / description */}
      {(agent.frontmatter || agent.other_config?.description) && (
        <p className="text-xs text-text-muted line-clamp-2">
          {agent.frontmatter || (agent.other_config?.description as string)}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {!isSummoning && (
          <button onClick={() => onEdit(agent)} className="text-[11px] text-accent hover:underline">
            Edit
          </button>
        )}
        {isFailed && (
          <button onClick={() => onResummon(agent)} className="text-[11px] text-warning hover:underline">
            Resummon
          </button>
        )}
        <button onClick={() => onDelete(agent)} className="text-[11px] text-error hover:underline ml-auto">
          Delete
        </button>
      </div>
    </div>
  )
}
