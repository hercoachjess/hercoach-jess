import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CheckinPayload } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payload: CheckinPayload = body.payload

    if (!payload?.name || !payload?.email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : String(envErr)
      console.error('[checkin] createAdminClient failed:', msg)
      return NextResponse.json(
        { error: `Server is misconfigured. ${msg}` },
        { status: 500 }
      )
    }

    // Find the client by email (case-insensitive)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, created_at')
      .ilike('email', payload.email.trim())
      .single()

    if (clientError || !client) {
      if (clientError) console.error('[checkin] clients lookup error:', clientError)
      return NextResponse.json(
        { error: 'No client found with that email address. Please contact your coach.' },
        { status: 404 }
      )
    }

    // Calculate week number
    const weeksCoached = Math.max(
      1,
      Math.floor((Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1
    )

    // Insert check-in submission
    const { error: checkinError } = await supabase.from('checkin_submissions').insert({
      client_id: client.id,
      week_number: weeksCoached,
      payload,
    })

    if (checkinError) {
      console.error('[checkin] checkin_submissions insert error:', checkinError)
      return NextResponse.json(
        {
          error: `Failed to save check-in: ${checkinError.message}`,
          code: checkinError.code ?? null,
          hint: checkinError.hint ?? null,
          details: checkinError.details ?? null,
        },
        { status: 500 }
      )
    }

    // Update current weight if provided
    if (payload.weight_kg != null) {
      await supabase
        .from('clients')
        .update({ current_weight_kg: payload.weight_kg })
        .eq('id', client.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[checkin] unhandled error:', msg, stack)
    return NextResponse.json(
      { error: `Check-in submission failed: ${msg}` },
      { status: 500 }
    )
  }
}
