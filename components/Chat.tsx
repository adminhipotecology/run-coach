'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolResults?: { name: string; result: string }[]
}

interface ChatProps {
  onStreamComplete?: () => void
  compact?: boolean
  prefillMessage?: string | null
  onPrefillConsumed?: () => void
}

export default function Chat({ onStreamComplete, compact, prefillMessage, onPrefillConsumed }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const planGeneratedRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [input])

  // Handle prefill messages from parent (e.g., Edit Plan)
  useEffect(() => {
    if (prefillMessage && !isStreaming) {
      handleSend(prefillMessage)
      onPrefillConsumed?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillMessage])

  async function handleSend(overrideText?: string) {
    const text = overrideText ?? input.trim()
    if (!text || isStreaming) return
    if (!overrideText) setInput('')

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsStreaming(true)

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      toolResults: [],
    }
    setMessages([...updatedMessages, assistantMessage])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok) throw new Error('Chat request failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader')

      let buffer = ''
      const pendingToolResults: { name: string; result: string }[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))

          if (data.type === 'token') {
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              if (last.role === 'assistant') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + data.content },
                ]
              }
              return prev
            })
          }

          if (data.type === 'tool') {
            // Buffer tool results — they'll be shown after the text completes
            pendingToolResults.push({ name: data.name, result: data.result })

            if (data.name === 'generate_plan' || data.name === 'update_plan') {
              planGeneratedRef.current = true
            }
          }

          if (data.type === 'error') {
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              if (last.role === 'assistant') {
                let errorContent: string
                if (data.message?.includes('overloaded')) {
                  errorContent = 'The AI service is temporarily busy. Please try again in a moment.'
                } else if (data.message?.includes('API key')) {
                  errorContent = 'API key not configured. Please check your environment variables.'
                } else {
                  errorContent = `Something went wrong: ${data.message || 'Unknown error'}. Please try again.`
                }
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: errorContent },
                ]
              }
              return prev
            })
          }
        }
      }

      // Stream done — now append buffered tool results to the assistant message
      if (pendingToolResults.length > 0) {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...last, toolResults: [...(last.toolResults || []), ...pendingToolResults] },
            ]
          }
          return prev
        })
      }
    } catch (error) {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last.role === 'assistant') {
          return [
            ...prev.slice(0, -1),
            { ...last, content: 'Connection error. Please try again.' },
          ]
        }
        return prev
      })
    } finally {
      setIsStreaming(false)
      if (planGeneratedRef.current) {
        planGeneratedRef.current = false
        onStreamComplete?.()
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={compact ? 'sidebar-content' : 'chat-container'}>
      {!compact && (
        <div className="chat-header">
          <h1 className="chat-header-title">RUNCOACH</h1>
          <p className="chat-header-sub">Tell me about your running goals</p>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && !compact && (
          <div className="chat-message assistant">
            <div className="chat-message-avatar">RC</div>
            <div className="chat-message-bubble">
              <p>Hey! I&apos;m your running coach. What race are you training for? Just tell me the distance, your goal time, when it is, and how many days a week you can train — I&apos;ll take it from there. Keep it simple, we can always fine-tune later!</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isStreaming && (
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me about your race goal..."
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="chat-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
