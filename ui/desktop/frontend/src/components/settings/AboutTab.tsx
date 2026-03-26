export function AboutTab() {
  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <img src="/goclaw-icon.svg" alt="GoClaw" className="h-12 w-12" />
        <div>
          <h3 className="text-base font-semibold text-text-primary">GoClaw Lite</h3>
          <p className="text-xs text-text-muted">Desktop Edition</p>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Version</span>
          <span className="text-text-primary font-mono">0.1.0-beta</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Edition</span>
          <span className="text-accent font-medium">Lite (SQLite)</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Runtime</span>
          <span className="text-text-primary font-mono">Wails v2</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">Edition Limits</h3>
        <div className="rounded-lg border border-border divide-y divide-border text-xs">
          {[
            { label: 'Agents', limit: '5 max' },
            { label: 'Teams', limit: '1 max' },
            { label: 'Team members', limit: '5 max' },
            { label: 'Database', limit: 'SQLite (local)' },
            { label: 'Users', limit: 'Single user' },
          ].map((item) => (
            <div key={item.label} className="flex justify-between px-3 py-2">
              <span className="text-text-muted">{item.label}</span>
              <span className="text-text-secondary">{item.limit}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-text-muted">
        <a
          href="https://github.com/nextlevelbuilder/goclaw"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          GitHub
        </a>
        <span className="mx-2">·</span>
        <span>Built with Go + React + Wails</span>
      </div>
    </div>
  )
}
