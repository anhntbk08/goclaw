import { useEffect, useState } from 'react'
import { getApiClient } from '../../lib/api'
import { WelcomeStep } from './WelcomeStep'
import { GatewayStep } from './GatewayStep'
import { ProviderStep } from './ProviderStep'
import { AgentStep } from './AgentStep'
import { ReadyStep } from './ReadyStep'

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [providerId, setProviderId] = useState<string | null>(null)
  const [agentName, setAgentName] = useState('')
  const [initialStep, setInitialStep] = useState<number | null>(null)
  const totalSteps = 5

  // Auto-detect existing setup and skip to the right step
  useEffect(() => {
    const detect = async () => {
      try {
        const api = getApiClient()
        if (!api) { setInitialStep(1); return }

        // Check if agents exist
        const agentsRes = await api.get<{ agents?: { id: string; agent_key: string; display_name?: string }[] }>('/v1/agents')
        if (agentsRes.agents && agentsRes.agents.length > 0) {
          setAgentName(agentsRes.agents[0].display_name || agentsRes.agents[0].agent_key)
          setInitialStep(5) // Go to Ready step
          return
        }

        // Check if providers exist
        const providersRes = await api.get<{ providers?: { id: string }[] }>('/v1/providers')
        if (providersRes.providers && providersRes.providers.length > 0) {
          setProviderId(providersRes.providers[0].id)
          setInitialStep(4) // Go to Agent step
          return
        }

        // Nothing exists — start from beginning (skip welcome+gateway since gateway is running)
        setInitialStep(3) // Provider step
      } catch {
        setInitialStep(1) // Fallback to start
      }
    }
    detect()
  }, [])

  // Apply initial step once detected
  useEffect(() => {
    if (initialStep !== null) setStep(initialStep)
  }, [initialStep])

  // Show loading while detecting
  if (initialStep === null) {
    return (
      <div className="h-dvh flex items-center justify-center bg-surface-primary">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-surface-primary">
      {/* Progress bar */}
      <div className="h-1 bg-surface-tertiary flex-shrink-0">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step counter */}
      <div className="flex justify-end px-8 pt-4 flex-shrink-0">
        <span className="text-xs text-text-muted">
          {step} / {totalSteps}
        </span>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          {step === 1 && (
            <WelcomeStep
              onNext={() => setStep(2)}
              onSkip={onComplete}
            />
          )}
          {step === 2 && (
            <GatewayStep
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <ProviderStep
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
              onProviderSaved={setProviderId}
            />
          )}
          {step === 4 && (
            <AgentStep
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
              providerId={providerId}
              onAgentCreated={setAgentName}
            />
          )}
          {step === 5 && (
            <ReadyStep
              onNext={onComplete}
              onBack={() => setStep(4)}
              agentName={agentName}
            />
          )}
        </div>
      </div>
    </div>
  )
}
