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
      currentSessions,
      currentWeeklyProgression,
      currentCoachNotes,
      instructions,
      recentCheckins = [],
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
      exerciseDislikes?: string
      currentSessions: TrainingSession[]
      currentWeeklyProgression?: WeeklyProgression[]
      currentCoachNotes: string
      instructions: string
      recentCheckins?: CheckinSubmission[]
    } = await request.json()
    const lengthWeeks = [1, 4, 8, 12].includes(programmeLengthWeeks || 1) ? (programmeLengthWeeks as number) : 1

    if (!instructions || !instructions.trim()) {
      return NextResponse.json({ error: 'Please describe what to change.' }, { status: 400 })
    }

    const coachStyle = await getCoachStyleBlock()
    const prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian and coach. You are revising an existing training programme for ${clientName} based on the coach's instructions. Apply ONLY the changes requested — keep everything else the same, including session structure, exercise selection and progressive overload logic — unless the instructions specifically ask otherwise.

Client goal: ${goal}
Experience level: ${level}
Training days / week: ${daysPerWeek}
Intensity preference: ${intensity || 'moderate'} (light = RPE 5–6 / moderate = RPE 7–8 / high = RPE 8–9)
Training style: ${trainingStyle || 'preserve current split unless instructions say otherwise'}
Equipment / location: ${gymAccess || 'Gym'}
Injuries / limitations to respect: ${injuries || 'None reported'}
Exercises / movements the client does NOT want: ${exerciseDislikes || 'None recorded'}

DO-NOT-PROGRAMME RULE — CRITICAL:
The "Injuries / limitations" and "Exercises the client does NOT want" lists are absolute. NEVER include any exercise that hits a contraindicated joint, replicates a disliked movement pattern, or otherwise causes the client distress — even if the coach instructions don't explicitly forbid it. If the current programme already includes one, this is your chance to swap it for an equivalent that respects the limitation.

Programme length: ${lengthWeeks} week${lengthWeeks > 1 ? 's' : ''}

CURRENT TRAINING PROGRAMME (JSON):
${JSON.stringify({ sessions: currentSessions, weekly_progression: currentWeeklyProgression ?? [], coach_notes: currentCoachNotes }, null, 2)}
${
  recentCheckins.length
    ? `\nRECENT CHECK-IN FEEDBACK (most recent first — adapt the revision to what's actually happening for this client):
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
    return lines.join('\n')
  })
  .join('\n\n')}\n`
    : ''
}
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
      max_tokens: 5000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const stopReason = message.stop_reason

    const parsed = extractJson<{ sessions: TrainingSession[]; weekly_progression?: WeeklyProgression[]; coach_notes?: string }>(text)
    if (!parsed || !Array.isArray(parsed.sessions)) {
      console.error('[revise-training-plan] parse failed. stop_reason=%s len=%d', stopReason, text.length)
      const reason =
        stopReason === 'max_tokens'
          ? 'The AI ran out of room before finishing the revision. Try a smaller change.'
          : "Couldn't read the AI response. Try again."
      return NextResponse.json({ error: reason, stop_reason: stopReason }, { status: 500 })
    }

    return NextResponse.json({
      sessions: parsed.sessions,
      weekly_progression: parsed.weekly_progression ?? [],
      coach_notes: parsed.coach_notes || '',
    })
  } catch (err) {
    console.error('[revise-training-plan] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to revise training plan.' },
      { status: 500 },
    )
  }
}
