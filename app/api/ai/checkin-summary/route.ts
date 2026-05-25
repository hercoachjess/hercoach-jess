import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireCoach } from '@/lib/supabase/require-coach'
import type { CheckinSubmission } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const { checkin }: { checkin: CheckinSubmission } = await request.json()

    const prompt = `Summarise this client check-in into 3–5 SHORT bullet points the coach can scan in 5 seconds to remember what happened. Be specific (numbers and direct quotes where helpful) but ruthless about brevity — each bullet under 14 words. Focus on direction-of-change, wins, struggles, and anything to follow up next time. UK English. No fluff, no preamble, no "the client".

Week ${checkin.week_number ?? '?'} check-in:
${JSON.stringify(checkin.payload, null, 2)}
${checkin.body_measurements && Object.keys(checkin.body_measurements).length ? `Body measurements: ${JSON.stringify(checkin.body_measurements)}` : ''}

Respond with a JSON object ONLY, no markdown fences:
{ "summary": ["• Weight 69.8kg — down 0.4kg from last week", "• Nailed nutrition Mon–Fri, social dinner Friday threw off portion control", "..."] }`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let parsed: { summary: string[] }
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 })
    }

    return NextResponse.json({ summary: parsed.summary ?? [] })
  } catch (err) {
    console.error('AI check-in summary error:', err)
    return NextResponse.json({ error: 'Failed to generate summary.' }, { status: 500 })
  }
}
