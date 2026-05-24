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
      currentSessions,
      currentWeeklyProgression,
      currentCoachNotes,
      instructions,
    }: {
      clientName: string
      goal: string
      level: string
      daysPerWeek: number
      intensity?: string
      trainingStyle?: string
      programmeLengthWeeks?: number
      gymAccess?: string
      injuries?: string
      currentSessions: TrainingSession[]
      currentWeeklyProgression?: WeeklyProgression[]
      currentCoachNotes: string
      instructions: string
    } = await request.json()
    const lengthWeeks = [1, 4, 8, 12].includes(programmeLengthWeeks || 1) ? (programmeLengthWeeks as number) : 1

    if (!instructions || !instructions.trim()) {
      return NextResponse.json({ error: 'Please describe what to change.' }, { status: 400 })
    }

    const prompt = `You are Jess, an HCPC-registered Registered Dietitian and coach. You are revising an existing training programme for ${clientName} based on the coach's instructions. Apply ONLY the changes requested — keep everything else the same, including session structure, exercise selection and progressive overload logic — unless the instructions specifically ask otherwise.

Client goal: ${goal}
Experience level: ${level}
Training days / week: ${daysPerWeek}
Intensity preference: ${intensity || 'moderate'} (light = RPE 5–6 / moderate = RPE 7–8 / high = RPE 8–9)
Training style: ${trainingStyle || 'preserve current split unless instructions say otherwise'}
Equipment / location: ${gymAccess || 'Gym'}
Injuries / limitations to respect: ${injuries || 'None reported'}

Programme length: ${lengthWeeks} week${lengthWeeks > 1 ? 's' : ''}

CURRENT TRAINING PROGRAMME (JSON):
${JSON.stringify({ sessions: currentSessions, weekly_progression: currentWeeklyProgression ?? [], coach_notes: currentCoachNotes }, null, 2)}

COACH INSTRUCTIONS:
${instructions.trim()}

Rules:
- Apply only the changes requested — preserve everything else
- The "sessions" array is Week 1's detailed plan; "weekly_progression" describes weeks 2–${lengthWeeks} (focus + modifications + intensity_target). If the instructions target a specific later week ("make week 5 lighter") modify only that entry in weekly_progression.
- Maintain balanced volume across muscle groups unless explicitly changing it
- Respect injuries / limitations at all times — never programme contraindicated movements
- Keep day labels (Mon/Tue/etc) and overall week structure unless asked to change them
- Sets, reps and notes should remain coaching-appropriate (progressive overload, RIR/RPE-aware)

Respond with a JSON object ONLY, no markdown fences, in this exact structure:
{
  "sessions": [
    {
      "day": "Monday",
      "focus": "Lower body",
      "exercises": [
        { "name": "Back squat", "sets": 4, "reps": "6–8", "notes": "Leave 2 reps in tank" }
      ]
    }
  ],
  "weekly_progression": [
    { "week": 2, "focus": "Accumulation", "modifications": "+2.5 kg on main lifts, RPE 7.5", "intensity_target": "RPE 7.5" }
  ],
  "coach_notes": "Brief note on what changed and why"
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
    console.error('AI revise training plan error:', err)
    return NextResponse.json({ error: 'Failed to revise training plan.' }, { status: 500 })
  }
}
