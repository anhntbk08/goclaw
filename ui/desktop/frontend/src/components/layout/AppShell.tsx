import { useUiStore } from '../../stores/ui-store'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)

  return (
    <div className="h-dvh flex bg-surface-primary overflow-hidden">
      {/* Wails drag region — transparent overlay at top */}
      <div className="wails-drag fixed top-0 left-0 right-0 h-8 z-50" />

      {/* Sidebar panel */}
      {sidebarOpen && (
        <div className="floating-panel m-3 mr-0 flex flex-col w-[260px] shrink-0">
          <Sidebar />
        </div>
      )}

      {/* Main chat panel */}
      <div className="floating-panel m-3 ml-2 flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  )
}
