interface StepProps {
  onNext: () => void
  onSkip?: () => void
  onBack?: () => void
}

export function WelcomeStep({ onNext, onSkip }: StepProps) {
  return (
    <div className="text-center">
      <img src="/goclaw-icon.svg" alt="GoClaw" className="mx-auto mb-6 h-20 w-20" />

      <h1 className="text-3xl font-bold text-text-primary mb-3">Welcome to GoClaw</h1>
      <p className="text-text-secondary mb-8 max-w-sm mx-auto">
        Your local AI agent gateway. Set up in under 2 minutes.
      </p>

      <button
        onClick={onNext}
        className="px-8 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors"
      >
        Get Started
      </button>

      {onSkip && (
        <p className="mt-6">
          <button
            onClick={onSkip}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip to dashboard →
          </button>
        </p>
      )}
    </div>
  )
}

export type { StepProps }
