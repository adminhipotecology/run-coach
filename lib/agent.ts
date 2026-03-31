import { ChatAnthropic } from '@langchain/anthropic'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
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
  const model = new ChatAnthropic({
    modelName: 'claude-sonnet-4-20250514',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.7,
    maxTokens: 4096,
  })

  const agent = createReactAgent({
    llm: model,
    tools,
    messageModifier: COACH_SYSTEM_PROMPT,
  })

  return agent
}
