'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  const handlePlanGenerated = useCallback(() => {
    router.refresh()
  }, [router])

  const handleRunParsed = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="app-layout">
      <main className="app-main">
        <HeroSection meta={plan.meta} />
        <HRZones zones={plan.zones} />
        <Timeline
          weeks={plan.weeks}
          runs={runs}
          onRunClick={setSelectedRun}
        />
      </main>

      <Sidebar
        onPlanGenerated={handlePlanGenerated}
        onRunParsed={handleRunParsed}
      />

      <RunPanel
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
      />
    </div>
  )
}
