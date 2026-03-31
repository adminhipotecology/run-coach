import { tool } from '@langchain/core/tools'
import { z } from 'zod'

export const updatePlanTool = tool(
  async (input) => {
    return JSON.stringify({
      instruction: 'Modify the training plan based on the given reason',
      input,
      note: 'Return the full updated plan JSON with modifications applied',
    })
  },
  {
    name: 'update_plan',
    description: 'Modifies an existing training plan based on schedule changes, injuries, or progress feedback. Returns the updated plan.',
    schema: z.object({
      reason: z.string().describe('Why the plan needs to change (e.g., "injury", "schedule conflict", "ahead of schedule", "behind on training")'),
      details: z.string().describe('Specific details about what needs to change'),
      currentPlanSummary: z.string().describe('Brief summary of the current plan state'),
    }),
  }
)
