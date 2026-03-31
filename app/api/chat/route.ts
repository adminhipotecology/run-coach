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

  // Ensure profile exists (plans table references profiles)
  await supabase
    .from('profiles')
    .upsert({ id: user.id, email: user.email }, { onConflict: 'id' })

  // Load user context (active plan + recent runs)
  const { data: plan } = await supabase
    .from('plans')
    .select('data')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

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

  // Stream response with retry for transient errors
  const MAX_RETRIES = 3
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let lastError: unknown = null

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
        }

        try {
          // Use .stream() with multiple stream modes:
          // - "messages" for token-by-token LLM output
          // - "updates" for tool results and state changes
          const eventStream = await agent.stream(
            { messages: langchainMessages },
            { streamMode: ['messages', 'updates'] }
          )

          let fullResponse = ''

          for await (const event of eventStream) {
            // Multi-mode streaming yields [mode, chunk] tuples
            const [mode, chunk] = event as [string, unknown]

            if (mode === 'messages') {
              // Messages mode yields [messageChunk, metadata] tuples
              const tuple = chunk as [Record<string, unknown>, Record<string, unknown>]
              const messageChunk = tuple[0]
              if (!messageChunk) continue

              let text = ''
              const content = messageChunk.content
              if (typeof content === 'string' && content) {
                text = content
              } else if (Array.isArray(content)) {
                for (const block of content) {
                  if (block && typeof block === 'object' && 'type' in block && block.type === 'text' && 'text' in block && typeof block.text === 'string') {
                    text += block.text
                  }
                }
              }

              if (text) {
                fullResponse += text
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'token', content: text })}\n\n`)
                )
              }
            }

            if (mode === 'updates') {
              // Updates are keyed by node name. Tool outputs come from the "tools" node.
              const update = chunk as Record<string, unknown>
              if (!update) continue

              // The tools node output contains a messages array of ToolMessage instances
              const toolsNode = update['tools'] as { messages?: unknown[] } | undefined
              if (toolsNode?.messages) {
                for (const msg of toolsNode.messages) {
                  const toolMsg = msg as Record<string, unknown>
                  // ToolMessage instances have .name and .content
                  const toolName = toolMsg.name as string | undefined
                  const toolContent = toolMsg.content as string | undefined
                  if (!toolName || !toolContent) continue

                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'tool', name: toolName, result: toolContent })}\n\n`)
                  )

                  // If the tool generated a plan, save it to the database
                  if (toolName === 'generate_plan' || toolName === 'update_plan') {
                    try {
                      const planData = JSON.parse(toolContent)
                      if (planData.meta && planData.weeks) {
                        await supabase
                          .from('plans')
                          .update({ is_active: false })
                          .eq('user_id', user.id)

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
          return // Success — exit retry loop
        } catch (error) {
          lastError = error
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error('[chat] Attempt', attempt + 1, 'failed:', errorMsg, error)

          const isOverloaded =
            errorMsg.includes('overloaded') ||
            errorMsg.includes('529') ||
            errorMsg.includes('rate')

          if (!isOverloaded || attempt === MAX_RETRIES - 1) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  message: isOverloaded
                    ? 'The AI service is temporarily overloaded. Please try again in a moment.'
                    : errorMsg,
                })}\n\n`
              )
            )
            controller.close()
            return
          }
        }
      }

      const fallbackMsg = lastError instanceof Error ? lastError.message : 'Unknown error'
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', message: fallbackMsg })}\n\n`)
      )
      controller.close()
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
