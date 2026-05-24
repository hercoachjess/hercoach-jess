import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const firstName = String(body.first_name ?? '').trim()
    const email = String(body.email ?? '').trim()
    if (!firstName || !email) {
      return NextResponse.json({ error: 'First name and email are required.' }, { status: 400 })
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : String(envErr)
      console.error('[enquiry] createAdminClient failed:', msg)
      return NextResponse.json({ error: `Server is misconfigured. ${msg}` }, { status: 500 })
    }

    // If an existing client already has this email, link the enquiry so the
    // coach sees the history alongside the client file.
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()

    const insertPayload: Record<string, unknown> = {
      first_name: firstName,
      last_name: body.last_name?.toString().trim() || null,
      email,
      phone: body.phone?.toString().trim() || null,
      goal: body.goal?.toString() || null,
      about: body.about?.toString().trim() || null,
      hear_from: body.hear_from?.toString() || null,
      best_contact: body.best_contact?.toString() || null,
      client_id: existingClient?.id ?? null,
    }

    const { error: insertError } = await supabase.from('enquiries').insert(insertPayload)
    if (insertError) {
      console.error('[enquiry] insert error:', insertError)
      return NextResponse.json(
        { error: `Failed to save enquiry: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[enquiry] unhandled error:', msg)
    return NextResponse.json({ error: `Enquiry failed: ${msg}` }, { status: 500 })
  }
}
