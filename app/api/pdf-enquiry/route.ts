import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GUIDE_NAMES } from '@/lib/guides'

/**
 * Public guide / PDF purchase enquiry endpoint.
 *
 * Same hardening pattern as /api/enquiry:
 *  - Every path returns valid JSON.
 *  - Friendly user-facing messages, real errors logged server-side.
 *  - Idempotency: a recent enquiry from the same email for the same guide
 *    (< 5 mins) is treated as already-saved (double-click guard).
 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim()
    const guide = String(body.guide ?? '').trim()
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Please share your name and email so Jess can send it over.' },
        { status: 400 },
      )
    }
    if (!guide || !GUIDE_NAMES.includes(guide)) {
      return NextResponse.json({ error: 'Please pick which guide you’d like.' }, { status: 400 })
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (envErr) {
      console.error('[pdf-enquiry] createAdminClient failed:', envErr instanceof Error ? envErr.message : envErr)
      return NextResponse.json(
        { error: 'The site is temporarily unable to save your request. Please try again in a few minutes.' },
        { status: 500 },
      )
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('pdf_enquiries')
      .select('id')
      .ilike('email', email)
      .eq('guide', guide)
      .gte('created_at', fiveMinAgo)
      .limit(1)
      .maybeSingle()

    if (recent?.id) {
      return NextResponse.json({ success: true, idempotent: true })
    }

    const { error: insertError } = await supabase.from('pdf_enquiries').insert({
      name,
      email,
      phone: body.phone ? String(body.phone).trim() || null : null,
      guide,
      message: body.message ? String(body.message).trim() || null : null,
    })
    if (insertError) {
      console.error('[pdf-enquiry] insert error:', insertError)
      return NextResponse.json(
        { error: "We couldn't save your request just then. Please try again in a moment." },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[pdf-enquiry] unhandled error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: "Something went wrong on our side. Please don't resubmit, message Jess directly." },
      { status: 500 },
    )
  }
}
