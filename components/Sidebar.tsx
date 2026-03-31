'use client'

import { useState } from 'react'
import Chat from './Chat'
import GarminUpload from './GarminUpload'

interface SidebarProps {
  onPlanGenerated: () => void
  onRunParsed: (runData: Record<string, unknown>) => void
}

export default function Sidebar({ onPlanGenerated, onRunParsed }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'upload'>('chat')
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle sidebar"
      >
        {collapsed ? '\u2190' : '\u2192'}
      </button>

      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
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
          <Chat onPlanGenerated={onPlanGenerated} compact />
        )}

        {activeTab === 'upload' && (
          <GarminUpload onRunParsed={onRunParsed} />
        )}
      </aside>
    </>
  )
}
