import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CheckinPayload } from '@/types'

/**
 * Public weekly check-in endpoint.
 *
 * Same hardening pattern as /api/onboarding:
 *  - Every code path returns valid JSON.
 *  - Friendly user-facing messages (real Postgres / runtime details stay
 *    in server logs).
 *  - Idempotency: if a check-in for the same client was saved in the
 *    last 5 minutes, treat the resubmit as already-done. Stops double
 *    clicks creating duplicate weekly rows.
 *  - The "update current weight" step is fire-and-forget so it never
 *    blocks the response.
 */
export async function POST(request: NextRequest) {
  try {
    let body: { payload?: CheckinPayload; body_measurements?: unknown; photos?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const payload = body.payload as CheckinPayload | undefined
    const bodyMeasurements =
      body.body_measurements && typeof body.body_measurements === 'object' ? body.body_measurements : null
    const photos: string[] = Array.isArray(body.photos)
      ? (body.photos as unknown[]).filter((u): u is string => typeof u === 'string')
      : []

    if (!payload?.name || !payload?.email) {
      return NextResponse.json({ error: 'Please enter your name and email so Jess can find your file.' }, { status: 400 })
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : String(envErr)
      console.error('[checkin] createAdminClient failed:', msg)
      return NextResponse.json(
        { error: 'The site is temporarily unable to save your check-in. Please try again in a few minutes.' },
        { status: 500 },
      )
    }

    // Find the client by email (case-insensitive)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, created_at')
      .ilike('email', payload.email.trim())
      .limit(1)
      .maybeSingle()

    if (clientError) {
      console.error('[checkin] clients lookup error:', clientError)
      return NextResponse.json(
        { error: "We couldn't look up your file just then. Please try again in a minute, or message Jess." },
        { status: 500 },
      )
    }
    if (!client) {
      return NextResponse.json(
        { error: "We couldn't find a client file matching that email. Please double-check the email or contact Jess." },
        { status: 404 },
      )
    }

    // Idempotency: if a check-in for this client was saved in the last 5
    // minutes, treat this as the same submission (slow connection + retry).
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('checkin_submissions')
      .select('id')
      .eq('client_id', client.id)
      .gte('created_at', fiveMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recent?.id) {
      return NextResponse.json({ success: true, idempotent: true })
    }

    // Calculate week number (capped at 1).
    const weeksCoached = Math.max(
      1,
      Math.floor((Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1,
    )

    const { error: checkinError } = await supabase.from('checkin_submissions').insert({
      client_id: client.id,
      week_number: weeksCoached,
      payload,
      body_measurements: bodyMeasurements ?? {},
      photos,
    })

    if (checkinError) {
      console.error('[checkin] checkin_submissions insert error:', checkinError)
      return NextResponse.json(
        {
          error: "We couldn't save your check-in just then. Please don't resubmit, message Jess and she'll sort it.",
          code: checkinError.code ?? null,
          hint: checkinError.hint ?? null,
          details: checkinError.details ?? null,
        },
        { status: 500 },
      )
    }

    // Update current weight if provided, fire and forget so it can't
    // block or fail the response.
    if (payload.weight_kg != null) {
      supabase
        .from('clients')
        .update({ current_weight_kg: payload.weight_kg })
        .eq('id', client.id)
        .then(({ error }) => {
          if (error) console.error('[checkin] weight update failed (non-fatal):', error)
        })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[checkin] unhandled error:', msg, stack)
    return NextResponse.json(
      { error: "Something went wrong on our side. Please don't resubmit, message Jess and she'll check it landed." },
      { status: 500 },
    )
  }
}
