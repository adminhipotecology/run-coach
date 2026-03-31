'use client'

import { useMemo } from 'react'
import type { PlanWeek, Run } from '@/types'

function getZoneColor(hr: number): string {
  if (hr < 135) return 'var(--z1)'
  if (hr <= 155) return 'var(--z2)'
  if (hr <= 170) return 'var(--z3)'
  if (hr <= 185) return 'var(--z4)'
  return 'var(--z5)'
}

interface TimelineProps {
  weeks: PlanWeek[]
  runs: Run[]
  onRunClick: (run: Run) => void
}

export default function Timeline({ weeks, runs, onRunClick }: TimelineProps) {
  const runIndex = useMemo(() => {
    const index: Record<string, Run> = {}
    runs.forEach((r) => {
      index[`${r.week}_${r.day}`] = r
    })
    return index
  }, [runs])

  const completedCount = useMemo(() => {
    let count = 0
    weeks.forEach((week) => {
      week.workouts.forEach((w) => {
        if (runIndex[`${week.week}_${w.day}`]) count++
      })
    })
    return count
  }, [weeks, runIndex])

  const totalWorkouts = weeks.reduce((n, w) => n + w.workouts.length, 0)
  const pct = totalWorkouts > 0 ? Math.round((completedCount / totalWorkouts) * 100) : 0

  return (
    <section className="section fade-in">
      <div className="section-header">
        <span className="section-number">02</span>
        <h2 className="section-title">TRAINING PLAN</h2>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span id="progress-text" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {completedCount} de {totalWorkouts} sessions completed
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--accent)' }}>
            {pct}%
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-markers">
          {weeks.map((w) => (
            <span key={w.week} className={`progress-marker ${w.week <= Math.ceil(completedCount / 4) ? 'active' : ''}`}>
              S{w.week}
            </span>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline">
        {weeks.map((week) => (
          <div key={week.week} className={`week-block ${week.classes}`}>
            <div className="week-header">{week.title}</div>
            <div className="week-dates">{week.dates}</div>
            <div className="week-workouts">
              {week.workouts.map((w) => {
                const run = runIndex[`${week.week}_${w.day}`]
                const isCompleted = !!run
                const isRace = w.tag === 'race'

                const classes = [
                  'workout-item',
                  isCompleted ? 'completed' : '',
                  isRace ? 'race-day' : '',
                  run ? 'clickable' : '',
                ].filter(Boolean).join(' ')

                let desc = w.desc
                if (run) {
                  desc = `${w.desc} — ${run.stats.distance} km, FC ${run.stats.hrAvg} bpm`
                }

                return (
                  <div
                    key={`${week.week}_${w.day}`}
                    className={classes}
                    onClick={() => run && onRunClick(run)}
                  >
                    <div className="workout-check" />
                    <span className="workout-day">{w.day}</span>
                    <span className="workout-desc" style={isRace ? { fontWeight: 600, color: 'var(--text-primary)' } : undefined}>
                      {desc}
                    </span>
                    <span className={`workout-type-tag ${w.tag}`}>{w.tagLabel}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
