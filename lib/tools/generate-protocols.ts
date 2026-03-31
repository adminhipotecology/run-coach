import { tool } from '@langchain/core/tools'
import { z } from 'zod'

export const generateProtocolsTool = tool(
  async (input) => {
    return JSON.stringify({
      instruction: 'Generate hydration and nutrition protocols for this training plan',
      input,
      expectedOutput: {
        hydration: {
          phases: '[{ title, timing, icon, items: [{ label, desc, note? }] }]',
          raceDay: '[{ label, text }]',
          alerts: '[{ text }]',
        },
        nutrition: {
          principles: '[{ label, desc }]',
          mealPlans: '[{ title, timing, items: [{ label, desc, note? }] }]',
          raceDay: '[{ label, text }]',
        },
      },
    })
  },
  {
    name: 'generate_protocols',
    description: 'Generates nutrition and hydration protocols tailored to the training plan, race distance, and any dietary restrictions.',
    schema: z.object({
      raceDistance: z.number().describe('Race distance in km'),
      longestRunKm: z.number().describe('Longest training run in the plan (km)'),
      dietaryRestrictions: z.string().optional().describe('Any dietary restrictions'),
      healthNotes: z.string().optional().describe('Health considerations (e.g., migraine history, cramps)'),
    }),
  }
)
