import { z } from 'zod'

export const lapSchema = z.object({
  lap: z.number(),
  time: z.string(),
  pace: z.string(),
  hrAvg: z.number(),
  hrMax: z.number(),
  ascent: z.number(),
  descent: z.number(),
})

export const runSchema = z.object({
  id: z.string(),
  week: z.number(),
  day: z.string(),
  date: z.string(),
  type: z.enum(['z2', 'intervals', 'tempo', 'easy', 'long', 'race']),
  label: z.string(),
  title: z.string(),
  objective: z.string(),
  stats: z.object({
    distance: z.number(),
    time: z.string(),
    pace: z.string(),
    hrAvg: z.number(),
    hrMax: z.number(),
    cadenceAvg: z.number(),
    cadenceMax: z.number(),
    strideLength: z.number(),
    calories: z.number(),
  }),
  elevation: z.object({
    ascent: z.number(),
    descent: z.number(),
  }),
  trainingEffect: z.object({
    aerobic: z.number(),
    anaerobic: z.number(),
  }),
  laps: z.array(lapSchema),
  coachNotes: z.array(z.object({
    label: z.string(),
    text: z.string(),
  })),
})
