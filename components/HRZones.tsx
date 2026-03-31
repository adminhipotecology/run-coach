'use client'

import { useEffect, useRef } from 'react'
import type { HRZone } from '@/types'

const ZONE_COLORS: Record<string, string> = {
  z1: 'var(--z1)',
  z2: 'var(--z2)',
  z3: 'var(--z3)',
  z4: 'var(--z4)',
  z5: 'var(--z5)',
}

export default function HRZones({ zones }: { zones: HRZone[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.zone-bar-fill').forEach((bar, i) => {
              setTimeout(() => bar.classList.add('animated'), i * 120)
            })
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="section fade-in" ref={ref}>
      <div className="section-header">
        <span className="section-number">01</span>
        <h2 className="section-title">HR ZONES</h2>
      </div>

      <div className="zones-container">
        {zones.map((zone) => (
          <div key={zone.key} className="zone-row">
            <span className="zone-label" style={{ color: ZONE_COLORS[zone.key] }}>
              {zone.name}
            </span>
            <div className="zone-bar-track">
              <div
                className="zone-bar-fill"
                style={{
                  width: `${zone.barWidth}%`,
                  background: ZONE_COLORS[zone.key],
                }}
              />
            </div>
            <span className="zone-range">
              {zone.maxBpm ? `${zone.minBpm}–${zone.maxBpm} bpm` : `>${zone.minBpm} bpm`}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
