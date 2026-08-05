import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCoach } from '@/lib/supabase/require-coach'
import CheckinFeedbackDocument from '@/lib/pdf/CheckinFeedbackDocument'
import type { Client, CheckinSubmission } from '@/types'

// @react-pdf/renderer needs headroom on a cold start; Vercel default is 10s.
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const { clientId, checkinId, feedback }: { clientId: string; checkinId: string; feedback: string } =
      await request.json()

    if (!clientId || !checkinId) {
      return NextResponse.json({ error: 'clientId and checkinId are required.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const [{ data: client }, { data: checkin }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('checkin_submissions').select('*').eq('id', checkinId).single(),
    ])

    if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
    if (!checkin) return NextResponse.json({ error: 'Check-in not found.' }, { status: 404 })

    const typedCheckin = checkin as CheckinSubmission
    // The previous check-in (for the weight-movement snapshot).
    const { data: prev } = await supabase
      .from('checkin_submissions')
      .select('*')
      .eq('client_id', clientId)
      .lt('created_at', typedCheckin.created_at)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Prefer the feedback passed in (what Jess sees on screen); fall back to
    // whatever is saved on the check-in.
    const body = (feedback && feedback.trim()) || typedCheckin.coach_feedback || ''
    if (!body.trim()) {
      return NextResponse.json({ error: 'There is no feedback to export yet.' }, { status: 400 })
    }

    const { renderToBuffer } = await import('@react-pdf/renderer')
    const doc = createElement(CheckinFeedbackDocument, {
      client: client as Client,
      checkin: typedCheckin,
      previousCheckin: (prev as CheckinSubmission | null) ?? null,
      feedback: body,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(doc as any)

    const safeName = (client.full_name as string).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    const filename = `${safeName}-checkin-feedback-week-${typedCheckin.week_number ?? 'x'}.pdf`
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[checkin-feedback pdf] error:', err)
    return NextResponse.json({ error: 'Failed to generate feedback PDF.' }, { status: 500 })
  }
}
