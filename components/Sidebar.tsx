'use client'

import { useState, useEffect } from 'react'
import Chat from './Chat'
import GarminUpload from './GarminUpload'
import type { Plan, Run } from '@/types'

interface SidebarProps {
  onStreamComplete: () => void
  onRunParsed: (runData: Record<string, unknown>) => void
  prefillMessage?: string | null
  onPrefillConsumed?: () => void
  isOpen: boolean
  onToggle: () => void
  plan: Plan
  runs: Run[]
}

export default function Sidebar({
  onStreamComplete,
  onRunParsed,
  prefillMessage,
  onPrefillConsumed,
  isOpen,
  onToggle,
  plan,
  runs,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'upload'>('chat')

  // When a prefill message comes in, switch to chat tab
  useEffect(() => {
    if (prefillMessage) {
      setActiveTab('chat')
    }
  }, [prefillMessage])

  return (
    <>
      {/* Mobile floating toggle */}
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label="Toggle sidebar"
      >
        {isOpen ? '\u2715' : '\u{1F4AC}'}
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="sidebar-backdrop" onClick={onToggle} />
      )}

      <aside className={`app-sidebar ${isOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Coach Chat
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Run
          </button>
        </div>

        {activeTab === 'chat' && (
          <Chat
            onStreamComplete={onStreamComplete}
            compact
            prefillMessage={prefillMessage}
            onPrefillConsumed={onPrefillConsumed}
          />
        )}

        {activeTab === 'upload' && (
          <GarminUpload
            onRunParsed={onRunParsed}
            plan={plan}
            runs={runs}
          />
        )}
      </aside>
    </>
  )
}
