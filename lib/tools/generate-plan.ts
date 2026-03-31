import { tool } from '@langchain/core/tools'
import { z } from 'zod'

export const generatePlanTool = tool(
  async (input) => {
    // The LLM will generate the plan content through its response.
    // This tool structures the request and returns what the LLM should fill.
    return JSON.stringify({
      instruction: 'Generate a complete training plan with the following structure',
      input,
      schema: {
        meta: '{ raceName, raceDate, raceDistance, targetTime, targetPace, createdAt }',
        athlete: '{ name, age, restingHR, maxHR, experience }',
        zones: '[{ name, key, minBpm, maxBpm, barWidth, description }]',
        weeks: '[{ week, title, dates, classes, workouts: [{ day, desc, tag, tagLabel }] }]',
        hydration: '{ phases, raceDay, alerts }',
        nutrition: '{ principles, mealPlans, raceDay }',
      },
    })
  },
  {
    name: 'generate_plan',
    description: 'Generates a complete periodized training plan for the user based on their race goal, fitness level, and available training days. Call this after gathering enough information about the user.',
    schema: z.object({
      raceName: z.string().describe('Name of the race or goal (e.g., "Media Maraton Bogota")'),
      raceDate: z.string().describe('Race date in ISO format (YYYY-MM-DD)'),
      raceDistance: z.number().describe('Race distance in kilometers'),
      targetTime: z.string().describe('Target finish time (e.g., "1:59:59")'),
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
