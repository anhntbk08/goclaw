import { Switch } from '../../common/Switch'

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
        <Switch checked={selfEvolve} onCheckedChange={onSelfEvolveChange} />
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
