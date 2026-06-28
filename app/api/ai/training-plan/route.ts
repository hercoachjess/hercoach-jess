import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import { extractJson } from '@/lib/ai/extract-json'
import type { TrainingSession, WeeklyProgression, CheckinSubmission } from '@/types'

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
      exerciseDislikes,
      trainingGoals,
      recentCheckins = [],
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
      exerciseDislikes?: string
      trainingGoals: string
      recentCheckins?: CheckinSubmission[]
    } = await request.json()
    const lengthWeeks = [1, 4, 8, 12].includes(programmeLengthWeeks || 1) ? (programmeLengthWeeks as number) : 1

    // Pull the most actionable bits out of recent check-ins so the AI
    // can respond to "shoulder still feels sore", "sessions felt heavy",
    // "sleep dropped" etc rather than programming in a vacuum.
    const checkinContext = recentCheckins.length
      ? `\nRECENT CHECK-IN FEEDBACK (most recent first, adapt the programme to what's actually happening for this client):
${recentCheckins
  .slice(0, 2)
  .map((c) => {
    const p = c.payload ?? {}
    const lines: string[] = []
    lines.push(`Week ${c.week_number ?? '?'} (${c.created_at?.slice(0, 10) ?? ''})`)
    if (p.training_sessions) lines.push(`  Sessions: ${p.training_sessions}`)
    if (p.training_feel) lines.push(`  How training felt: ${p.training_feel}`)
    if (p.training_intensity) lines.push(`  Intensity overall: ${p.training_intensity}`)
    if (p.discomfort) lines.push(`  Discomfort / pain: ${p.discomfort}`)
    if (p.prs) lines.push(`  PBs / improvements: ${p.prs}`)
    if (p.sleep_quality) lines.push(`  Sleep: ${p.sleep_quality}`)
    if (p.energy) lines.push(`  Energy: ${p.energy}`)
    if (p.stress_level) lines.push(`  Stress: ${p.stress_level}`)
    if (p.hardest_part) lines.push(`  Hardest part: ${p.hardest_part}`)
    return lines.join('\n')
  })
  .join('\n\n')}
`
      : ''

    const coachStyle = await getCoachStyleBlock()
    const prompt = coachStyle + `You are Jess, an online fitness coach and HCPC-registered Registered Dietitian. Draft a ${lengthWeeks}-week training programme for client ${clientName}.

Overall goal: ${goal}
Experience level: ${level}
Training days per week: ${daysPerWeek}
Intensity preference: ${intensity || 'moderate'} (light = RPE 5–6 / moderate = RPE 7–8 / high = RPE 8–9)
Training style: ${trainingStyle || 'coach to choose the appropriate split for goal + days per week'}
Programme length: ${lengthWeeks} week${lengthWeeks > 1 ? 's' : ''}
Equipment / gym access: ${gymAccess || 'Full gym'}
Injuries / limitations: ${injuries || 'None'}
Exercises / movements the client does NOT want: ${exerciseDislikes || 'None recorded'}
Training goals: ${trainingGoals || goal}
${checkinContext}
DO-NOT-PROGRAMME RULE, CRITICAL:
The "Injuries / limitations" and "Exercises the client does NOT want" lists above are absolute. NEVER include any exercise that targets a contraindicated joint, replicates a movement pattern the client dislikes, or causes the client distress. Examples:
- If they dislike burpees → no burpees, no burpee variations, no thrusters as a substitute either
- If they dislike running → no running, no jump rope-as-cardio if jumping is the issue; offer cycling/rowing instead
- If knee injury → no deep squats, lunges or jumping; substitute hip hinge / glute bridge / leg press to safe ROM
- If shoulder injury → no overhead pressing, no upright rows, no behind-neck pulldowns
If a programme typically uses one of these movements, swap to an equivalent that respects the limitation.

Rules:
- Output the WEEK 1 detailed sessions as the "sessions" array
- ${lengthWeeks > 1 ? `Output a "weekly_progression" array describing weeks 2–${lengthWeeks}: focus, modifications (e.g. "+2.5 kg on main lifts, +1 rep on accessories"), intensity_target. Include a deload week at the appropriate point (typically week 4, 8 or 12 depending on length).` : 'Leave "weekly_progression" as []'}
- Use evidence-based programming: progressive overload, balanced push/pull/legs volume
- Match exercise selection to experience level and available equipment
- Honour the requested training style, if "Push / Pull / Legs" is specified, structure the week accordingly; if a specific split is requested, use it
- Match overall session difficulty to the requested intensity
- Include progressive overload guidance in coach_notes (e.g. "+2.5 kg or +1 rep per week on main lifts, RIR 2")
- Include rest days appropriately
- Sets × reps format: e.g. "3 × 8–10"
- Include brief notes for any technique cues or beginner modifications
- If recent check-in feedback mentioned discomfort, low energy, or that sessions felt heavy, adapt the programme, drop volume / intensity slightly, add a deload, or swap loaded movements for safer variations. Briefly reference WHY in coach_notes.

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
      max_tokens: 5000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const stopReason = message.stop_reason

    const parsed = extractJson<{ sessions: TrainingSession[]; weekly_progression?: WeeklyProgression[]; coach_notes?: string }>(text)
    if (!parsed || !Array.isArray(parsed.sessions)) {
      console.error(
        '[training-plan] JSON parse failed. stop_reason=%s raw length=%d. First 400 chars:\n%s',
        stopReason,
        text.length,
        text.slice(0, 400),
      )
      const reason =
        stopReason === 'max_tokens'
          ? 'The AI ran out of room before finishing the programme. Try again, or generate a shorter programme (1 or 4 weeks) first.'
          : "Couldn't read the AI response. Try again."
      return NextResponse.json({ error: reason, stop_reason: stopReason }, { status: 500 })
    }

    return NextResponse.json({
      sessions: parsed.sessions,
      weekly_progression: parsed.weekly_progression ?? [],
      coach_notes: parsed.coach_notes || '',
    })
  } catch (err) {
    console.error('[training-plan] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate training plan.' },
      { status: 500 },
    )
  }
}
