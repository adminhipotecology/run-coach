'use client'

import type { Run } from '@/types'

function getZoneColor(hr: number): string {
  if (hr < 135) return 'var(--z1)'
  if (hr <= 155) return 'var(--z2)'
  if (hr <= 170) return 'var(--z3)'
  if (hr <= 185) return 'var(--z4)'
  return 'var(--z5)'
}

function getZoneName(hr: number): string {
  if (hr < 135) return 'Z1'
  if (hr <= 155) return 'Z2'
  if (hr <= 170) return 'Z3'
  if (hr <= 185) return 'Z4'
  return 'Z5'
}

function hrZoneClass(hr: number): string {
  if (hr < 135) return ''
  if (hr <= 155) return 'in-zone'
  return 'above-zone'
}

function paceToSeconds(pace: string): number {
  const [m, s] = pace.split(':').map(Number)
  return m * 60 + (s || 0)
}

interface RunPanelProps {
  run: Run | null
  onClose: () => void
}

export default function RunPanel({ run, onClose }: RunPanelProps) {
  if (!run) return null

  const s = run.stats
  const stats = [
    { value: s.distance, unit: 'Kilometers', zone: '' },
    { value: s.time, unit: 'Time', zone: '' },
    { value: s.pace, unit: 'Pace /km', zone: '' },
    { value: s.hrAvg, unit: 'Avg HR BPM', zone: hrZoneClass(s.hrAvg) },
    { value: s.hrMax, unit: 'Max HR BPM', zone: hrZoneClass(s.hrMax) },
    { value: s.cadenceAvg, unit: 'Cadence SPM', zone: '' },
  ]

  const paces = run.laps.map((l) => paceToSeconds(l.pace))
  const maxPace = Math.max(...paces)
  const minPace = Math.min(...paces)
  const range = maxPace - minPace || 1

  return (
    <>
      <div
        className={`run-panel-overlay active`}
        onClick={onClose}
      />
      <div className="run-panel active">
        <button className="run-panel-close" onClick={onClose}>
          &times;
        </button>

        <div className="run-panel-label">{run.label}</div>
        <div className="run-panel-title">{run.title}</div>
        <div className="run-panel-objective">{run.objective}</div>

        <div className="run-stats-grid">
          {stats.map((st, i) => (
            <div key={i} className="run-stat">
              <div className={`run-stat-value ${st.zone}`}>{st.value}</div>
              <div className="run-stat-unit">{st.unit}</div>
            </div>
          ))}
        </div>

        <div className="elevation-row">
          <div className="elevation-stat">
            <span className="elevation-arrow" style={{ color: 'var(--z2)' }}>&#8593;</span>
            <span className="elevation-val">{run.elevation.ascent} m ascent</span>
          </div>
          <div className="elevation-stat">
            <span className="elevation-arrow" style={{ color: 'var(--z4)' }}>&#8595;</span>
            <span className="elevation-val">{run.elevation.descent} m descent</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
          <div className="elevation-stat">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginRight: '0.5rem' }}>TE Aerobic</span>
            <span className="elevation-val" style={{ color: 'var(--z2)' }}>{run.trainingEffect.aerobic}</span>
          </div>
          <div className="elevation-stat">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginRight: '0.5rem' }}>TE Anaerobic</span>
            <span className="elevation-val">{run.trainingEffect.anaerobic}</span>
          </div>
        </div>

        <div className="run-panel-section-title">PACE PER LAP</div>
        <div className="lap-chart">
          {run.laps.map((l) => {
            const sec = paceToSeconds(l.pace)
            const h = 20 + ((maxPace - sec) / range) * 70
            return (
              <div
                key={l.lap}
                className="lap-bar"
                style={{ height: `${h}%`, background: getZoneColor(l.hrAvg) }}
                data-pace={`${l.pace}/km`}
              />
            )
          })}
        </div>
        <div className="lap-numbers">
          {run.laps.map((l) => (
            <div key={l.lap} className="lap-number">{l.lap}</div>
          ))}
        </div>

        <div className="run-panel-section-title">LAP DETAILS</div>
        <table className="laps-table">
          <thead>
            <tr>
              <th>Lap</th><th>Time</th><th>Pace</th><th>HR</th><th>Zone</th><th>&#8593;</th><th>&#8595;</th>
            </tr>
          </thead>
          <tbody>
            {run.laps.map((l) => (
              <tr key={l.lap}>
                <td>{l.lap}</td>
                <td>{l.time}</td>
                <td>{l.pace}</td>
                <td>
                  <span className="lap-hr-bar" style={{ width: `${Math.max(4, (l.hrAvg / 200) * 40)}px`, background: getZoneColor(l.hrAvg) }} />
                  {l.hrAvg}
                </td>
                <td style={{ color: getZoneColor(l.hrAvg) }}>{getZoneName(l.hrAvg)}</td>
                <td>{l.ascent}m</td>
                <td>{l.descent}m</td>
              </tr>
            ))}
          </tbody>
        </table>

        {run.coachNotes.length > 0 && (
          <>
            <div className="run-panel-section-title">COACH NOTES</div>
            <div className="coach-notes">
              {run.coachNotes.map((n, i) => (
                <div key={i} className="coach-note">
                  <span className="coach-note-label">{n.label}</span>
                  <span>{n.text}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
