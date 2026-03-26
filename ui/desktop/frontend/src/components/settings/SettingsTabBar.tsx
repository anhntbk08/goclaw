import type { SettingsTab } from '../../stores/ui-store'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'appearance', label: 'Appearance' },
  { key: 'providers', label: 'Providers' },
  { key: 'agents', label: 'Agents' },
  { key: 'mcp', label: 'MCP' },
  { key: 'skills', label: 'Skills' },
  { key: 'tools', label: 'Tools' },
  { key: 'cron', label: 'Cron' },
  { key: 'traces', label: 'Traces' },
  { key: 'about', label: 'About' },
]

interface SettingsTabBarProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

export function SettingsTabBar({ activeTab, onTabChange }: SettingsTabBarProps) {
  return (
    <div className="flex gap-1 overflow-x-auto px-1 pb-1 border-b border-border">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={[
            'shrink-0 px-3 py-1.5 text-xs rounded-md transition-colors',
            activeTab === tab.key
              ? 'bg-accent/10 text-accent font-medium'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-tertiary',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
