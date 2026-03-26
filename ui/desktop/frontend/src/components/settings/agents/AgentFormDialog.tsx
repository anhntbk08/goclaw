import { useState, useEffect, useMemo, useCallback } from 'react'
import { Combobox } from '../../common/Combobox'
import { useProviders } from '../../../hooks/use-providers'
import { getApiClient } from '../../../lib/api'
import { slugify } from '../../../constants/providers'
import type { AgentData, AgentInput } from '../../../types/agent'

interface AgentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent?: AgentData | null
  onSubmit: (input: AgentInput) => Promise<AgentData | void>
}

export function AgentFormDialog({ open, onOpenChange, agent, onSubmit }: AgentFormDialogProps) {
  const isEditing = !!agent
  const { providers } = useProviders()

  const [displayName, setDisplayName] = useState('')
  const [providerName, setProviderName] = useState('')
  const [model, setModel] = useState('')
  const [agentType, setAgentType] = useState<'predefined' | 'open'>('predefined')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🦊')
  const [isDefault, setIsDefault] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; error?: string } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return
    setDisplayName(agent?.display_name ?? '')
    setProviderName(agent?.provider ?? '')
    setModel(agent?.model ?? '')
    setAgentType((agent?.agent_type as 'predefined' | 'open') ?? 'predefined')
    setDescription((agent?.other_config?.description as string) ?? '')
    setEmoji((agent?.other_config?.emoji as string) ?? '🦊')
    setIsDefault(agent?.is_default ?? false)
    setError('')
    setVerifyResult(isEditing ? { valid: true } : null) // editing = already verified
    setModels([])
  }, [open, agent, isEditing])

  // Selected provider object
  const selectedProvider = useMemo(
    () => providers.find((p) => p.name === providerName),
    [providers, providerName],
  )

  // Load models when provider changes
  const loadModels = useCallback(async (providerId: string) => {
    setModelsLoading(true)
    try {
      const res = await getApiClient().get<{ models: Array<{ id: string }> }>(
        `/v1/providers/${providerId}/models`,
      )
      setModels((res.models ?? []).map((m) => m.id))
    } catch {
      setModels([])
    } finally {
      setModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedProvider?.id) loadModels(selectedProvider.id)
  }, [selectedProvider?.id, loadModels])

  // Reset verify when provider or model changes
  useEffect(() => {
    if (!isEditing) setVerifyResult(null)
  }, [providerName, model, isEditing])

  const agentKey = useMemo(() => {
    if (isEditing) return agent!.agent_key
    return slugify(displayName) || 'agent'
  }, [isEditing, agent, displayName])

  const providerOptions = useMemo(
    () => providers.filter((p) => p.enabled).map((p) => ({
      value: p.name,
      label: p.display_name || p.name,
    })),
    [providers],
  )

  const modelOptions = useMemo(
    () => models.map((m) => ({ value: m, label: m })),
    [models],
  )

  // Verify model + create in one click (matching web UI "Check & Create")
  const handleVerifyAndCreate = async () => {
    if (!selectedProvider?.id || !model.trim()) return
    setVerifying(true)
    try {
      const res = await getApiClient().post<{ success: boolean; error?: string }>(
        `/v1/providers/${selectedProvider.id}/verify`,
        { model: model.trim() },
      )
      setVerifyResult({ valid: res.success, error: res.error })
      if (res.success) await handleCreate()
    } catch (err) {
      setVerifyResult({ valid: false, error: err instanceof Error ? err.message : 'Verification failed' })
    } finally {
      setVerifying(false)
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      const otherConfig: Record<string, unknown> = {}
      if (description.trim()) otherConfig.description = description.trim()
      if (emoji.trim()) otherConfig.emoji = emoji.trim()
      await onSubmit({
        agent_key: agentKey,
        display_name: displayName.trim() || undefined,
        provider: providerName,
        model: model.trim(),
        agent_type: isEditing ? agent!.agent_type : agentType,
        is_default: isDefault || undefined,
        other_config: Object.keys(otherConfig).length > 0 ? otherConfig : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const needsVerify = !isEditing && !verifyResult?.valid && selectedProvider?.id && model.trim()
  const canCreate = isEditing
    ? !!providerName && !!model.trim()
    : !!displayName.trim() && !!providerName && !!model.trim() && verifyResult?.valid && (agentType !== 'predefined' || !!description.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-secondary border border-border rounded-xl shadow-xl max-w-md w-full mx-4 p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-text-primary">
          {isEditing ? 'Edit Agent' : 'Create Agent'}
        </h3>

        {/* Display name + emoji */}
        <div className="flex gap-2">
          <div className="space-y-1 flex-1">
            <label className="text-xs font-medium text-text-secondary">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Fox Spirit"
              className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2 text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="space-y-1 w-16">
            <label className="text-xs font-medium text-text-secondary">Emoji</label>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
              maxLength={2}
              className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2 text-base md:text-sm text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Agent key */}
        {!isEditing && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Agent Key</label>
            <div className="px-3 py-2 rounded-lg border border-border bg-surface-tertiary/50 text-xs text-text-muted font-mono">
              {agentKey}
            </div>
          </div>
        )}

        {/* Provider */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Provider</label>
          <Combobox value={providerName} onChange={setProviderName} options={providerOptions} placeholder="Select provider..." />
        </div>

        {/* Model */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Model</label>
          <Combobox
            value={model}
            onChange={setModel}
            options={modelOptions}
            placeholder={modelsLoading ? 'Loading models...' : 'Select model...'}
            allowCustom
          />
          {verifyResult && !verifyResult.valid && (
            <p className="text-xs text-error">{verifyResult.error || 'Model verification failed'}</p>
          )}
          {verifyResult?.valid && !isEditing && (
            <p className="text-xs text-success">Model verified</p>
          )}
        </div>

        {/* Agent type — create only */}
        {!isEditing && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Type</label>
            <div className="flex gap-2">
              {(['predefined', 'open'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAgentType(t)}
                  className={[
                    'flex-1 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                    agentType === t
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-border text-text-secondary hover:bg-surface-tertiary',
                  ].join(' ')}
                >
                  {t === 'predefined' ? 'Predefined' : 'Open'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description — predefined only */}
        {(isEditing ? agent?.agent_type === 'predefined' : agentType === 'predefined') && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Personality</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your agent's personality..."
              rows={3}
              className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2 text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
        )}

        {/* Default toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded border-border accent-accent" />
          <span className="text-xs text-text-secondary">Default agent</span>
        </label>

        {error && <p className="text-xs text-error">{error}</p>}

        {/* Footer: Cancel + Create/Check&Create/Save */}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-xs border border-border rounded-lg text-text-secondary hover:bg-surface-tertiary transition-colors">
            Cancel
          </button>
          {loading ? (
            <button disabled className="px-4 py-1.5 text-xs bg-accent text-white rounded-lg opacity-50">...</button>
          ) : needsVerify ? (
            <button
              onClick={handleVerifyAndCreate}
              disabled={verifying || !displayName.trim() || (agentType === 'predefined' && !description.trim())}
              className="px-4 py-1.5 text-xs bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {verifying ? 'Checking...' : 'Check & Create'}
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="px-4 py-1.5 text-xs bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isEditing ? 'Save' : 'Create'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
