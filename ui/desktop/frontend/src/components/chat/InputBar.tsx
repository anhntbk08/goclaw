import { useState, useRef, useCallback, type KeyboardEvent } from 'react'

interface InputBarProps {
  onSend: (text: string) => void
  onStop?: () => void
  disabled?: boolean
  isRunning?: boolean
  placeholder?: string
}

export function InputBar({ onSend, onStop, disabled, isRunning, placeholder }: InputBarProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [text, disabled, onSend])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const hasText = text.trim().length > 0

  return (
    <div className="px-4 pb-4 pt-1 shrink-0">
      <div className="max-w-3xl mx-auto">
        {/* Input container — rounded pill with actions inside */}
        <div className="flex items-center gap-0 bg-surface-secondary rounded-2xl border border-border focus-within:border-accent/40 transition-colors">
          {/* Attach button */}
          <button
            className="p-3 text-text-muted hover:text-text-secondary transition-colors shrink-0"
            title="Attach file"
            disabled={disabled}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); handleInput() }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'Type a message...'}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-text-primary text-base md:text-sm py-3 px-0 focus:outline-none placeholder:text-text-muted resize-none overflow-hidden"
            style={{ maxHeight: 160 }}
          />

          {/* Send / Stop button */}
          <div className="p-2 shrink-0">
            {isRunning ? (
              <button
                onClick={onStop}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-error text-white hover:opacity-90 transition-opacity"
                title="Stop"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!hasText || disabled}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Send"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
