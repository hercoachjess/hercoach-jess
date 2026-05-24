import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import type { TrainingSession, WeeklyProgression } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const {
      clientName,
      goal,
      level,
      daysPerWeek,
      intensity,
      trainingStyle,
      programmeLengthWeeks,
      gymAccess,
      injuries,
      trainingGoals,
    }: {
      clientName: string
      goal: string
      level: string
      daysPerWeek: number
      intensity?: string
      trainingStyle?: string
      programmeLengthWeeks?: number
      gymAccess: string
      injuries: string
      trainingGoals: string
    } = await request.json()
    const lengthWeeks = [1, 4, 8, 12].includes(programmeLengthWeeks || 1) ? (programmeLengthWeeks as number) : 1

    const prompt = `You are Jess, an online fitness coach and HCPC-registered Registered Dietitian. Draft a ${lengthWeeks}-week training programme for client ${clientName}.

Overall goal: ${goal}
Experience level: ${level}
Training days per week: ${daysPerWeek}
Intensity preference: ${intensity || 'moderate'} (light = RPE 5–6 / moderate = RPE 7–8 / high = RPE 8–9)
Training style: ${trainingStyle || 'coach to choose the appropriate split for goal + days per week'}
Programme length: ${lengthWeeks} week${lengthWeeks > 1 ? 's' : ''}
Equipment / gym access: ${gymAccess || 'Full gym'}
Injuries / limitations: ${injuries || 'None'}
Training goals: ${trainingGoals || goal}

Rules:
- Output the WEEK 1 detailed sessions as the "sessions" array
- ${lengthWeeks > 1 ? `Output a "weekly_progression" array describing weeks 2–${lengthWeeks}: focus, modifications (e.g. "+2.5 kg on main lifts, +1 rep on accessories"), intensity_target. Include a deload week at the appropriate point (typically week 4, 8 or 12 depending on length).` : 'Leave "weekly_progression" as []'}
- Use evidence-based programming: progressive overload, balanced push/pull/legs volume
- Match exercise selection to experience level and available equipment
- Honour the requested training style — if "Push / Pull / Legs" is specified, structure the week accordingly; if a specific split is requested, use it
- Match overall session difficulty to the requested intensity
- Include progressive overload guidance in coach_notes (e.g. "+2.5 kg or +1 rep per week on main lifts, RIR 2")
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
        { "name": "Barbell bench press", "sets": 4, "reps": "6–8", "notes": "Control the descent" }
      ]
    }
  ],
  "weekly_progression": [
    { "week": 2, "focus": "Accumulation", "modifications": "+2.5 kg on main lifts, same accessories, RPE 7→7.5", "intensity_target": "RPE 7.5" }
  ],
  "coach_notes": "Optional overall note about the programme + progressive overload guidance"
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let parsed: { sessions: TrainingSession[]; weekly_progression?: WeeklyProgression[]; coach_notes?: string }
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 })
    }

    return NextResponse.json({
      sessions: parsed.sessions,
      weekly_progression: parsed.weekly_progression ?? [],
      coach_notes: parsed.coach_notes || '',
    })
  } catch (err) {
    console.error('AI training plan error:', err)
    return NextResponse.json({ error: 'Failed to generate training plan.' }, { status: 500 })
  }
}
