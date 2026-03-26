import { useEffect, useState } from 'react'
import { getApiClient } from '../../lib/api'
import { Combobox } from '../common/Combobox'
import type { StepProps } from './WelcomeStep'

interface ModelVerifyStepProps extends StepProps {
  providerId: string | null
  onModelSelected: (model: string) => void
}

export function ModelVerifyStep({ onNext, onBack, providerId, onModelSelected }: ModelVerifyStepProps) {
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')

  // Fetch available models from provider
  useEffect(() => {
    if (!providerId) return
    setLoading(true)
    getApiClient()
      .get<{ models?: { id: string }[] }>(`/v1/providers/${providerId}/models`)
      .then((res) => {
        const ids = (res.models ?? []).map((m) => m.id)
        setModels(ids)
        if (ids.length > 0) setModel(ids[0])
      })
      .catch(() => { /* models endpoint may not exist for this provider */ })
      .finally(() => setLoading(false))
  }, [providerId])

  const handleVerify = async () => {
    if (!model.trim() || !providerId) return
    setVerifying(true)
    setError('')
    setVerified(false)
    const start = Date.now()
    try {
      const result = await getApiClient().post<{ valid: boolean; error?: string }>(
        `/v1/providers/${providerId}/verify`,
        { model: model.trim() }
      )
      const elapsed = Date.now() - start
      if (result.valid) {
        setVerified(true)
        setError(`Connected in ${elapsed}ms`)
      } else {
        setError(result.error ?? 'Verification failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleContinue = () => {
    onModelSelected(model.trim())
    onNext()
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Select & Verify Model</h2>
      <p className="text-text-secondary mb-5">Choose a model and test the connection.</p>

      {/* Model selection — searchable combobox with API-loaded options */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Model</label>
        <Combobox
          value={model}
          onChange={(v) => { setModel(v); setVerified(false); setError('') }}
          options={models.map((m) => ({ value: m, label: m }))}
          placeholder="Search or type a model name..."
          loading={loading}
          allowCustom
        />
      </div>

      {/* Status */}
      {error && (
        <div className={['mb-4 text-sm px-3 py-2 rounded-lg', verified ? 'bg-success/10 text-success' : 'bg-error/10 text-error'].join(' ')}>
          {verified ? '✓ ' : '✕ '}{error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleVerify}
            disabled={!model.trim() || verifying}
            className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:border-accent hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {verifying && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            Test Connection
          </button>
          <button
            onClick={handleContinue}
            disabled={!verified}
            className="px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export type { ModelVerifyStepProps }
