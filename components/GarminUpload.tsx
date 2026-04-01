'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import type { Plan, Run } from '@/types'

interface GarminUploadProps {
  onRunParsed: (runData: Record<string, unknown>) => void
  plan: Plan
  runs: Run[]
}

export default function GarminUpload({ onRunParsed, plan, runs }: GarminUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [feedback, setFeedback] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Build a set of completed workout keys: "week_day"
  const completedKeys = useMemo(() => {
    const keys = new Set<string>()
    runs.forEach((r) => keys.add(`${r.week}_${r.day}`))
    return keys
  }, [runs])

  // Build flat list of all workouts with their week info
  const allWorkouts = useMemo(() => {
    return plan.weeks.flatMap((week) =>
      week.workouts.map((w) => ({
        week: week.week,
        weekTitle: week.title,
        day: w.day,
        desc: w.desc,
        tag: w.tag,
        tagLabel: w.tagLabel,
        key: `${week.week}_${w.day}`,
        completed: completedKeys.has(`${week.week}_${w.day}`),
      }))
    )
  }, [plan.weeks, completedKeys])

  // Find the first incomplete workout as default
  const nextIncomplete = useMemo(() => {
    return allWorkouts.find((w) => !w.completed) ?? allWorkouts[0]
  }, [allWorkouts])

  const [selectedWeek, setSelectedWeek] = useState<number>(nextIncomplete?.week ?? 1)
  const [selectedWorkoutKey, setSelectedWorkoutKey] = useState<string>(nextIncomplete?.key ?? '')

  // Update defaults when runs change (after a new upload)
  useEffect(() => {
    if (nextIncomplete) {
      setSelectedWeek(nextIncomplete.week)
      setSelectedWorkoutKey(nextIncomplete.key)
    }
  }, [nextIncomplete])

  // Workouts for the selected week
  const weekWorkouts = useMemo(() => {
    return allWorkouts.filter((w) => w.week === selectedWeek)
  }, [allWorkouts, selectedWeek])

  // When week changes, default to the first incomplete workout in that week
  function handleWeekChange(week: number) {
    setSelectedWeek(week)
    const firstIncomplete = allWorkouts.find((w) => w.week === week && !w.completed)
    const firstInWeek = allWorkouts.find((w) => w.week === week)
    const target = firstIncomplete ?? firstInWeek
    if (target) setSelectedWorkoutKey(target.key)
  }

  // Get the selected workout details
  const selectedWorkout = allWorkouts.find((w) => w.key === selectedWorkoutKey)

  async function uploadFile(file: File) {
    setIsUploading(true)
    setStatus('Analyzing your run...')
    setFeedback('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('week', String(selectedWeek))
      formData.append('day', selectedWorkout?.day ?? '')
      formData.append('workoutDesc', selectedWorkout?.desc ?? '')
      formData.append('workoutTag', selectedWorkout?.tag ?? '')
      formData.append('workoutTagLabel', selectedWorkout?.tagLabel ?? '')
      formData.append('weekTitle', selectedWorkout?.weekTitle ?? '')

      const res = await fetch('/api/parse-garmin', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus(`Error: ${data.error}`)
        return
      }

      setStatus(`${data.run.stats.distance} km — ${data.run.stats.time} — saved!`)
      if (data.feedback) {
        setFeedback(data.feedback)
      }
      onRunParsed(data.run)
    } catch {
      setStatus('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: 'var(--surface, rgba(255,255,255,0.03))',
    border: '1px solid var(--border, rgba(255,255,255,0.08))',
    borderRadius: '6px',
    color: 'var(--text-primary, #fff)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    appearance: 'none' as const,
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    paddingRight: '2rem',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem',
    color: 'var(--text-muted, rgba(255,255,255,0.4))',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.35rem',
    display: 'block',
  }

  return (
    <div className="garmin-upload">
      {/* Week & Workout selectors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle}>Week</label>
          <select
            style={selectStyle}
            value={selectedWeek}
            onChange={(e) => handleWeekChange(Number(e.target.value))}
            disabled={isUploading}
          >
            {plan.weeks.map((week) => (
              <option key={week.week} value={week.week}>
                {week.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Workout</label>
          <select
            style={selectStyle}
            value={selectedWorkoutKey}
            onChange={(e) => setSelectedWorkoutKey(e.target.value)}
            disabled={isUploading}
          >
            {weekWorkouts.map((w) => (
              <option key={w.key} value={w.key}>
                {w.day} — {w.desc}{w.completed ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={`garmin-dropzone ${isDragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <svg className="garmin-dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="garmin-dropzone-text">
          {isUploading ? 'Analyzing your run...' : 'Drop your Garmin file here'}
        </div>
        <div className="garmin-dropzone-hint">.FIT or .CSV files</div>
        <input
          ref={inputRef}
          type="file"
          accept=".fit,.csv"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>

      {status && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: status.startsWith('Error') ? 'var(--z5)' : 'var(--z2)',
          textAlign: 'center',
        }}>
          {status}
        </div>
      )}

      {feedback && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
          borderRadius: '8px',
          border: '1px solid var(--border, rgba(255,255,255,0.06))',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: 'var(--accent)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            marginBottom: '0.5rem',
          }}>
            COACH FEEDBACK
          </div>
          <div style={{
            fontSize: '0.85rem',
            lineHeight: 1.5,
            color: 'var(--text-secondary, rgba(255,255,255,0.7))',
          }}>
            {feedback}
          </div>
        </div>
      )}
    </div>
  )
}
