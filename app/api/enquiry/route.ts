import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Public coaching enquiry endpoint.
 *
 * Same hardening pattern as the other public submission routes:
 *  - Every path returns valid JSON.
 *  - Friendly user-facing messages with real errors logged server-side.
 *  - Idempotency: a recent enquiry from the same email (< 5 mins) is
 *    treated as already-saved.
 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const firstName = String(body.first_name ?? '').trim()
    const email = String(body.email ?? '').trim()
    if (!firstName || !email) {
      return NextResponse.json(
        { error: 'Please share your first name and email so Jess can reach you.' },
        { status: 400 },
      )
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : String(envErr)
      console.error('[enquiry] createAdminClient failed:', msg)
      return NextResponse.json(
        { error: 'The site is temporarily unable to save your enquiry. Please try again in a few minutes.' },
        { status: 500 },
      )
    }

    // Idempotency: if an enquiry from this email landed in the last 5
    // minutes, treat this as the same submission (double-click guard).
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('enquiries')
      .select('id')
      .ilike('email', email)
      .gte('created_at', fiveMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recent?.id) {
      return NextResponse.json({ success: true, idempotent: true })
    }

    // If an existing client already has this email, link the enquiry so
    // the coach sees the history alongside the client file.
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()

    const insertPayload: Record<string, unknown> = {
      first_name: firstName,
      last_name: body.last_name ? String(body.last_name).trim() || null : null,
      email,
      phone: body.phone ? String(body.phone).trim() || null : null,
      goal: body.goal ? String(body.goal) : null,
      about: body.about ? String(body.about).trim() || null : null,
      hear_from: body.hear_from ? String(body.hear_from) : null,
      best_contact: body.best_contact ? String(body.best_contact) : null,
      client_id: existingClient?.id ?? null,
    }

    const { error: insertError } = await supabase.from('enquiries').insert(insertPayload)
    if (insertError) {
      console.error('[enquiry] insert error:', insertError)
      return NextResponse.json(
        {
          error: "We couldn't save your enquiry just then. Please try again in a moment, or message Jess directly.",
          code: insertError.code ?? null,
          hint: insertError.hint ?? null,
          details: insertError.details ?? null,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[enquiry] unhandled error:', msg)
    return NextResponse.json(
      { error: "Something went wrong on our side. Please don't resubmit — message Jess directly." },
      { status: 500 },
    )
  }
}
