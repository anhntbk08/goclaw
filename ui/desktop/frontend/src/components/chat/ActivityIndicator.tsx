interface ActivityIndicatorProps {
  phase: string
  tool?: string
  iteration?: number
}

const PHASE_LABELS: Record<string, string> = {
  thinking: 'Thinking',
  tool_exec: 'Executing tool',
  compacting: 'Compacting context',
  streaming: 'Streaming',
  retrying: 'Retrying',
  leader_processing: 'Processing',
}

export function ActivityIndicator({ phase, tool, iteration }: ActivityIndicatorProps) {
  let label = PHASE_LABELS[phase] ?? phase
  if (phase === 'tool_exec' && tool) label = `Running ${tool}`
  if (phase === 'retrying' && iteration) label = `Retrying (attempt ${iteration})`

  return (
    <div className="flex items-center gap-2 py-2 text-xs text-text-muted">
      <span className="flex gap-0.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-1 h-1 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span>{label}</span>
      {phase !== 'retrying' && iteration && iteration > 1 && (
        <span className="text-text-muted">· step {iteration}</span>
      )}
    </div>
  )
}
