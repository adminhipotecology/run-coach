'use client'

import { useEffect, useState } from 'react'
import type { PlanMeta } from '@/types'

export default function HeroSection({ meta }: { meta: PlanMeta }) {
  const [daysLeft, setDaysLeft] = useState(0)

  useEffect(() => {
    const race = new Date(meta.raceDate)
    const now = new Date()
    const days = Math.ceil((race.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    setDaysLeft(Math.max(0, days))
  }, [meta.raceDate])

  const paceMin = meta.targetPace.split(':')[0]
  const paceSec = meta.targetPace.split(':')[1]

  return (
    <section className="hero">
      <div className="hero-label">Training Plan</div>
      <h1 className="hero-title">
        {meta.raceName.split(' ').slice(0, -1).join(' ')}
        <span>{meta.raceName.split(' ').pop()}</span>
      </h1>

      <div className="hero-meta">
        <div className="hero-stat">
          <div className="hero-stat-value">{meta.raceDistance} KM</div>
          <div className="hero-stat-label">Distance</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">{meta.targetTime}</div>
          <div className="hero-stat-label">Target Time</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">{paceMin}:{paceSec}</div>
          <div className="hero-stat-label">Target Pace /km</div>
        </div>
      </div>

      <div className="hero-countdown">
        <div className="hero-countdown-number">{daysLeft || '—'}</div>
        <div className="hero-countdown-label">{daysLeft > 0 ? 'Days to Race' : 'Race Date Passed'}</div>
      </div>
    </section>
  )
}
