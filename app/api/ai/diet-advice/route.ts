import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachStyleBlock } from '@/lib/ai/coach-style'
import { extractJson } from '@/lib/ai/extract-json'
import type { DietSubmission, Client, OnboardingPayload, ClientNote } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Draft (or revise) AI advice for a client's weekly food tracker.
 *
 * body: { clientId, dietSubmissionId, mode: 'draft' | 'revise',
 *         currentDraft?: string, instructions?: string }
 *
 * "draft" mode reads the whole picture (client goal, macros, onboarding
 * dislikes/allergies, quick notes, this week's tracker) and returns
 * fresh advice.
 *
 * "revise" mode takes the current draft plus Jess's amendment
 * instructions ("make it warmer", "focus on her sleep") and returns
 * a revised version.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized

  try {
    const {
      clientId,
      dietSubmissionId,
      mode = 'draft',
      currentDraft = '',
      instructions = '',
    }: {
      clientId: string
      dietSubmissionId: string
      mode?: 'draft' | 'revise'
      currentDraft?: string
      instructions?: string
    } = await request.json()

    if (!clientId || !dietSubmissionId) {
      return NextResponse.json({ error: 'clientId and dietSubmissionId are required.' }, { status: 400 })
    }
    if (mode === 'revise' && !instructions.trim()) {
      return NextResponse.json({ error: 'Please describe what to change.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const [
      { data: client },
      { data: onboarding },
      { data: dietSub },
      { data: notes },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase
        .from('onboarding_submissions')
        .select('payload')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('diet_submissions').select('*').eq('id', dietSubmissionId).single(),
      supabase.from('client_notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(6),
    ])

    if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
    if (!dietSub) return NextResponse.json({ error: 'Diet submission not found.' }, { status: 404 })

    const c = client as Client
    const firstName = (c.full_name || '').split(' ')[0] || c.full_name
    const submission = dietSub as DietSubmission
    const ob = (onboarding?.payload as OnboardingPayload | undefined) ?? null

    const foodPrefs = ob?.food_preferences
    const health = ob?.health_screening
    const dietaryLine = [
      foodPrefs?.diet_type,
      foodPrefs?.foods_disliked ? `Dislikes: ${foodPrefs.foods_disliked}` : null,
      foodPrefs?.allergies ? `Allergies: ${foodPrefs.allergies}` : null,
      c.food_dislikes_override ? `Extra dislikes: ${c.food_dislikes_override}` : null,
    ].filter(Boolean).join(' | ') || 'No specific preferences recorded'

    const conditions = health?.conditions?.filter((cn) => cn && !cn.toLowerCase().includes('none')).join(', ') || ''
    const notesText = (notes as ClientNote[] | null)?.map((n) => `${n.created_at.slice(0, 10)}: ${n.body}`).join('\n') || ''

    const coachStyle = await getCoachStyleBlock()

    let prompt: string
    if (mode === 'revise') {
      prompt = coachStyle + `You are Jess. Revise the following draft advice for ${firstName}'s weekly food tracker. Apply ONLY the change requested. Keep everything else. UK English. No em dashes. No AI tells. Voice: warm, no-nonsense, dry humour occasionally.

COACH INSTRUCTIONS:
${instructions.trim()}

CURRENT DRAFT:
${currentDraft.trim()}

Respond with a JSON object ONLY:
{ "advice": "The revised advice, with paragraph breaks as \\n\\n. No signoff." }`
    } else {
      prompt = coachStyle + `You are Jess writing advice for ${firstName} after reading their weekly food tracker. Give her a first-draft, honest, actionable read of the week. She will edit before sending. UK English. Voice: warm, no-nonsense, evidence-based, dry humour occasionally. NO em dashes. NO AI tells (no "absolutely", "let's dive in", "you've got this", "navigate", "lean into", "unlock", "elevate").

CLIENT
Name: ${c.full_name} (use "${firstName}")
Goal: ${c.goal || 'not set'}
Daily targets: ${c.primary_goal_kcal ?? '(unset)'} kcal, ${c.protein_target_g ?? '(unset)'}g protein, ${c.fat_target_g ?? '(unset)'}g fat, ${c.carbs_target_g ?? '(unset)'}g carbs
Dietary context: ${dietaryLine}
${conditions ? `Diagnosed conditions: ${conditions}` : ''}
${health?.food_relationship ? `Food relationship: ${health.food_relationship}` : ''}

WEEK OF ${submission.week_start} FOOD TRACKER:
${JSON.stringify(submission.payload, null, 2)}

${notesText ? `JESS'S OWN NOTES ON THIS CLIENT (private, weave in naturally if relevant):
${notesText}
` : ''}

WRITE 3 to 4 short paragraphs, plain prose, no headings, no bullets. Cover roughly:
1. What jumps out first. One honest observation about the week's pattern (protein consistency, meal timing gaps, drink volume, snacking pattern, whatever is most obvious).
2. Where the week aligns with her goal and macros, and where it drifts.
3. One or two specific, practical things to shift this coming week. Reference actual foods or slots from the tracker, not generic advice.
4. Anything that flagged for you clinically (very low intake, disordered patterns, alcohol, meds interactions, out-of-scope stuff). If nothing did, don't force it.

Respond with a JSON object ONLY:
{ "advice": "The advice, with paragraph breaks as \\n\\n. No signoff." }`
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const parsed = extractJson<{ advice: string }>(text)
    if (!parsed?.advice) {
      console.error('[diet-advice] parse failed. stop=%s len=%d', message.stop_reason, text.length)
      return NextResponse.json({ error: "Couldn't read the AI response. Try again." }, { status: 500 })
    }

    return NextResponse.json({ advice: parsed.advice })
  } catch (err) {
    console.error('[diet-advice] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate advice.' }, { status: 500 })
  }
}
