import { createAgent } from 'langchain'
import { COACH_SYSTEM_PROMPT } from './prompts'
import { generatePlanTool } from './tools/generate-plan'
import { generateZonesTool } from './tools/generate-zones'
import { generateProtocolsTool } from './tools/generate-protocols'
import { analyzeRunTool } from './tools/analyze-run'
import { updatePlanTool } from './tools/update-plan'

const tools = [
  generatePlanTool,
  generateZonesTool,
  generateProtocolsTool,
  analyzeRunTool,
  updatePlanTool,
]

export function createCoachAgent() {
  return createAgent({
    model: 'anthropic:claude-sonnet-4-20250514',
    tools,
    systemPrompt: COACH_SYSTEM_PROMPT,
  })
}
