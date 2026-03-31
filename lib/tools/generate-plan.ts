import { tool } from '@langchain/core/tools'
import { z } from 'zod'

function computeHRZones(maxHR: number, restingHR?: number) {
  const useKarvonen = restingHR != null
  const hrr = restingHR != null ? maxHR - restingHR : 0

  function zone(pctLow: number, pctHigh: number | null) {
    if (useKarvonen && restingHR != null) {
      return {
        min: Math.round(hrr * pctLow + restingHR),
        max: pctHigh != null ? Math.round(hrr * pctHigh + restingHR) : null,
      }
    }
    return {
      min: Math.round(maxHR * pctLow),
      max: pctHigh != null ? Math.round(maxHR * pctHigh) : null,
    }
  }

  return [
    { name: 'Recovery', key: 'z1', ...zone(0.5, 0.65), barWidth: 20, description: 'Very easy effort, active recovery' },
    { name: 'Aerobic', key: 'z2', ...zone(0.65, 0.75), barWidth: 40, description: 'Conversational pace, base building' },
    { name: 'Tempo', key: 'z3', ...zone(0.75, 0.85), barWidth: 60, description: 'Comfortably hard, sustained effort' },
    { name: 'Threshold', key: 'z4', ...zone(0.85, 0.92), barWidth: 80, description: 'Hard effort, lactate threshold' },
    { name: 'VO2max', key: 'z5', ...zone(0.92, null), barWidth: 100, description: 'Max effort, short intervals' },
  ].map((z) => ({ ...z, minBpm: z.min, maxBpm: z.max }))
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Tag = 'z2' | 'intervals' | 'tempo' | 'easy' | 'long' | 'race'

interface WorkoutTemplate {
  day: string
  desc: string
  tag: Tag
  tagLabel: string
}

function generateWeekWorkouts(
  weekNum: number,
  totalWeeks: number,
  daysPerWeek: number,
  targetPaceMinPerKm: number,
  raceDistance: number,
  experience: string,
): WorkoutTemplate[] {
  const workouts: WorkoutTemplate[] = []
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Determine phase
  const buildEnd = Math.floor(totalWeeks * 0.6)
  const peakEnd = Math.floor(totalWeeks * 0.85)
  const isTaper = weekNum > peakEnd
  const isPeak = weekNum > buildEnd && weekNum <= peakEnd
  const isRaceWeek = weekNum === totalWeeks

  // Base weekly distance scales with week and phase
  const easyPace = (targetPaceMinPerKm + 1).toFixed(0) + ':' + ((targetPaceMinPerKm + 1) % 1 * 60).toFixed(0).padStart(2, '0')
  const tempoPace = targetPaceMinPerKm.toFixed(0) + ':' + ((targetPaceMinPerKm % 1) * 60).toFixed(0).padStart(2, '0')

  // Distribute training days
  const restDays = 7 - daysPerWeek
  const trainingDayIndices: number[] = []
  if (daysPerWeek >= 3) trainingDayIndices.push(0, 2, 5) // Mon, Wed, Sat
  if (daysPerWeek >= 4) trainingDayIndices.push(3) // Thu
  if (daysPerWeek >= 5) trainingDayIndices.push(4) // Fri
  if (daysPerWeek >= 6) trainingDayIndices.push(1) // Tue
  trainingDayIndices.sort((a, b) => a - b)

  // Progression factor
  const progressionPct = isTaper ? 0.7 : isPeak ? 1.0 : 0.6 + (weekNum / buildEnd) * 0.4
  const baseLongRunKm = Math.min(raceDistance * (experience === 'beginner' ? 0.8 : 1.0), raceDistance + 2)
  const longRunKm = Math.round(baseLongRunKm * progressionPct * 10) / 10

  for (let i = 0; i < trainingDayIndices.length; i++) {
    const dayIdx = trainingDayIndices[i]
    const dayName = dayNames[dayIdx]
    const isLast = i === trainingDayIndices.length - 1

    if (isRaceWeek && isLast) {
      workouts.push({ day: dayName, desc: `Race day! ${raceDistance}K at target pace`, tag: 'race', tagLabel: 'RACE' })
    } else if (isLast) {
      // Long run
      workouts.push({
        day: dayName,
        desc: `Long run: ${longRunKm}km at easy/Z2 pace`,
        tag: 'long',
        tagLabel: 'LONG',
      })
    } else if (i === 1 && !isTaper) {
      // Quality session
      if (isPeak || weekNum > buildEnd / 2) {
        workouts.push({
          day: dayName,
          desc: weekNum % 2 === 0
            ? `Tempo: 10min warm-up + ${Math.round(20 * progressionPct)}min at tempo pace + 10min cool-down`
            : `Intervals: 10min warm-up + ${Math.round(4 * progressionPct + 2)}x${raceDistance <= 10 ? '800m' : '1000m'} at Z4 (90s rest) + cool-down`,
          tag: weekNum % 2 === 0 ? 'tempo' : 'intervals',
          tagLabel: weekNum % 2 === 0 ? 'TEMPO' : 'INTERVALS',
        })
      } else {
        workouts.push({
          day: dayName,
          desc: `Easy run: ${Math.round(4 * progressionPct + 2)}km at Z2 pace`,
          tag: 'z2',
          tagLabel: 'Z2',
        })
      }
    } else {
      // Easy / recovery
      const km = isTaper ? Math.round(3 * progressionPct + 2) : Math.round(5 * progressionPct + 2)
      workouts.push({
        day: dayName,
        desc: `Easy run: ${km}km at Z2 pace`,
        tag: 'easy',
        tagLabel: 'EASY',
      })
    }
  }

  // Add rest days
  for (let d = 0; d < 7; d++) {
    if (!trainingDayIndices.includes(d)) {
      // Only show rest for clarity
    }
  }

  return workouts
}

export const generatePlanTool = tool(
  async (input) => {
    const {
      raceName, raceDate, raceDistance, targetTime,
      athleteName, age, maxHR: inputMaxHR, restingHR,
      experience, currentWeeklyKm, trainingDaysPerWeek,
    } = input

    // Calculate derived values
    const maxHR = inputMaxHR || (age ? 220 - age : 190)
    const zones = computeHRZones(maxHR, restingHR)

    // Parse target time to calculate pace
    const timeParts = targetTime.split(':').map(Number)
    let totalMinutes: number
    if (timeParts.length === 3) {
      totalMinutes = timeParts[0] * 60 + timeParts[1] + timeParts[2] / 60
    } else {
      totalMinutes = timeParts[0] + timeParts[1] / 60
    }
    const targetPaceMinPerKm = totalMinutes / raceDistance
    const paceMin = Math.floor(targetPaceMinPerKm)
    const paceSec = Math.round((targetPaceMinPerKm - paceMin) * 60)
    const targetPace = `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`

    // Calculate weeks until race — if the date is in the past or invalid,
    // assume the user meant N weeks from today
    const today = new Date()
    let race = new Date(raceDate)
    if (isNaN(race.getTime()) || race <= today) {
      // Fallback: place race 12 weeks from today
      race = new Date(today)
      race.setDate(race.getDate() + 12 * 7)
    }
    const actualRaceDate = race.toISOString().split('T')[0]
    const totalWeeks = Math.max(4, Math.round((race.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)))

    // Find the Monday of the current week as start
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7))
    const startStr = startDate.toISOString().split('T')[0]

    // Generate weeks
    const weeks = []
    for (let w = 1; w <= totalWeeks; w++) {
      const weekStart = addDays(startStr, (w - 1) * 7)
      const weekEnd = addDays(weekStart, 6)

      const buildEnd = Math.floor(totalWeeks * 0.6)
      const peakEnd = Math.floor(totalWeeks * 0.85)
      let phase: string
      let classes: string
      if (w === totalWeeks) { phase = 'Race Week'; classes = 'race' }
      else if (w > peakEnd) { phase = 'Taper'; classes = 'taper' }
      else if (w > buildEnd) { phase = 'Peak'; classes = 'peak' }
      else { phase = 'Build'; classes = 'build' }

      weeks.push({
        week: w,
        title: `${phase} — Week ${w}`,
        dates: `${formatDate(weekStart)} – ${formatDate(weekEnd)}`,
        classes,
        workouts: generateWeekWorkouts(w, totalWeeks, trainingDaysPerWeek, targetPaceMinPerKm, raceDistance, experience),
      })
    }

    const plan = {
      meta: {
        raceName,
        raceDate: actualRaceDate,
        raceDistance,
        targetTime,
        targetPace,
        createdAt: new Date().toISOString(),
      },
      athlete: {
        name: athleteName,
        age: age || null,
        restingHR: restingHR || null,
        maxHR,
        currentWeeklyKm: currentWeeklyKm || null,
        experience,
      },
      zones,
      weeks,
    }

    return JSON.stringify(plan)
  },
  {
    name: 'generate_plan',
    description: 'Generates a complete periodized training plan for the user based on their race goal, fitness level, and available training days. Call this after gathering enough information about the user.',
    schema: z.object({
      raceName: z.string().describe('Name of the race or goal (e.g., "10K Training")'),
      raceDate: z.string().describe('Race date in ISO format (YYYY-MM-DD)'),
      raceDistance: z.number().describe('Race distance in kilometers'),
      targetTime: z.string().describe('Target finish time (e.g., "55:00" for 55 minutes, or "1:59:59")'),
      athleteName: z.string().describe('Athlete name'),
      age: z.number().optional().describe('Athlete age'),
      maxHR: z.number().optional().describe('Max heart rate (measured or estimated as 220-age)'),
      restingHR: z.number().optional().describe('Resting heart rate'),
      experience: z.enum(['beginner', 'intermediate', 'advanced']).describe('Running experience level'),
      currentWeeklyKm: z.number().optional().describe('Current weekly running distance in km'),
      trainingDaysPerWeek: z.number().describe('Available training days per week (3-6)'),
      injuries: z.string().optional().describe('Any current injuries or health considerations'),
      dietaryRestrictions: z.string().optional().describe('Dietary restrictions or preferences'),
    }),
  }
)
