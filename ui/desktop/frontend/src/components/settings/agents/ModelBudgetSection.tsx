import { useState, useEffect, useMemo, useCallback } from 'react'
import { Combobox } from '../../common/Combobox'
import { useProviders } from '../../../hooks/use-providers'
import { getApiClient } from '../../../lib/api'

interface ModelBudgetSectionProps {
  provider: string
  model: string
  contextWindow: number
  maxToolIterations: number
  savedProvider: string
  savedModel: string
  onProviderChange: (v: string) => void
  onModelChange: (v: string) => void
  onContextWindowChange: (v: number) => void
  onMaxToolIterationsChange: (v: number) => void
  onSaveBlockedChange: (blocked: boolean) => void
}

export function ModelBudgetSection({
  provider, model, contextWindow, maxToolIterations,
  savedProvider, savedModel,
  onProviderChange, onModelChange, onContextWindowChange, onMaxToolIterationsChange,
  onSaveBlockedChange,
}: ModelBudgetSectionProps) {
  const { providers } = useProviders()
  const [models, setModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; error?: string } | null>(null)
  const [verifying, setVerifying] = useState(false)

  const selectedProvider = useMemo(
    () => providers.find((p) => p.name === provider),
    [providers, provider],
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

  // Show verify button when provider/model changed from saved
  const needsVerify = (provider !== savedProvider || model !== savedModel) && provider && model
  useEffect(() => {
    if (needsVerify) {
      setVerifyResult(null)
      onSaveBlockedChange(true)
    } else {
      onSaveBlockedChange(false)
    }
  }, [needsVerify, onSaveBlockedChange])

  const handleVerify = async () => {
    if (!selectedProvider?.id || !model.trim()) return
    setVerifying(true)
    try {
      const res = await getApiClient().post<{ success: boolean; error?: string }>(
        `/v1/providers/${selectedProvider.id}/verify`,
        { model: model.trim() },
      )
      setVerifyResult({ valid: res.success, error: res.error })
      onSaveBlockedChange(!res.success)
    } catch (err) {
      setVerifyResult({ valid: false, error: err instanceof Error ? err.message : 'Verification failed' })
    } finally {
      setVerifying(false)
    }
  }

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

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Model & Configuration</h3>

      {/* Provider + Model */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Provider</label>
          <Combobox value={provider} onChange={onProviderChange} options={providerOptions} placeholder="Select provider..." />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Model</label>
          <Combobox
            value={model}
            onChange={onModelChange}
            options={modelOptions}
            placeholder={modelsLoading ? 'Loading...' : 'Select model...'}
            allowCustom
          />
        </div>
      </div>

      {/* Verify button + result */}
      {needsVerify && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="text-xs px-3 py-1.5 border border-accent text-accent rounded-lg hover:bg-accent/10 transition-colors disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify Model'}
          </button>
          {verifyResult && (
            <span className={`text-xs ${verifyResult.valid ? 'text-success' : 'text-error'}`}>
              {verifyResult.valid ? 'Verified' : verifyResult.error}
            </span>
          )}
          {!verifyResult && (
            <span className="text-[11px] text-warning">Save blocked until model is verified</span>
          )}
        </div>
      )}

      {/* Context window + Max iterations */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Context Window</label>
          <input
            type="number"
            value={contextWindow || ''}
            onChange={(e) => onContextWindowChange(Number(e.target.value) || 0)}
            placeholder="200000"
            className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2 text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-[10px] text-text-muted">Token limit for conversation context</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Max Tool Iterations</label>
          <input
            type="number"
            value={maxToolIterations || ''}
            onChange={(e) => onMaxToolIterationsChange(Number(e.target.value) || 0)}
            placeholder="25"
            className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2 text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-[10px] text-text-muted">Max tool call rounds per turn</p>
        </div>
      </div>
    </div>
  )
}
