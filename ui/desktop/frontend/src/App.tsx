import { useEffect, useState } from 'react'
import { useUiStore } from './stores/ui-store'
import { AppShell } from './components/layout/AppShell'
import { ChatCanvas } from './components/chat/ChatCanvas'
import { OnboardingWizard } from './components/onboarding/OnboardingWizard'
import { wails } from './lib/wails'
import { initWsClient } from './lib/ws'
import { initApiClient } from './lib/api'
import { useSessions } from './hooks/use-sessions'
import { ErrorBoundary } from './components/common/ErrorBoundary'

function AppReady() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const openSettings = useUiStore((s) => s.openSettings)
  const closeSettings = useUiStore((s) => s.closeSettings)
  const activeView = useUiStore((s) => s.activeView)
  const { createSession } = useSessions()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'b') { e.preventDefault(); toggleSidebar() }
      if (mod && e.key === 'n') { e.preventDefault(); createSession() }
      if (mod && e.key === ',') { e.preventDefault(); openSettings() }
      if (e.key === 'Escape' && activeView === 'settings') { closeSettings() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleSidebar, createSession, openSettings, closeSettings, activeView])

  return (
    <AppShell>
      <ChatCanvas />
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
      let attempts = 0
      while (attempts < 30) {
        try {
          const isReady = await wails.isGatewayReady()
          if (isReady) break
        } catch { /* not ready yet */ }
        await new Promise((r) => setTimeout(r, 500))
        attempts++
      }

      let token = ''
      try { token = await wails.getGatewayToken() } catch (e) {
        console.warn('[app] failed to get token:', e)
      }

      const gatewayUrl = await wails.getGatewayURL()
      const wsUrl = gatewayUrl.replace(/^http/, 'ws') + '/ws'

      initWsClient(wsUrl, token)
      const api = initApiClient(gatewayUrl, token)
      setReady(true)

      // Auto-detect empty DB → reset onboarded flag (handles DB deletion)
      try {
        const [pRes, aRes] = await Promise.allSettled([
          api.get<{ providers?: unknown[] | null }>('/v1/providers'),
          api.get<{ agents?: unknown[] | null }>('/v1/agents'),
        ])
        const hasProviders = pRes.status === 'fulfilled' && (pRes.value.providers?.length ?? 0) > 0
        const hasAgents = aRes.status === 'fulfilled' && (aRes.value.agents?.length ?? 0) > 0
        if (!hasProviders && !hasAgents) {
          useUiStore.getState().resetOnboarding()
        }
      } catch { /* ignore — onboarding wizard will handle */ }
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="h-dvh flex items-center justify-center canvas-bg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary text-sm">Starting gateway...</p>
        </div>
      </div>
    )
  }

  if (!onboarded) {
    return <OnboardingWizard onComplete={completeOnboarding} />
  }

  return (
    <ErrorBoundary>
      <AppReady />
    </ErrorBoundary>
  )
}

export default App
