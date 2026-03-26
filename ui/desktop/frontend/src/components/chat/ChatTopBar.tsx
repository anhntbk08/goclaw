import { useAgents } from '../../hooks/use-agents'
import { useUiStore } from '../../stores/ui-store'

export function ChatTopBar() {
  const { selectedAgent } = useAgents()
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)

  return (
    <div className="h-12 flex items-center px-4 shrink-0 pt-2">
      {/* Sidebar toggle */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="wails-no-drag w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors mr-2"
          title="Show sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Agent info */}
      {selectedAgent ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{selectedAgent.name}</span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-tertiary text-text-muted">
            {selectedAgent.model}
          </span>
        </div>
      ) : (
        <span className="text-sm text-text-muted">Select an agent to start chatting</span>
      )}
    </div>
  )
}
