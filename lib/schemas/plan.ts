import { z } from 'zod'

export const hrZoneSchema = z.object({
  name: z.string(),
  key: z.string(),
  minBpm: z.number(),
  maxBpm: z.number().nullable(),
  barWidth: z.number(),
  description: z.string(),
})

export const workoutSchema = z.object({
  day: z.string(),
  desc: z.string(),
  tag: z.enum(['z2', 'intervals', 'tempo', 'easy', 'long', 'race']),
  tagLabel: z.string(),
})

export const planWeekSchema = z.object({
  week: z.number(),
  title: z.string(),
  dates: z.string(),
  classes: z.string(),
  workouts: z.array(workoutSchema),
})

export const planSchema = z.object({
  meta: z.object({
    raceName: z.string(),
    raceDate: z.string(),
    raceDistance: z.number(),
    targetTime: z.string(),
    targetPace: z.string(),
    createdAt: z.string(),
  }),
  athlete: z.object({
    name: z.string(),
    age: z.number().optional(),
    restingHR: z.number().optional(),
    maxHR: z.number().optional(),
    currentWeeklyKm: z.number().optional(),
    experience: z.enum(['beginner', 'intermediate', 'advanced']),
  }),
  zones: z.array(hrZoneSchema),
  weeks: z.array(planWeekSchema),
  hydration: z.object({
    phases: z.array(z.object({
      title: z.string(),
      timing: z.string(),
      icon: z.string(),
      items: z.array(z.object({
        label: z.string(),
        desc: z.string(),
        note: z.string().optional(),
      })),
    })),
    raceDay: z.array(z.object({
      label: z.string(),
      text: z.string(),
    })).optional(),
    alerts: z.array(z.object({ text: z.string() })).optional(),
  }).optional(),
  nutrition: z.object({
    principles: z.array(z.object({
      label: z.string(),
      desc: z.string(),
    })),
    mealPlans: z.array(z.object({
      title: z.string(),
      timing: z.string(),
      items: z.array(z.object({
        label: z.string(),
        desc: z.string(),
        note: z.string().optional(),
      })),
    })),
    raceDay: z.array(z.object({
      label: z.string(),
      text: z.string(),
    })).optional(),
  }).optional(),
})
