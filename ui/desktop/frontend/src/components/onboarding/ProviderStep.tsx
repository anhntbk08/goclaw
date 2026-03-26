import { useState } from 'react'
import { getApiClient } from '../../lib/api'
import type { StepProps } from './WelcomeStep'

interface ProviderDef {
  type: string
  label: string
  apiBase: string
  needsKey: boolean
  defaultModel: string
  group: 'popular' | 'cloud' | 'local' | 'regional'
}

const PROVIDERS: ProviderDef[] = [
  // Popular
  { type: 'anthropic_native', label: 'Anthropic (Claude)', apiBase: 'https://api.anthropic.com', needsKey: true, defaultModel: 'claude-sonnet-4-5-20250929', group: 'popular' },
  { type: 'openai_compat', label: 'OpenAI', apiBase: 'https://api.openai.com/v1', needsKey: true, defaultModel: 'gpt-4o', group: 'popular' },
  { type: 'gemini_native', label: 'Google Gemini', apiBase: 'https://generativelanguage.googleapis.com/v1beta/openai', needsKey: true, defaultModel: 'gemini-2.5-flash', group: 'popular' },
  { type: 'openrouter', label: 'OpenRouter', apiBase: 'https://openrouter.ai/api/v1', needsKey: true, defaultModel: 'anthropic/claude-sonnet-4', group: 'popular' },
  // Cloud
  { type: 'groq', label: 'Groq', apiBase: 'https://api.groq.com/openai/v1', needsKey: true, defaultModel: 'llama-3.3-70b-versatile', group: 'cloud' },
  { type: 'deepseek', label: 'DeepSeek', apiBase: 'https://api.deepseek.com/v1', needsKey: true, defaultModel: 'deepseek-chat', group: 'cloud' },
  { type: 'mistral', label: 'Mistral AI', apiBase: 'https://api.mistral.ai/v1', needsKey: true, defaultModel: 'mistral-large-latest', group: 'cloud' },
  { type: 'xai', label: 'xAI (Grok)', apiBase: 'https://api.x.ai/v1', needsKey: true, defaultModel: 'grok-3', group: 'cloud' },
  { type: 'cohere', label: 'Cohere', apiBase: 'https://api.cohere.ai/compatibility/v1', needsKey: true, defaultModel: 'command-a-03-2025', group: 'cloud' },
  { type: 'perplexity', label: 'Perplexity', apiBase: 'https://api.perplexity.ai', needsKey: true, defaultModel: 'sonar', group: 'cloud' },
  { type: 'minimax_native', label: 'MiniMax', apiBase: 'https://api.minimax.io/v1', needsKey: true, defaultModel: 'MiniMax-M1', group: 'cloud' },
  // Local
  { type: 'ollama', label: 'Ollama (Local)', apiBase: 'http://localhost:11434/v1', needsKey: false, defaultModel: 'llama3.2', group: 'local' },
  { type: 'ollama_cloud', label: 'Ollama Cloud', apiBase: 'https://ollama.com/v1', needsKey: true, defaultModel: 'llama3.2', group: 'local' },
  { type: 'claude_cli', label: 'Claude CLI', apiBase: '', needsKey: false, defaultModel: 'sonnet', group: 'local' },
  // Regional
  { type: 'dashscope', label: 'DashScope (Qwen)', apiBase: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', needsKey: true, defaultModel: 'qwen3-max', group: 'regional' },
  { type: 'bailian', label: 'Bailian Coding', apiBase: 'https://coding-intl.dashscope.aliyuncs.com/v1', needsKey: true, defaultModel: 'qwen3.5-plus', group: 'regional' },
  { type: 'yescale', label: 'YesScale', apiBase: 'https://api.yescale.one/v1', needsKey: true, defaultModel: 'claude-sonnet-4-5-20250929', group: 'regional' },
  { type: 'zai', label: 'Z.ai API', apiBase: 'https://api.z.ai/api/paas/v4', needsKey: true, defaultModel: 'claude-sonnet-4-5-20250929', group: 'regional' },
  { type: 'zai_coding', label: 'Z.ai Coding Plan', apiBase: 'https://api.z.ai/api/coding/paas/v4', needsKey: true, defaultModel: 'claude-sonnet-4-5-20250929', group: 'regional' },
]

const GROUP_LABELS: Record<string, string> = {
  popular: 'Popular',
  cloud: 'Cloud APIs',
  local: 'Local / CLI',
  regional: 'Regional',
}

interface ProviderStepProps extends StepProps {
  onProviderSaved: (providerId: string) => void
}

export function ProviderStep({ onNext, onBack, onProviderSaved }: ProviderStepProps) {
  const [selected, setSelected] = useState('anthropic_native')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')

  const provider = PROVIDERS.find((p) => p.type === selected)!
  const canTest = !provider.needsKey || apiKey.trim().length > 0

  const handleSelect = (type: string) => {
    setSelected(type)
    setStatus('idle')
    setStatusMsg('')
  }

  const handleTest = async () => {
    setStatus('testing')
    setStatusMsg('')
    const start = Date.now()
    try {
      const api = getApiClient()
      const slug = `onboarding-${provider.type}`
      const payload: Record<string, unknown> = {
        name: slug,
        provider_type: provider.type,
        api_base: provider.apiBase || undefined,
        enabled: true,
      }
      if (provider.needsKey) payload.api_key = apiKey.trim()

      // Create or update provider
      let providerId: string

      // First try to find existing provider with same slug
      const list = await api.get<{ providers?: { id: string; name: string }[] | null }>('/v1/providers')
      const existing = (list.providers ?? []).find((p) => p.name === slug)

      if (existing) {
        // Update existing
        await api.put(`/v1/providers/${existing.id}`, payload)
        providerId = existing.id
        console.info('[onboarding] updated existing provider:', providerId)
      } else {
        // Create new
        const created = await api.post<{ id: string }>('/v1/providers', payload)
        providerId = created.id
        console.info('[onboarding] created provider:', providerId)
      }

      // Verify connection
      console.info('[onboarding] verifying:', `/v1/providers/${providerId}/verify`, { model: provider.defaultModel })
      const result = await api.post<{ valid: boolean; error?: string }>(
        `/v1/providers/${providerId}/verify`,
        { model: provider.defaultModel }
      )
      const elapsed = Date.now() - start
      if (result.valid) {
        setStatus('ok')
        setStatusMsg(`Connected in ${elapsed}ms`)
        onProviderSaved(providerId)
      } else {
        setStatus('error')
        setStatusMsg(result.error ?? 'Connection failed')
        // Clean up failed provider
        api.delete(`/v1/providers/${providerId}`).catch(() => {})
      }
    } catch (err) {
      setStatus('error')
      const msg = err instanceof Error ? err.message : 'Connection failed'
      console.error('[onboarding] provider test failed:', err, 'api base:', getApiClient()?.['baseUrl'])
      if (msg === 'Load failed' || msg === 'Failed to fetch') {
        setStatusMsg('Cannot reach gateway — is it running? (check console for details)')
      } else {
        setStatusMsg(msg)
      }
    }
  }

  const groups = ['popular', 'cloud', 'local', 'regional'] as const

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Choose a Provider</h2>
      <p className="text-text-secondary mb-5">Select an AI provider to power your agents.</p>

      {/* Provider grid grouped */}
      <div className="max-h-[280px] overflow-y-auto space-y-4 mb-5 pr-1">
        {groups.map((g) => {
          const items = PROVIDERS.filter((p) => p.group === g)
          if (!items.length) return null
          return (
            <div key={g}>
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">{GROUP_LABELS[g]}</p>
              <div className="grid grid-cols-2 gap-2">
                {items.map((p) => (
                  <button
                    key={p.type}
                    onClick={() => handleSelect(p.type)}
                    className={[
                      'px-3 py-2 rounded-lg border text-left transition-all text-sm',
                      selected === p.type
                        ? 'border-accent bg-accent/10 text-text-primary'
                        : 'border-border hover:border-accent/50 text-text-secondary',
                    ].join(' ')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* API key input */}
      {provider.needsKey && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-secondary mb-1.5">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setStatus('idle'); setStatusMsg('') }}
              placeholder={`Paste your ${provider.label} API key`}
              className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2.5 pr-10 text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" stroke="currentColor" strokeWidth="1.5" />
                {showKey && <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
              </svg>
            </button>
          </div>
        </div>
      )}

      {!provider.needsKey && (
        <p className="mb-5 text-sm text-text-muted">No API key required for {provider.label}.</p>
      )}

      {/* Status */}
      {statusMsg && (
        <div className={['mb-4 text-sm px-3 py-2 rounded-lg', status === 'ok' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'].join(' ')}>
          {status === 'ok' ? '✓ ' : '✕ '}{statusMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={!canTest || status === 'testing'}
            className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:border-accent hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {status === 'testing' && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            Test Connection
          </button>
          <button
            onClick={onNext}
            disabled={status !== 'ok'}
            className="px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export type { ProviderStepProps }
