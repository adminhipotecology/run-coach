'use client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolResults?: { name: string; result: string }[]
}

const TOOL_LABELS: Record<string, string> = {
  generate_plan: 'Plan Generated',
  generate_zones: 'HR Zones Calculated',
  generate_protocols: 'Protocols Created',
  analyze_run: 'Run Analyzed',
  update_plan: 'Plan Updated',
}

export default function ChatMessage({ message }: { message: Message }) {
  return (
    <div className={`chat-message ${message.role}`}>
      <div className="chat-message-avatar">
        {message.role === 'assistant' ? 'RC' : 'You'}
      </div>
      <div>
        <div className="chat-message-bubble">
          {message.content.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        {message.toolResults?.map((tool, i) => (
          <div key={i} className="chat-tool-card">
            <div className="chat-tool-card-title">
              {TOOL_LABELS[tool.name] || tool.name}
            </div>
            <div className="chat-tool-card-body">
              {tool.name === 'generate_plan' && 'Your training plan has been created. View it on your dashboard.'}
              {tool.name === 'generate_zones' && 'Heart rate zones calculated and applied to your plan.'}
              {tool.name === 'generate_protocols' && 'Nutrition and hydration protocols generated.'}
              {tool.name === 'analyze_run' && 'Coach feedback generated for your run.'}
              {tool.name === 'update_plan' && 'Your plan has been updated.'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
