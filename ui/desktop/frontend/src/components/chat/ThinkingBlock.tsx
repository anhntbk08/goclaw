import { useState } from 'react'

interface ThinkingBlockProps {
  text: string
  isStreaming?: boolean
}

export function ThinkingBlock({ text, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false)

  if (!text) return null

  return (
    <div className="mb-3 rounded-lg border border-border bg-surface-tertiary/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>{isStreaming ? 'Thinking...' : 'Thinking'}</span>
        {isStreaming && (
          <span className="inline-block w-1.5 h-3 bg-text-muted/50 animate-pulse rounded-sm" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <pre className="text-xs text-text-muted whitespace-pre-wrap leading-relaxed font-mono max-h-80 overflow-y-auto break-words">
            {text}
          </pre>
        </div>
      )}
    </div>
  )
}
