import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { toast } from '../../../stores/toast-store'
import { fetchTraceDetail } from '../../../hooks/use-traces'
import type { TraceData, SpanData } from '../../../types/trace'

interface Props {
  traceId: string
  onClose: () => void
}

// Detect if content is JSON and return { language, formatted }
function detectContent(text?: string): { lang: string; code: string } {
  if (!text) return { lang: 'text', code: '' }
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      return { lang: 'json', code: JSON.stringify(parsed, null, 2) }
    } catch { /* not valid JSON */ }
  }
  return { lang: 'text', code: text }
}

// Syntax-highlighted code block for trace previews
function CodePreview({ text }: { text?: string }) {
  const { lang, code } = detectContent(text)
  if (!code) return null
  return (
    <SyntaxHighlighter
      language={lang}
      style={oneDark}
      customStyle={{
        margin: 0,
        borderRadius: '0.5rem',
        fontSize: '0.7rem',
        maxHeight: '12rem',
        overflow: 'auto',
      }}
      wrapLongLines
    >
      {code}
    </SyntaxHighlighter>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '< 1s'
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const min = Math.floor(ms / 60000)
  const sec = Math.round((ms % 60000) / 1000)
  return `${min}m ${sec}s`
}

function statusClass(status: string): string {
  const s = status.toLowerCase()
  if (s === 'completed' || s === 'ok' || s === 'success') {
    return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20'
  }
  if (s === 'error' || s === 'failed') {
    return 'bg-red-500/15 text-red-700 border-red-500/25 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20'
  }
  return 'bg-blue-500/15 text-blue-700 border-blue-500/25 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20'
}

function spanTypeIcon(spanType: string): string {
  switch (spanType) {
    case 'llm_call': return '🤖'
    case 'tool_call': return '🔧'
    case 'agent': return '👤'
    case 'embedding': return '📊'
    default: return '📌'
  }
}

function CollapsibleSection({ title, content }: { title: string; content?: string }) {
  const [open, setOpen] = useState(false)
  if (!content) return null
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        {title}
      </button>
      {open && (
        <div className="mt-1.5">
          <CodePreview text={content} />
        </div>
      )}
    </div>
  )
}

function SpanRow({ span }: { span: SpanData }) {
  const { t } = useTranslation('traces')
  const hasTokens = (span.input_tokens ?? 0) > 0 || (span.output_tokens ?? 0) > 0
  const subtitle = span.span_type === 'llm_call'
    ? [span.model, span.provider].filter(Boolean).join(' / ')
    : span.span_type === 'tool_call' ? span.tool_name
    : undefined

  return (
    <div className="border-b border-border px-4 py-2 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0">{spanTypeIcon(span.span_type)}</span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">{span.name}</div>
            {subtitle && (
              <div className="text-[11px] text-text-muted truncate">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[11px] text-text-muted">
          {hasTokens && (
            <span className="font-mono">{span.input_tokens ?? 0}/{span.output_tokens ?? 0}</span>
          )}
          <span>{formatDuration(span.duration_ms)}</span>
          <span className={`rounded-full px-1.5 py-0.5 border text-[10px] font-medium ${statusClass(span.status)}`}>
            {span.status}
          </span>
        </div>
      </div>
      {span.error && (
        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 truncate">{span.error}</p>
      )}
      {span.span_type === 'llm_call' && (
        <div className="mt-1 flex gap-3">
          <CollapsibleSection title={t('detail.input')} content={span.input_preview} />
          <CollapsibleSection title={t('detail.output')} content={span.output_preview} />
        </div>
      )}
    </div>
  )
}

export function TraceDetailDialog({ traceId, onClose }: Props) {
  const { t } = useTranslation('traces')
  const [trace, setTrace] = useState<TraceData | null>(null)
  const [spans, setSpans] = useState<SpanData[]>([])
  const [loading, setLoading] = useState(true)
  const [inputOpen, setInputOpen] = useState(false)
  const [outputOpen, setOutputOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchTraceDetail(traceId)
      .then(({ trace: t2, spans: s }) => { setTrace(t2); setSpans(s) })
      .catch((err) => {
        console.error('Failed to load trace detail:', err)
        toast.error('Failed to load trace', (err as Error).message)
      })
      .finally(() => setLoading(false))
  }, [traceId])

  const cacheRead = trace?.metadata?.total_cache_read_tokens as number | undefined

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface-secondary rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-text-primary truncate">
              {trace?.name || t('unnamed')}
            </span>
            {trace && (
              <span className={`rounded-full px-2 py-0.5 border text-[10px] font-medium shrink-0 ${statusClass(trace.status)}`}>
                {trace.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {trace && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(trace.id)
                  toast.success(t('detail.copyTraceId'))
                }}
                className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                title={t('detail.copyTraceId')}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            )}
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-5 w-5 animate-spin text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : !trace ? (
            <p className="text-sm text-text-muted text-center py-8">{t('detail.notFound')}</p>
          ) : (
            <div className="p-5 space-y-4">
              {/* Metadata row */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-muted">
                <span><span className="text-text-secondary">{t('detail.duration')}</span> {formatDuration(trace.duration_ms)}</span>
                {trace.channel && (
                  <span className="rounded-full px-2 py-0.5 bg-surface-tertiary text-text-secondary border border-border">{trace.channel}</span>
                )}
                <span>
                  <span className="text-text-secondary">{t('detail.tokens')}</span>{' '}
                  {trace.total_input_tokens} in / {trace.total_output_tokens} out
                  {(cacheRead ?? 0) > 0 && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400">+{cacheRead} {t('cached')}</span>
                  )}
                </span>
                <span><span className="text-text-secondary">{t('detail.spans')}</span> {trace.span_count}</span>
                <span>
                  <span className="text-text-secondary">{t('detail.started')}</span>{' '}
                  {new Date(trace.start_time).toLocaleString()}
                </span>
                {trace.parent_trace_id && (
                  <span>
                    <span className="text-text-secondary">{t('detail.delegatedFrom')}</span>{' '}
                    <span className="font-mono text-accent">{trace.parent_trace_id.slice(0, 8)}…</span>
                  </span>
                )}
              </div>

              {/* Input / Output */}
              {(trace.input_preview || trace.output_preview) && (
                <div className="space-y-2 border-t border-border pt-3">
                  {trace.input_preview && (
                    <div>
                      <button
                        onClick={() => setInputOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <svg className={`h-3.5 w-3.5 transition-transform ${inputOpen ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                        {t('detail.input')}
                      </button>
                      {inputOpen && (
                        <div className="mt-1.5"><CodePreview text={trace.input_preview} /></div>
                      )}
                    </div>
                  )}
                  {trace.output_preview && (
                    <div>
                      <button
                        onClick={() => setOutputOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <svg className={`h-3.5 w-3.5 transition-transform ${outputOpen ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                        {t('detail.output')}
                      </button>
                      {outputOpen && (
                        <div className="mt-1.5"><CodePreview text={trace.output_preview} /></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Spans */}
              {spans.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-medium text-text-secondary mb-2 px-0">
                    {t('detail.spansCount', { count: spans.length })}
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    {spans.map((span) => (
                      <SpanRow key={span.id} span={span} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
