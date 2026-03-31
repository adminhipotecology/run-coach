'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Plan, Run } from '@/types'
import HeroSection from '@/components/HeroSection'
import HRZones from '@/components/HRZones'
import Timeline from '@/components/Timeline'
import RunPanel from '@/components/RunPanel'
import Sidebar from '@/components/Sidebar'

interface DashboardClientProps {
  initialPlan: Plan
  initialRuns: Run[]
}

export default function DashboardClient({ initialPlan, initialRuns }: DashboardClientProps) {
  const [plan] = useState<Plan>(initialPlan)
  const [runs] = useState<Run[]>(initialRuns)
  const [selectedRun, setSelectedRun] = useState<Run | null>(null)
  const [prefillMessage, setPrefillMessage] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth > 768
    return true
  })
  const router = useRouter()

  const handleRunParsed = useCallback(() => {
    router.refresh()
  }, [router])

  const handleStreamComplete = useCallback(() => {
    window.location.reload()
  }, [])

  const handleEditPlan = useCallback((message: string) => {
    setPrefillMessage(message)
    setSidebarOpen(true)
  }, [])

  const handleLogout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Count current activities per week from plan
  const activitiesPerWeek = plan.weeks.length > 0 ? plan.weeks[0].workouts.length : 0

  return (
    <div className="app-layout">
      <main className="app-main">
        <HeroSection
          meta={plan.meta}
          activitiesPerWeek={activitiesPerWeek}
          onEditPlan={handleEditPlan}
          onLogout={handleLogout}
        />
        <HRZones zones={plan.zones} />
        <Timeline
          weeks={plan.weeks}
          runs={runs}
          onRunClick={setSelectedRun}
        />
      </main>

      <Sidebar
        onStreamComplete={handleStreamComplete}
        onRunParsed={handleRunParsed}
        prefillMessage={prefillMessage}
        onPrefillConsumed={() => setPrefillMessage(null)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <RunPanel
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
      />
    </div>
  )
}
