import { createCoachAgent } from '@/lib/agent'
import { createClient } from '@/lib/supabase/server'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { NextRequest } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await req.json()

  // Convert messages to LangChain format
  const langchainMessages = messages.map((msg: { role: string; content: string }) => {
    if (msg.role === 'user') return new HumanMessage(msg.content)
    return new AIMessage(msg.content)
  })

  // Load user context (active plan + recent runs)
  const { data: plan } = await supabase
    .from('plans')
    .select('data')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const { data: runs } = await supabase
    .from('runs')
    .select('data')
    .eq('user_id', user.id)
    .order('run_date', { ascending: false })
    .limit(10)

  // Add context to the conversation if available
  if (plan || (runs && runs.length > 0)) {
    const contextParts: string[] = []
    if (plan) {
      contextParts.push(`Current plan: ${JSON.stringify(plan.data)}`)
    }
    if (runs && runs.length > 0) {
      contextParts.push(`Recent runs (${runs.length}): ${JSON.stringify(runs.map(r => r.data))}`)
    }
    const contextMsg = new HumanMessage(`[System context — do not repeat this to the user]\n${contextParts.join('\n')}`)
    langchainMessages.unshift(contextMsg)
  }

  const agent = createCoachAgent()

  // Stream response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const eventStream = agent.streamEvents(
          { messages: langchainMessages },
          { version: 'v2' }
        )

        let fullResponse = ''

        for await (const event of eventStream) {
          if (event.event === 'on_chat_model_stream') {
            const chunk = event.data?.chunk
            if (chunk?.content && typeof chunk.content === 'string') {
              fullResponse += chunk.content
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`)
              )
            }
          }

          if (event.event === 'on_tool_end') {
            const toolOutput = event.data?.output
            const toolName = event.name
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'tool', name: toolName, result: toolOutput })}\n\n`)
            )

            // If the tool generated a plan, save it
            if (toolName === 'generate_plan' || toolName === 'update_plan') {
              try {
                const planData = JSON.parse(toolOutput)
                if (planData.meta && planData.weeks) {
                  // Deactivate old plans
                  await supabase
                    .from('plans')
                    .update({ is_active: false })
                    .eq('user_id', user.id)

                  // Insert new plan
                  await supabase.from('plans').insert({
                    user_id: user.id,
                    data: planData,
                    is_active: true,
                  })
                }
              } catch {
                // Tool output wasn't a valid plan JSON, that's ok
              }
            }
          }
        }

        // Save messages to chat history
        await supabase.from('chat_messages').insert([
          {
            user_id: user.id,
            role: 'user',
            content: messages[messages.length - 1].content,
          },
          {
            user_id: user.id,
            role: 'assistant',
            content: fullResponse,
          },
        ])

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        )
        controller.close()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
