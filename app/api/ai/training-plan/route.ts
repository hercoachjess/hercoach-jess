import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { TrainingSession } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const {
      clientName,
      goal,
      level,
      daysPerWeek,
      gymAccess,
      injuries,
      trainingGoals,
    }: {
      clientName: string
      goal: string
      level: string
      daysPerWeek: number
      gymAccess: string
      injuries: string
      trainingGoals: string
    } = await request.json()

    const prompt = `You are Jess, an online fitness coach and HCPC-registered Registered Dietitian. Draft a weekly training programme for client ${clientName}.

Overall goal: ${goal}
Experience level: ${level}
Training days per week: ${daysPerWeek}
Equipment / gym access: ${gymAccess || 'Full gym'}
Injuries / limitations: ${injuries || 'None'}
Training goals: ${trainingGoals || goal}

Rules:
- Use evidence-based programming: progressive overload, balanced push/pull/legs volume
- Match exercise selection to experience level and available equipment
- Include rest days appropriately
- Sets × reps format: e.g. "3 × 8–10"
- Include brief notes for any technique cues or beginner modifications
- If injuries are listed, adapt around them and add a modification note

Respond with a JSON object ONLY, no markdown fences:
{
  "sessions": [
    {
      "day": "Monday",
      "focus": "Upper body push",
      "exercises": [
        { "name": "Barbell bench press", "sets": 4, "reps": "6–8", "notes": "Control the descent" },
        ...
      ]
    },
    ...rest days as { "day": "Wednesday", "focus": "Rest", "exercises": [] }...
  ],
  "coach_notes": "Optional overall note about the programme"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let parsed: { sessions: TrainingSession[]; coach_notes?: string }
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 })
    }

    return NextResponse.json({ sessions: parsed.sessions, coach_notes: parsed.coach_notes || '' })
  } catch (err) {
    console.error('AI training plan error:', err)
    return NextResponse.json({ error: 'Failed to generate training plan.' }, { status: 500 })
  }
}
