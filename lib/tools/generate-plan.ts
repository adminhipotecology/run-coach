import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { buildPlan } from './plan-engine'

export const generatePlanTool = tool(
  async (input) => {
    const plan = buildPlan({
      raceName: input.raceName,
      raceDate: input.raceDate,
      raceDistance: input.raceDistance,
      targetTime: input.targetTime,
      athleteName: input.athleteName,
      age: input.age,
      maxHR: input.maxHR,
      restingHR: input.restingHR,
      experience: input.experience,
      currentWeeklyKm: input.currentWeeklyKm,
      trainingDaysPerWeek: input.trainingDaysPerWeek,
    })

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
      trainingDaysPerWeek: z.number().describe('Available training days per week (2-6)'),
      injuries: z.string().optional().describe('Any current injuries or health considerations'),
      dietaryRestrictions: z.string().optional().describe('Dietary restrictions or preferences'),
    }),
  }
)
