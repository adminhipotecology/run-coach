import { tool } from '@langchain/core/tools'
import { z } from 'zod'

export const analyzeRunTool = tool(
  async (input) => {
    return JSON.stringify({
      instruction: 'Analyze this run and generate coach notes',
      input,
      expectedOutput: {
        coachNotes: '[{ label: string, text: string }]',
        fields: ['FC (heart rate analysis)', 'Ritmo (pace analysis)', 'Cadencia (cadence)', 'Distancia', 'Progresion (improvement vs plan)'],
      },
    })
  },
  {
    name: 'analyze_run',
    description: 'Analyzes a completed run and generates coaching feedback notes. Call this after a Garmin file has been parsed.',
    schema: z.object({
      distance: z.number().describe('Distance in km'),
      time: z.string().describe('Total time (e.g., "47:30")'),
      pace: z.string().describe('Average pace (e.g., "6:45")'),
      hrAvg: z.number().describe('Average heart rate'),
      hrMax: z.number().describe('Max heart rate'),
      cadenceAvg: z.number().describe('Average cadence SPM'),
      objective: z.string().describe('The workout objective from the training plan'),
      targetZone: z.string().optional().describe('Target HR zone for this workout'),
      laps: z.array(z.object({
        lap: z.number(),
        pace: z.string(),
        hrAvg: z.number(),
      })).optional().describe('Lap-by-lap data'),
    }),
  }
)
