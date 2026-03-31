'use client'

import { useEffect, useState } from 'react'
import type { PlanMeta } from '@/types'

interface HeroSectionProps {
  meta: PlanMeta
  activitiesPerWeek?: number
  onEditPlan?: (message: string) => void
  onLogout?: () => void
}

export default function HeroSection({ meta, activitiesPerWeek, onEditPlan, onLogout }: HeroSectionProps) {
  const [daysLeft, setDaysLeft] = useState(0)
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [newActivities, setNewActivities] = useState(activitiesPerWeek ?? 4)

  useEffect(() => {
    const race = new Date(meta.raceDate)
    const now = new Date()
    const days = Math.ceil((race.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    setDaysLeft(Math.max(0, days))
  }, [meta.raceDate])

  useEffect(() => {
    if (activitiesPerWeek) setNewActivities(activitiesPerWeek)
  }, [activitiesPerWeek])

  const paceMin = meta.targetPace.split(':')[0]
  const paceSec = meta.targetPace.split(':')[1]

  function handleSubmitEdit() {
    if (newActivities !== activitiesPerWeek && onEditPlan) {
      onEditPlan(
        `I'd like to change my training plan from ${activitiesPerWeek} activities per week to ${newActivities} activities per week. Please update my plan accordingly.`
      )
    }
    setShowEditPanel(false)
  }

  return (
    <section className="hero">
      <div className="hero-top-bar">
        <div className="hero-label">Training Plan</div>
        <div className="hero-actions">
          <button
            className="hero-action-btn"
            onClick={() => setShowEditPanel(!showEditPanel)}
            title="Edit plan"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit Plan
          </button>
          <button
            className="hero-action-btn hero-action-btn--logout"
            onClick={onLogout}
            title="Log out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log Out
          </button>
        </div>
      </div>

      {showEditPanel && (
        <div className="edit-plan-panel">
          <div className="edit-plan-header">Modify Training Plan</div>
          <div className="edit-plan-field">
            <label className="edit-plan-label">Activities per week</label>
            <div className="edit-plan-stepper">
              <button
                className="stepper-btn"
                onClick={() => setNewActivities(Math.max(2, newActivities - 1))}
                disabled={newActivities <= 2}
              >
                &minus;
              </button>
              <span className="stepper-value">{newActivities}</span>
              <button
                className="stepper-btn"
                onClick={() => setNewActivities(Math.min(7, newActivities + 1))}
                disabled={newActivities >= 7}
              >
                +
              </button>
            </div>
          </div>
          <div className="edit-plan-actions">
            <button className="edit-plan-cancel" onClick={() => setShowEditPanel(false)}>Cancel</button>
            <button
              className="edit-plan-submit"
              onClick={handleSubmitEdit}
              disabled={newActivities === activitiesPerWeek}
            >
              Update Plan
            </button>
          </div>
        </div>
      )}

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
        {activitiesPerWeek && (
          <div className="hero-stat">
            <div className="hero-stat-value">{activitiesPerWeek}x</div>
            <div className="hero-stat-label">Per Week</div>
          </div>
        )}
      </div>

      <div className="hero-countdown">
        <div className="hero-countdown-number">{daysLeft || '—'}</div>
        <div className="hero-countdown-label">{daysLeft > 0 ? 'Days to Race' : 'Race Date Passed'}</div>
      </div>
    </section>
  )
}
