export interface PlanMeta {
  raceName: string
  raceDate: string
  raceDistance: number
  targetTime: string
  targetPace: string
  createdAt: string
}

export interface Athlete {
  name: string
  age?: number
  restingHR?: number
  maxHR?: number
  currentWeeklyKm?: number
  experience: 'beginner' | 'intermediate' | 'advanced'
}

export interface HRZone {
  name: string
  key: string
  minBpm: number
  maxBpm: number | null
  barWidth: number
  description: string
}

export interface Workout {
  day: string
  desc: string
  tag: 'z2' | 'intervals' | 'tempo' | 'easy' | 'long' | 'race'
  tagLabel: string
}

export interface PlanWeek {
  week: number
  title: string
  dates: string
  classes: string
  workouts: Workout[]
}

export interface HydrationPhase {
  title: string
  timing: string
  icon: string
  items: { label: string; desc: string; note?: string }[]
}

export interface NutritionMealPlan {
  title: string
  timing: string
  items: { label: string; desc: string; note?: string }[]
}

export interface Plan {
  meta: PlanMeta
  athlete: Athlete
  zones: HRZone[]
  weeks: PlanWeek[]
  hydration?: {
    phases: HydrationPhase[]
    raceDay?: { label: string; text: string }[]
    alerts?: { text: string }[]
  }
  nutrition?: {
    principles: { label: string; desc: string }[]
    mealPlans: NutritionMealPlan[]
    raceDay?: { label: string; text: string }[]
  }
}

export interface LapData {
  lap: number
  time: string
  pace: string
  hrAvg: number
  hrMax: number
  ascent: number
  descent: number
}

export interface CoachNote {
  label: string
  text: string
}

export interface RunStats {
  distance: number
  time: string
  pace: string
  hrAvg: number
  hrMax: number
  cadenceAvg: number
  cadenceMax: number
  strideLength: number
  calories: number
}

export interface Run {
  id: string
  week: number
  day: string
  date: string
  type: 'z2' | 'intervals' | 'tempo' | 'easy' | 'long' | 'race'
  label: string
  title: string
  objective: string
  stats: RunStats
  elevation: { ascent: number; descent: number }
  trainingEffect: { aerobic: number; anaerobic: number }
  laps: LapData[]
  coachNotes: CoachNote[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  metadata?: {
    toolName?: string
    toolResult?: unknown
  }
  createdAt: string
}
