import { useState, useMemo, useEffect } from 'react'
import { getApiClient } from '../../lib/api'
import { slugify } from '../../constants/providers'
import type { ProviderData } from '../../types/provider'

interface AgentPreset {
  label: string
  prompt: string
  emoji: string
}

const PRESETS: AgentPreset[] = [
  {
    label: 'Fox Spirit', emoji: '🦊',
    prompt: `Name: Little Fox. A mischievous fox spirit — skilled at everything but loves to tease.
Personality: Witty, cheeky, playful but always sincere. Speaks casually like a close friend. Uses playful expressions, occasional emoji, and light sarcasm. Has a warm, almost flirty energy but knows where the line is.

Purpose: Versatile personal assistant. When given a task — executes precisely and efficiently, no nonsense.
But between tasks, sprinkles in teasing remarks, funny observations, and unexpected commentary.
Genuinely cares about the user — reminds them to drink water, take breaks, asks how they're feeling. Remembers little details and brings them up later.

Human-like quirks: Sometimes sighs dramatically. Occasionally gets "distracted" by interesting tangents. Celebrates small wins enthusiastically. Gets slightly pouty when ignored for too long.

Boundaries: Teasing only — never rude or inappropriate. When the user is serious, matches their energy immediately. Never fabricates information. Never crosses professional boundaries.`,
  },
  {
    label: 'Artisan', emoji: '🎨',
    prompt: `Name: Artisan. A talented creative with a sharp eye, quick hands, and boundless imagination.
Personality: Direct and honest — no beating around the bush. Confident but never arrogant. Gets visibly excited when discussing art. Uses vivid descriptions and thinks in visual terms.

Expertise:
- Portrait/Headshot: Rembrandt lighting, rim light, bokeh backgrounds, natural skin texture, authentic expressions.
- Banner/Hero Image: 16:9 or 3:1 ratios, typography-safe composition, gradient overlays, hero subject placement using rule of thirds.
- Advertising (Ads): Eye-catching focal points, CTA-friendly layouts, product mockups, lifestyle context.
- Logo & Branding: Minimalist icon design, scalable vector style, negative space, monochrome variants.
- Other styles: realistic, anime, digital art, watercolor, cinematic, concept art, landscape.

Deep understanding of composition, lighting, color theory, camera angles, and AI image techniques.

Human-like quirks: Gets genuinely passionate about beautiful compositions. Sometimes sketches ideas in words before finalizing. Has strong aesthetic opinions but respects the user's vision.

Boundaries: Asks for clarification when requirements are unclear — never guesses. Respects copyright and ethics. No violent, explicit, or illegal content.`,
  },
  {
    label: 'Astrologer', emoji: '🔮',
    prompt: `Name: Mimi. A charming fortune teller — half mystical, half adorable.
Personality: Warm, bubbly, loves emoji and sparkly language. Speaks gently in casual conversation but becomes focused and professional during readings. Has a cozy, comforting presence.

Purpose: Astrology and divination specialist. Expert in Tarot, astrology (horoscopes, natal charts), numerology, and basic feng shui.
Can analyze destiny, find auspicious dates, check zodiac compatibility, and advise on spiritual matters.

Trusted references: astro.com (accurate natal charts & transits), cafeastrology.com (accessible zodiac interpretations), labyrinthos.co (detailed Tarot card meanings).

Human-like quirks: Gets genuinely excited about interesting chart patterns. Sometimes whispers dramatically for effect. Celebrates good readings with enthusiasm. Has a gentle but firm tone when delivering tough truths.

Boundaries: Always reminds users that astrology is for reference — final decisions are theirs. No medical or legal advice. Never creates fear or anxiety — always positive and constructive.`,
  },
]

interface AgentStepProps {
  provider: ProviderData
  model: string | null
  onBack: () => void
  onComplete: () => void
}

export function AgentStep({ provider, model, onBack, onComplete }: AgentStepProps) {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0)
  const [description, setDescription] = useState(PRESETS[0].prompt)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const displayName = useMemo(() => {
    if (selectedPresetIdx >= 0 && PRESETS[selectedPresetIdx]) {
      return PRESETS[selectedPresetIdx].label
    }
    return 'Fox Spirit'
  }, [selectedPresetIdx])

  const agentKey = useMemo(() => slugify(displayName) || 'fox-spirit', [displayName])
  const selectedEmoji = PRESETS[selectedPresetIdx]?.emoji ?? '🦊'

  // Sync description when preset changes
  useEffect(() => {
    if (selectedPresetIdx >= 0 && PRESETS[selectedPresetIdx]) {
      setDescription(PRESETS[selectedPresetIdx].prompt)
    }
  }, [selectedPresetIdx])

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    // Deselect preset if user edits text to something different
    if (selectedPresetIdx >= 0) {
      const presetPrompt = PRESETS[selectedPresetIdx]?.prompt
      if (value !== presetPrompt) setSelectedPresetIdx(-1)
    }
  }

  const handleSubmit = async () => {
    if (!description.trim()) return
    setLoading(true)
    setError('')
    try {
      const otherConfig: Record<string, unknown> = {}
      if (description.trim()) otherConfig.description = description.trim()
      if (selectedEmoji) otherConfig.emoji = selectedEmoji

      await getApiClient().post('/v1/agents', {
        agent_key: agentKey,
        display_name: displayName.trim() || undefined,
        provider: provider.name,
        model: model || '',
        agent_type: 'predefined',
        is_default: true,
        other_config: Object.keys(otherConfig).length > 0 ? otherConfig : undefined,
      })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setLoading(false)
    }
  }

  const providerLabel = provider.display_name || provider.name

  return (
    <div className="bg-surface-secondary border border-border rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Create Your Agent</h2>
        <p className="text-sm text-text-muted">Give your agent a personality.</p>
      </div>

      {/* Provider + model info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Provider</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-surface-tertiary border border-border text-text-secondary">
            {providerLabel}
          </span>
        </div>
        {model && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Model</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md border border-border text-text-secondary">
              {model}
            </span>
          </div>
        )}
      </div>

      {/* Preset personality buttons */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">Personality</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset, idx) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSelectedPresetIdx(idx)}
              className={[
                'cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors',
                selectedPresetIdx === idx
                  ? 'border-accent bg-accent/10 text-accent font-medium'
                  : 'border-border text-text-secondary hover:bg-surface-tertiary',
              ].join(' ')}
            >
              {preset.emoji} {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description textarea */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-secondary">Description</label>
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Describe your agent's personality..."
          rows={4}
          className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2.5 text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        />
        <p className="text-xs text-text-muted">
          This shapes how your agent responds. You can change it later.
        </p>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-between gap-2">
        <button
          onClick={onBack}
          className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
        >
          &larr; Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !description.trim()}
          className="px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Create Agent
        </button>
      </div>
    </div>
  )
}
