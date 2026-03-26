import { useUiStore } from '../../stores/ui-store'

export function AppearanceTab() {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Theme</h3>
        <div className="flex gap-3">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { if (theme !== t) toggleTheme() }}
              className={[
                'flex-1 rounded-lg border p-3 text-center text-xs font-medium transition-colors',
                theme === t
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-secondary hover:bg-surface-tertiary',
              ].join(' ')}
            >
              {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">Language</h3>
        <p className="text-xs text-text-muted mb-2">Language selection will be available after i18n setup.</p>
        <div className="px-3 py-2 rounded-lg border border-border bg-surface-tertiary/50 text-xs text-text-muted">
          English (default)
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">Timezone</h3>
        <p className="text-xs text-text-muted mb-2">Timezone selection coming soon.</p>
        <div className="px-3 py-2 rounded-lg border border-border bg-surface-tertiary/50 text-xs text-text-muted">
          {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </div>
      </div>
    </div>
  )
}
