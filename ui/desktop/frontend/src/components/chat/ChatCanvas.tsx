import { useEffect, useRef, useCallback } from 'react'
import { useChat } from '../../hooks/use-chat'
import { useAgents } from '../../hooks/use-agents'
import { ChatTopBar } from './ChatTopBar'
import { MessageBubble } from './MessageBubble'
import { ActivityIndicator } from './ActivityIndicator'
import { InputBar } from './InputBar'

export function ChatCanvas() {
  const { messages, isRunning, activity, sendMessage } = useChat()
  const { selectedAgent } = useAgents()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)

  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: isRunning ? 'smooth' : 'instant' })
    }
  }, [messages, isRunning])

  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    userScrolledUp.current = !atBottom
  }, [])

  const handleSend = useCallback((text: string) => {
    if (!selectedAgent) return
    userScrolledUp.current = false
    sendMessage(text, selectedAgent.id)
  }, [selectedAgent, sendMessage])

  const hasMessages = messages.length > 0

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatTopBar />

      {/* Chat body — dots background covers messages + input */}
      <div className="flex-1 flex flex-col min-h-0 canvas-dots">
      {/* Messages area */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-2"
      >
        <div className="max-w-3xl mx-auto">
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <img src="/goclaw-icon.svg" alt="GoClaw" className="h-12 w-12 mb-4 opacity-40" />
              <h2 className="text-lg font-medium text-text-primary mb-1">Start a conversation</h2>
              <p className="text-sm text-text-muted max-w-sm">
                {selectedAgent
                  ? `Send a message to ${selectedAgent.name}`
                  : 'Select an agent from the sidebar to begin.'}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isRunning && activity && (
            <ActivityIndicator phase={activity.phase} tool={activity.tool} iteration={activity.iteration} />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <InputBar
        onSend={handleSend}
        disabled={!selectedAgent}
        isRunning={isRunning}
        placeholder={selectedAgent ? `Message ${selectedAgent.name}...` : 'Select an agent first'}
      />
      </div>
    </div>
  )
}
