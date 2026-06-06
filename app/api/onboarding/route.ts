import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Public onboarding submission endpoint.
 *
 * Hardened so that:
 *  - Double-submits (slow connection → user clicks twice) don't create
 *    duplicate clients. We look up the existing client by email and
 *    reuse it.
 *  - A recent onboarding submission (< 5 mins) for the same client
 *    returns success without writing again — protects against the same
 *    full submission being POSTed twice.
 *  - The downstream "link enquiry" step doesn't block or fail the
 *    response. Its result is ignored entirely.
 *  - Every code path returns valid JSON. The form-side helper
 *    (lib/safe-submit) handles the case where Vercel's edge layer
 *    returns a plain-text 5xx even when the inserts succeeded.
 */
export async function POST(request: NextRequest) {
  try {
    let body: { payload?: unknown; signed_name?: string; signed_date?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = body.payload
    const signedName: string = (body.signed_name || '').trim()
    const signedDate: string = (body.signed_date || '').trim() || new Date().toISOString().split('T')[0]

    const b = payload?.basics ?? {}
    const firstName: string = (b.first_name || '').trim()
    const email: string = (b.email || '').trim()

    if (!firstName || !email) {
      return NextResponse.json({ error: 'Please enter your first name and email before submitting.' }, { status: 400 })
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : String(envErr)
      console.error('[onboarding] createAdminClient failed:', msg)
      return NextResponse.json(
        { error: 'The site is temporarily unable to save your submission. Please try again in a few minutes, or message Jess directly.' },
        { status: 500 },
      )
    }

    // ── Step 1: Find or create the client row ─────────────────────────
    // If a client with this email exists already, reuse it (prevents
    // duplicate rows from a slow / retried submission).
    let clientId: string | null = null

    const { data: existingClient, error: lookupError } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()

    if (lookupError) {
      console.error('[onboarding] existing-client lookup error:', lookupError)
      // Non-fatal — fall through and try the insert. Worst case is the
      // insert errors and we report it.
    }

    if (existingClient?.id) {
      clientId = existingClient.id
    } else {
      // Approximate DOB from age — Jan 1 of (this year - age)
      let dob: string | null = null
      const ageNum = parseInt(String(b.age), 10)
      if (!isNaN(ageNum) && ageNum > 0) {
        dob = `${new Date().getFullYear() - ageNum}-01-01`
      }

      const startingWeight = parseFloat(b.current_weight_kg) || null
      const heightCm = parseFloat(b.height_cm) || null

      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          full_name: firstName,
          email,
          phone: (b.phone || '').trim(),
          date_of_birth: dob,
          sex: 'Female',
          height_cm: heightCm,
          starting_weight_kg: startingWeight,
          current_weight_kg: startingWeight,
          goal: payload?.goals?.primary_goal || null,
        })
        .select('id')
        .single()

      if (clientError || !newClient) {
        console.error('[onboarding] clients insert error:', clientError)
        return NextResponse.json(
          {
            error: "We couldn't save your details just then. Please try again in a moment — or message Jess and she'll sort it.",
            code: clientError?.code ?? null,
            hint: clientError?.hint ?? null,
            details: clientError?.details ?? null,
          },
          { status: 500 },
        )
      }

      clientId = newClient.id
    }

    if (!clientId) {
      // Should be impossible to reach, but guard so we never return without a JSON body.
      return NextResponse.json(
        { error: "We couldn't save your details. Please try again or message Jess." },
        { status: 500 },
      )
    }

    // ── Step 2: Idempotency window for onboarding_submissions ─────────
    // If a submission was created for this client in the last 5 minutes,
    // treat the second click as already-done.
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentSubmission, error: recentLookupError } = await supabase
      .from('onboarding_submissions')
      .select('id')
      .eq('client_id', clientId)
      .gte('created_at', fiveMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentLookupError) {
      console.error('[onboarding] recent submission lookup error (non-fatal):', recentLookupError)
    }

    if (recentSubmission?.id) {
      return NextResponse.json({ success: true, client_id: clientId, idempotent: true })
    }

    // ── Step 3: Save the onboarding submission ────────────────────────
    const { error: submissionError } = await supabase.from('onboarding_submissions').insert({
      client_id: clientId,
      payload,
      signed_name: signedName,
      signed_date: signedDate,
    })

    if (submissionError) {
      console.error('[onboarding] onboarding_submissions insert error:', submissionError)
      return NextResponse.json(
        {
          error: "We saved your details but couldn't save the full questionnaire. Please don't resubmit — message Jess and she'll sort it.",
          code: submissionError.code ?? null,
          hint: submissionError.hint ?? null,
          details: submissionError.details ?? null,
        },
        { status: 500 },
      )
    }

    // ── Step 4: Link any open enquiry to the new client ───────────────
    // Fire-and-forget — its outcome is irrelevant to the user's success.
    // Errors logged for Jess to see, but the user gets success either way.
    supabase
      .from('enquiries')
      .update({ status: 'converted', client_id: clientId })
      .ilike('email', email)
      .in('status', ['new', 'contacted'])
      .then(({ error }) => {
        if (error) console.error('[onboarding] enquiry link failed (non-fatal):', error)
      })

    return NextResponse.json({ success: true, client_id: clientId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[onboarding] unhandled error:', msg, stack)
    return NextResponse.json(
      { error: "Something went wrong on our side. Please don't resubmit — message Jess and she'll check it landed." },
      { status: 500 },
    )
  }
}
