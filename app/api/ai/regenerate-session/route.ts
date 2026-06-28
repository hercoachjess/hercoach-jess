import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import { extractJson } from '@/lib/ai/extract-json'
import type { TrainingSession, CheckinSubmission } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Swap out a single training session in place (e.g. "swap Wednesday's
 * upper push for a glute-focused session"). The other sessions on the
 * plan are passed in as context so the regenerated session offers
 * genuine variety and doesn't duplicate existing focus areas.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized

  try {
    const {
      clientName,
      goal,
      level,
      intensity,
      gymAccess,
      injuries,
      exerciseDislikes,
      currentSession,
      otherSessions,
      instructions,
      recentCheckins = [],
    }: {
      clientName: string
      goal: string
      level: string
      intensity?: string
      gymAccess?: string
      injuries?: string
      exerciseDislikes?: string
      currentSession: TrainingSession
      otherSessions: TrainingSession[]
      instructions?: string
      recentCheckins?: CheckinSubmission[]
    } = await request.json()

    if (!currentSession) {
      return NextResponse.json({ error: 'currentSession is required.' }, { status: 400 })
    }

    const checkinContext = recentCheckins.length
      ? `\nRECENT CHECK-IN FEEDBACK (adapt if the client mentioned soreness, low energy, or anything else relevant):
${recentCheckins
  .slice(0, 2)
  .map((c) => {
    const p = c.payload ?? {}
    const lines: string[] = []
    lines.push(`Week ${c.week_number ?? '?'} (${c.created_at?.slice(0, 10) ?? ''})`)
    if (p.training_feel) lines.push(`  How training felt: ${p.training_feel}`)
    if (p.training_intensity) lines.push(`  Intensity: ${p.training_intensity}`)
    if (p.discomfort) lines.push(`  Discomfort / pain: ${p.discomfort}`)
    if (p.prs) lines.push(`  PBs / improvements: ${p.prs}`)
    if (p.energy) lines.push(`  Energy: ${p.energy}`)
    return lines.join('\n')
  })
  .join('\n\n')}\n`
      : ''

    const coachStyle = await getCoachStyleBlock()
    const prompt = coachStyle + `You are Jess, an HCPC-registered Registered Dietitian and coach. The coach wants to swap out a single training session in ${clientName}'s programme for a different one. Generate ONE new session that fits the same slot.

Client goal: ${goal}
Experience level: ${level}
Intensity preference: ${intensity || 'moderate'}
Equipment / location: ${gymAccess || 'Gym'}
Injuries / limitations: ${injuries || 'None reported'}
Exercises / movements the client does NOT want: ${exerciseDislikes || 'None recorded'}
${checkinContext}
THE SESSION TO REPLACE (keep the same day slot):
${JSON.stringify(currentSession, null, 2)}

THE OTHER SESSIONS ON THE PROGRAMME (do NOT duplicate their focus, bring genuine variety):
${JSON.stringify(otherSessions, null, 2)}

${instructions?.trim() ? `COACH INSTRUCTIONS FOR THIS REGENERATION:\n${instructions.trim()}\n` : ''}
DO-NOT-PROGRAMME RULE, CRITICAL:
Injuries / dislikes are absolute. The new session must contain ZERO movements that touch a contraindicated joint or replicate a disliked pattern.

Rules:
- Keep the same day slot ("day" stays the same).
- The "focus" can change (that's often why she's regenerating).
- Match the experience level + intensity preference + equipment available.
- Sets × reps format: "3 × 8–10".
- Brief notes for technique cues where useful.

Respond with a JSON object ONLY, no markdown fences:
{
  "session": {
    "day": "${currentSession.day}",
    "focus": "...",
    "exercises": [
      { "name": "...", "sets": 3, "reps": "8–10", "notes": "..." }
    ]
  }
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const stopReason = message.stop_reason

    const parsed = extractJson<{ session: TrainingSession }>(text)
    if (!parsed?.session || !Array.isArray(parsed.session.exercises)) {
      console.error('[regenerate-session] parse failed. stop_reason=%s len=%d', stopReason, text.length)
      return NextResponse.json(
        { error: stopReason === 'max_tokens' ? 'AI ran out of room. Try again.' : "Couldn't read the AI response. Try again." },
        { status: 500 },
      )
    }

    return NextResponse.json({ session: parsed.session })
  } catch (err) {
    console.error('[regenerate-session] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to regenerate session.' },
      { status: 500 },
    )
  }
}
