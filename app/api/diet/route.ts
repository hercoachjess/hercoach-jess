import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DietPayload } from '@/types'

/**
 * Public weekly food tracker endpoint.
 *
 * GET  /api/diet?email=&week_start=  → returns existing submission
 *                                       (payload + photos) so the form
 *                                       can pre-fill when the client
 *                                       revisits the link mid-week.
 *
 * POST /api/diet                    → upserts by (client_id, week_start)
 *
 * Same hardening pattern as /api/checkin: friendly errors, real
 * server-side logging, safe against malformed bodies.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const email = url.searchParams.get('email')?.trim() || ''
    const weekStart = url.searchParams.get('week_start')?.trim() || ''
    if (!email || !weekStart) {
      return NextResponse.json({ error: 'email and week_start are required.' }, { status: 400 })
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : String(envErr)
      console.error('[diet:GET] createAdminClient failed:', msg)
      return NextResponse.json({ error: 'The site is temporarily unavailable. Try again shortly.' }, { status: 500 })
    }

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()
    if (clientErr) {
      console.error('[diet:GET] client lookup error:', clientErr)
      return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 })
    }
    if (!client) {
      // Return empty rather than erroring — the form falls through to a blank week.
      return NextResponse.json(null)
    }

    const { data: existing } = await supabase
      .from('diet_submissions')
      .select('payload, photos')
      .eq('client_id', client.id)
      .eq('week_start', weekStart)
      .maybeSingle()

    return NextResponse.json(existing ?? null)
  } catch (err) {
    console.error('[diet:GET] unhandled:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: { payload?: DietPayload; week_start?: string; photos?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const payload = body.payload
    const weekStart = (body.week_start || '').trim()
    const photos: string[] = Array.isArray(body.photos)
      ? (body.photos as unknown[]).filter((u): u is string => typeof u === 'string')
      : []

    if (!payload?.name || !payload?.email) {
      return NextResponse.json({ error: 'Please add your name and email so Jess can find your file.' }, { status: 400 })
    }
    if (!weekStart) {
      return NextResponse.json({ error: 'Missing week reference. Please refresh and try again.' }, { status: 400 })
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : String(envErr)
      console.error('[diet:POST] createAdminClient failed:', msg)
      return NextResponse.json({ error: 'The site is temporarily unable to save your entries. Please try again shortly.' }, { status: 500 })
    }

    // Match client by email.
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', payload.email.trim())
      .limit(1)
      .maybeSingle()
    if (clientErr) {
      console.error('[diet:POST] client lookup error:', clientErr)
      return NextResponse.json({ error: "We couldn't look up your file. Please try again shortly." }, { status: 500 })
    }
    if (!client) {
      return NextResponse.json(
        { error: "We couldn't find a client file matching that email. Double-check the email or message Jess." },
        { status: 404 },
      )
    }

    const { error: upsertErr } = await supabase
      .from('diet_submissions')
      .upsert(
        {
          client_id: client.id,
          week_start: weekStart,
          payload,
          photos,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,week_start' },
      )

    if (upsertErr) {
      console.error('[diet:POST] upsert error:', upsertErr)
      return NextResponse.json(
        {
          error: "We couldn't save your entries. Please don't resubmit twice, message Jess if it happens again.",
          code: upsertErr.code ?? null,
          hint: upsertErr.hint ?? null,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[diet:POST] unhandled:', msg)
    return NextResponse.json({ error: "Something went wrong. Please don't resubmit, Jess will confirm it landed." }, { status: 500 })
  }
}
