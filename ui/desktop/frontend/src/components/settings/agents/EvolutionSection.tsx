interface EvolutionSectionProps {
  selfEvolve: boolean
  onSelfEvolveChange: (v: boolean) => void
}

export function EvolutionSection({ selfEvolve, onSelfEvolveChange }: EvolutionSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Evolution</h3>

      {/* Self-evolve toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm">✨</span>
            <span className="text-xs font-medium text-text-primary">Self-Evolution</span>
          </div>
          <p className="text-[11px] text-text-muted">
            Agent updates its own IDENTITY.md based on interactions
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={selfEvolve}
            onChange={(e) => onSelfEvolveChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-surface-tertiary peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent" />
        </label>
      </div>

      {selfEvolve && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30">
          <p className="text-[11px] text-orange-700 dark:text-orange-300">
            When enabled, the agent will periodically update its IDENTITY.md to reflect learned preferences, communication style, and domain expertise from conversations.
          </p>
        </div>
      )}
    </div>
  )
}
