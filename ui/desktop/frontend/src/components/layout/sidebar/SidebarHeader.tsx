import { useAgents } from '../../../hooks/use-agents'
import { AgentAvatar } from '../../agents/AgentAvatar'

export function SidebarHeader() {
  const { agents, selectedAgent, selectAgent } = useAgents()

  return (
    <div className="pt-8 px-3 pb-2 space-y-3">
      {/* Logo */}
      <div className="flex items-center gap-2 px-1">
        <img src="/goclaw-icon.svg" alt="GoClaw" className="h-5 w-5" />
        <span className="text-sm font-semibold text-text-primary">GoClaw</span>
        <span className="text-[10px] text-text-muted font-normal">Lite</span>
      </div>

      {/* Agent selector */}
      {agents.length > 0 && (
        <div className="space-y-1">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => selectAgent(agent.id)}
              className={[
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                selectedAgent?.id === agent.id
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
              ].join(' ')}
            >
              <AgentAvatar name={agent.name} status={agent.status} size="sm" />
              <span className="truncate flex-1 text-xs font-medium">{agent.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
