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

    const supabase = createAdminClient()

    // Find the client by email (case-insensitive)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, created_at')
      .ilike('email', payload.email.trim())
      .single()

    if (clientError || !client) {
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
      console.error('Checkin insert error:', checkinError)
      return NextResponse.json({ error: 'Failed to save check-in.' }, { status: 500 })
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
    console.error('Checkin route error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
