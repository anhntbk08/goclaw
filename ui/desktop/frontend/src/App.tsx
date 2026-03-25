import { useEffect, useState } from 'react'
import { useUiStore } from './stores/ui-store'
import { AppShell } from './components/layout/AppShell'
import { ChatCanvas } from './components/chat/ChatCanvas'
import { StatusBar } from './components/layout/StatusBar'
import { OnboardingWizard } from './components/onboarding/OnboardingWizard'
import { wails } from './lib/wails'
import { initWsClient } from './lib/ws'
import { initApiClient } from './lib/api'
import { useSessions } from './hooks/use-sessions'

function AppReady() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const { createSession } = useSessions()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
      if (mod && e.key === 'n') {
        e.preventDefault()
        createSession()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleSidebar, createSession])

  return (
    <AppShell>
      <ChatCanvas />
      <StatusBar />
    </AppShell>
  )
}

function App() {
  const theme = useUiStore((s) => s.theme)
  const onboarded = useUiStore((s) => s.onboarded)
  const completeOnboarding = useUiStore((s) => s.completeOnboarding)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const init = async () => {
      // Poll for gateway readiness
      let attempts = 0
      while (attempts < 30) {
        try {
          const isReady = await wails.isGatewayReady()
          if (isReady) break
        } catch { /* not ready yet */ }
        await new Promise((r) => setTimeout(r, 500))
        attempts++
      }

      // Initialize clients
      const token = await wails.getGatewayToken()

      // In dev mode (Vite), use relative URLs so Vite proxy handles CORS.
      // In production (Wails asset server), use the actual gateway URL.
      const isDev = import.meta.env.DEV
      const gatewayUrl = isDev ? '' : await wails.getGatewayURL()
      const wsUrl = isDev
        ? `ws://${window.location.host}/ws`
        : (await wails.getGatewayURL()).replace(/^http/, 'ws') + '/ws'

      initWsClient(wsUrl, token)
      initApiClient(gatewayUrl, token)

      setReady(true)
    }
    init()
  }, [])

  const handleOnboardingComplete = () => {
    completeOnboarding()
  }

  if (!ready) {
    return (
      <div className="h-dvh flex items-center justify-center bg-surface-primary">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary text-sm">Starting gateway...</p>
        </div>
      </div>
    )
  }

  if (!onboarded) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />
  }

  return <AppReady />
}

export default App
