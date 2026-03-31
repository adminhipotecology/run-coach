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
  onPlanGenerated?: () => void
  compact?: boolean
}

export default function Chat({ onPlanGenerated, compact }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
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

  async function handleSend() {
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
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
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last.role === 'assistant') {
                last.content += data.content
              }
              return [...updated]
            })
          }

          if (data.type === 'tool') {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last.role === 'assistant') {
                last.toolResults = [
                  ...(last.toolResults || []),
                  { name: data.name, result: data.result },
                ]
              }
              return [...updated]
            })

            // Check if plan was generated
            if (data.name === 'generate_plan' || data.name === 'update_plan') {
              onPlanGenerated?.()
            }
          }

          if (data.type === 'error') {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last.role === 'assistant') {
                last.content = `Error: ${data.message}`
              }
              return [...updated]
            })
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last.role === 'assistant') {
          last.content = `Connection error. Please try again.`
        }
        return [...updated]
      })
    } finally {
      setIsStreaming(false)
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
              <p>Hey! I&apos;m your AI running coach. Tell me about your next race goal — what distance, what time are you aiming for, and when is the race?</p>
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
            onClick={handleSend}
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
