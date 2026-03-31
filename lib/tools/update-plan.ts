import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { buildPlan } from './plan-engine'

export const updatePlanTool = tool(
  async (input) => {
    // Rebuild the plan with the updated parameters
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
      trainingDaysPerWeek: input.newTrainingDaysPerWeek,
    })

    return JSON.stringify(plan)
  },
  {
    name: 'update_plan',
    description: 'Regenerates the training plan with updated parameters. Use this when the user wants to change their plan — for example changing the number of training days per week, target time, or other parameters. You MUST provide ALL the current plan parameters plus the changed ones. Extract current values from the plan context provided to you.',
    schema: z.object({
      raceName: z.string().describe('Current race name from the plan'),
      raceDate: z.string().describe('Current race date from the plan in ISO format (YYYY-MM-DD)'),
      raceDistance: z.number().describe('Current race distance in km from the plan'),
      targetTime: z.string().describe('Current target finish time from the plan'),
      athleteName: z.string().describe('Athlete name from the plan'),
      age: z.number().optional().describe('Athlete age'),
      maxHR: z.number().optional().describe('Max heart rate'),
      restingHR: z.number().optional().describe('Resting heart rate'),
      experience: z.enum(['beginner', 'intermediate', 'advanced']).describe('Experience level from the plan'),
      currentWeeklyKm: z.number().optional().describe('Current weekly km'),
      newTrainingDaysPerWeek: z.number().describe('The NEW number of training days per week (2-7)'),
    }),
  }
)
