import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import { extractJson } from '@/lib/ai/extract-json'
import type { CheckinSubmission, OnboardingPayload, Client, ClientNote } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface PriorReply {
  week_number: number | null
  date: string
  reply: string
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const {
      client,
      checkin,
      previousCheckin,
      onboardingPayload,
      priorReplies = [],
      priorSummaries = [],
    }: {
      client: Pick<Client, 'full_name' | 'goal' | 'primary_goal_kcal' | 'protein_target_g'> & { id?: string }
      checkin: CheckinSubmission
      previousCheckin: CheckinSubmission | null
      onboardingPayload: OnboardingPayload | null
      priorReplies?: PriorReply[]
      priorSummaries?: { week_number: number | null; date: string; bullets: string[] }[]
    } = await request.json()

    // Pull the most recent quick notes Jess has logged on this client so
    // the reply can reference what she has noticed offline. Best-effort,
    // never blocks the reply if it fails.
    let quickNotes: ClientNote[] = []
    if (client.id) {
      try {
        const supabase = createAdminClient()
        const { data } = await supabase
          .from('client_notes')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(6)
        if (data) quickNotes = data as ClientNote[]
      } catch (err) {
        console.error('[checkin-reply] client_notes fetch failed (non-fatal):', err)
      }
    }

    const firstName = (client.full_name || '').split(' ')[0] || client.full_name

    // Build the "what Jess has already said" block. This is the single biggest
    // lever for stopping the reply sounding AI and stopping it repeating.
    const priorBlock = priorReplies.length
      ? `WHAT JESS HAS ALREADY SAID TO THIS CLIENT (most recent first, DO NOT repeat phrasing, openers, or advice from these; build on them like a human coach who remembers what they wrote last week):

${priorReplies
  .map(
    (r, i) =>
      `--- Reply ${i + 1} (Week ${r.week_number ?? '?'} · ${r.date}) ---\n${r.reply.trim()}`,
  )
  .join('\n\n')}`
      : 'No prior replies on record, this is the first one. Treat that naturally; do not say "welcome" or "first check-in" unless the check-in itself indicates that.'

    const summariesBlock = priorSummaries.length
      ? `RECENT WEEKS AT A GLANCE (for continuity, refer back to specifics naturally if useful):

${priorSummaries
  .map(
    (s) =>
      `Week ${s.week_number ?? '?'} (${s.date}):\n${s.bullets.map((b) => `  • ${b}`).join('\n')}`,
  )
  .join('\n\n')}`
      : ''

    const quickNotesBlock = quickNotes.length
      ? `\nJESS'S OWN NOTES ON THIS CLIENT (private observations she has jotted, most recent first, weave in naturally if relevant, never quote verbatim):

${quickNotes.map((n) => `${n.created_at.slice(0, 10)}: ${n.body}`).join('\n')}
`
      : ''

    const coachStyle = await getCoachStyleBlock()
    const prompt = coachStyle + `You are Jess writing to ${firstName}. Jess is an HCPC-registered Registered Dietitian running 1:1 coaching. Your job: write the reply she would send for this week's check-in, in her voice, to a real human she knows.

CLIENT CONTEXT
- Name: ${client.full_name} (use "${firstName}")
- Goal: ${client.goal || 'not set'}
- Daily targets: ${client.primary_goal_kcal || 'not set'} kcal, ${client.protein_target_g || 'not set'}g protein
${onboardingPayload?.health_screening?.injuries ? `- Injuries to respect: ${onboardingPayload.health_screening.injuries}` : ''}
${onboardingPayload?.health_screening?.conditions?.filter((c) => c && !c.toLowerCase().includes('none')).join(', ') ? `- Diagnosed conditions: ${onboardingPayload.health_screening.conditions.filter((c) => c && !c.toLowerCase().includes('none')).join(', ')}` : ''}
${onboardingPayload?.health_screening?.food_relationship ? `- Food relationship: ${onboardingPayload.health_screening.food_relationship}` : ''}

THIS WEEK'S CHECK-IN (Week ${checkin.week_number}):
${JSON.stringify(checkin.payload, null, 2)}
${checkin.body_measurements && Object.keys(checkin.body_measurements).length ? `Body measurements: ${JSON.stringify(checkin.body_measurements)}` : ''}

${previousCheckin ? `LAST WEEK'S CHECK-IN (Week ${previousCheckin.week_number}, for direction-of-travel only):
${JSON.stringify(previousCheckin.payload, null, 2)}
${previousCheckin.body_measurements && Object.keys(previousCheckin.body_measurements).length ? `Body measurements: ${JSON.stringify(previousCheckin.body_measurements)}` : ''}` : ''}

${priorBlock}

${summariesBlock}
${quickNotesBlock}
CRITICAL. DO NOT SOUND LIKE AI. NO CLIENT SHOULD EVER SUSPECT THIS WAS NOT WRITTEN BY JESS.

Banned phrases and patterns (do NOT use any of these, or anything like them):
- "I want to acknowledge", "I want to start by", "I just want to say"
- "absolutely", "incredible", "amazing", "fantastic", "phenomenal", "truly", "wonderful journey"
- "I love that you", "I love hearing", "It's so great to see"
- "let's dive in", "let's unpack", "let's break this down"
- "it's clear that", "it sounds like you're really", "what stands out to me is"
- "remember,", "consistency is key", "trust the process", "small steps", "non-scale victories" (overused coach-speak)
- "navigate", "lean into", "tap into", "unlock", "elevate"
- Em dashes used for dramatic pauses (— like this —). Use commas, full stops, or parentheses instead.
- Numbered lists or section headings (no "1.", "2.", no "**Nutrition:**" headers). Flowing prose only.
- Closing with "You've got this!" or "Keep going!" or "Proud of you!"
- Signing off "Jess x" / "Love, Jess", leave it unsigned, Jess adds her own signoff.

Banned structural tells:
- Don't open with a feeling-summary sentence ("It sounds like this week was…"). Open with a specific thing they said or did.
- Don't pad the start with throat-clearing. First sentence does work.
- Don't summarise the whole check-in back at them, they wrote it, they know.
- Don't give 3 perfectly-balanced suggestions; real coaches pick the one or two things that actually matter this week.

WHAT TO DO INSTEAD
- Write like a real person texting a long-ish reply on WhatsApp. UK English. Contractions. Sentence fragments are fine occasionally.
- Pick the one most important thing from this check-in and lead with it. The rest is texture.
- If the prior replies show a phrase, opener, or piece of advice Jess has already given, don't say it again. Pick a different angle or move forward from it. If you gave them a focus last week, reference how it landed.
- 2–4 paragraphs is plenty. Quality over coverage.
- Mention specifics from their check-in (the actual food, the actual session, the actual number). Generic = AI.
- If they asked a question, answer it directly and practically.
- If anything reads as eating-disorder-adjacent, low energy availability, or out-of-clinical-scope (a diagnosed condition needing GP / specialist), flag it sensitively in the reply AND in the concerns array.

Voice anchor: warm, no-nonsense, evidence-based, dry humour occasionally. She's a friend who happens to be a dietitian. She doesn't perform warmth, she just is warm.

Respond with a JSON object ONLY, no markdown fences:
{
  "reply": "The reply, with paragraph breaks as \\n\\n. No signoff.",
  "concerns": ["Optional clinical concerns for coach attention, empty array if none"]
}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const parsed = extractJson<{ reply: string; concerns?: string[] }>(text)
    if (!parsed?.reply) {
      console.error('[checkin-reply] parse failed. stop=%s len=%d', message.stop_reason, text.length)
      return NextResponse.json(
        { error: "Couldn't read the AI response. Try again." },
        { status: 500 },
      )
    }

    return NextResponse.json({
      reply: parsed.reply,
      concerns: parsed.concerns ?? [],
    })
  } catch (err) {
    console.error('[checkin-reply] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to draft reply.' },
      { status: 500 },
    )
  }
}
