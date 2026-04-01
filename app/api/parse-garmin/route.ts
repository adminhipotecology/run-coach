import { createClient } from '@/lib/supabase/server'
import { parseFitFile, parseCsvFile } from '@/lib/garmin-parser'
import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

interface WorkoutSelection {
  week: number
  day: string
  weekTitle: string
  workoutDesc: string
  workoutTag: string
  workoutTagLabel: string
}

/**
 * Given the parsed run data, the selected workout, and the user's active plan,
 * ask the model to analyze the run against that specific workout and generate
 * coach notes + feedback.
 */
async function analyzeAndStructureRun(
  parsedRun: {
    stats: { distance: number; time: string; pace: string; hrAvg: number; hrMax: number; cadenceAvg: number; cadenceMax: number; strideLength: number; calories: number }
    elevation: { ascent: number; descent: number }
    trainingEffect: { aerobic: number; anaerobic: number }
    laps: { lap: number; time: string; pace: string; hrAvg: number; hrMax: number; ascent: number; descent: number }[]
    date: string
  },
  workout: WorkoutSelection,
  plan: Record<string, unknown> | null,
) {
  const model = new ChatAnthropic({
    modelName: 'claude-sonnet-4-20250514',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.4,
    maxTokens: 2048,
  })

  const systemPrompt = `You are RunCoach, an expert AI running coach. You analyze completed runs and provide coaching feedback.

The user has selected a specific workout from their plan to assign this run to. Use the selected week, day, and workout details provided — do NOT override them.

You MUST respond with valid JSON only — no markdown, no code fences, no extra text. The JSON must match this structure exactly:

{
  "type": "<one of: z2, intervals, tempo, easy, long, race>",
  "label": "<short label like 'Easy Run' or 'Tempo Session'>",
  "title": "<descriptive title using the week title, e.g. 'Build Week 1 — Easy Run'>",
  "objective": "<what this workout aimed to achieve based on the plan description>",
  "coachNotes": [
    { "label": "FC", "text": "<heart rate analysis vs target zone for this workout type>" },
    { "label": "Ritmo", "text": "<pace analysis and consistency>" },
    { "label": "Cadencia", "text": "<cadence feedback>" },
    { "label": "Distancia", "text": "<distance vs planned distance>" },
    { "label": "Progresión", "text": "<overall progression and what's next>" }
  ],
  "feedback": "<2-3 sentence summary for the user about how the run went and what to focus on next>"
}`

  const userContent = `Analyze this completed run for the following planned workout:

SELECTED WORKOUT:
- Week ${workout.week}: ${workout.weekTitle}
- Day: ${workout.day}
- Planned workout: ${workout.workoutDesc}
- Type: ${workout.workoutTag} (${workout.workoutTagLabel})

RUN DATA:
${JSON.stringify(parsedRun, null, 2)}

${plan ? `FULL TRAINING PLAN (for context on progression):\n${JSON.stringify(plan, null, 2)}` : ''}

Remember: respond with ONLY valid JSON, no other text.`

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userContent),
  ])

  const text = typeof response.content === 'string'
    ? response.content
    : Array.isArray(response.content)
      ? response.content.filter((b): b is { type: 'text'; text: string } => typeof b === 'object' && b !== null && 'type' in b && b.type === 'text').map(b => b.text).join('')
      : ''

  return JSON.parse(text)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read the selected workout from the form
    const workout: WorkoutSelection = {
      week: parseInt(formData.get('week') as string) || 1,
      day: (formData.get('day') as string) || 'Mon',
      weekTitle: (formData.get('weekTitle') as string) || '',
      workoutDesc: (formData.get('workoutDesc') as string) || '',
      workoutTag: (formData.get('workoutTag') as string) || 'easy',
      workoutTagLabel: (formData.get('workoutTagLabel') as string) || 'EASY',
    }

    const fileName = file.name.toLowerCase()
    let parsedRun

    if (fileName.endsWith('.fit')) {
      const buffer = await file.arrayBuffer()
      parsedRun = await parseFitFile(buffer)
    } else if (fileName.endsWith('.csv')) {
      const text = await file.text()
      parsedRun = parseCsvFile(text)
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload a .fit or .csv file.' },
        { status: 400 }
      )
    }

    // Load the user's active plan for context
    const { data: planRow } = await supabase
      .from('plans')
      .select('data')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    const plan = planRow?.data ?? null

    // Ask the model to analyze the run against the selected workout
    const analysis = await analyzeAndStructureRun(parsedRun, workout, plan)

    // Build the complete Run record using the user-selected week/day
    const runRecord = {
      id: crypto.randomUUID(),
      week: workout.week,
      day: workout.day,
      date: parsedRun.date,
      type: analysis.type,
      label: analysis.label,
      title: analysis.title,
      objective: analysis.objective,
      stats: parsedRun.stats,
      elevation: parsedRun.elevation,
      trainingEffect: parsedRun.trainingEffect,
      laps: parsedRun.laps,
      coachNotes: analysis.coachNotes,
    }

    // Save to the runs table
    const { error: insertError } = await supabase.from('runs').insert({
      user_id: user.id,
      run_date: parsedRun.date,
      data: runRecord,
    })

    if (insertError) {
      console.error('[parse-garmin] Failed to save run:', insertError)
      return NextResponse.json(
        { error: 'Run was parsed but failed to save. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      run: runRecord,
      feedback: analysis.feedback,
    })
  } catch (error) {
    console.error('[parse-garmin] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to parse file'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
