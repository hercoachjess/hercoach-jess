import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = body.payload
    const signedName: string = body.signed_name || ''
    const signedDate: string = body.signed_date || new Date().toISOString().split('T')[0]

    const b = payload?.basics ?? {}
    if (!b.first_name || !b.email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Approximate DOB from age — Jan 1 of (this year - age)
    let dob: string | null = null
    const ageNum = parseInt(String(b.age), 10)
    if (!isNaN(ageNum) && ageNum > 0) {
      dob = `${new Date().getFullYear() - ageNum}-01-01`
    }

    const startingWeight = parseFloat(b.current_weight_kg) || null
    const heightCm = parseFloat(b.height_cm) || null

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        full_name: b.first_name,
        email: b.email,
        phone: b.phone || '',
        date_of_birth: dob,
        sex: 'Female', // HerCoach Jess serves women — default; coach can change in dashboard
        height_cm: heightCm,
        starting_weight_kg: startingWeight,
        current_weight_kg: startingWeight,
        goal: payload?.goals?.primary_goal || null,
      })
      .select('id')
      .single()

    if (clientError) {
      console.error('Client insert error:', clientError)
      return NextResponse.json({ error: 'Failed to create client record.' }, { status: 500 })
    }

    const { error: submissionError } = await supabase.from('onboarding_submissions').insert({
      client_id: client.id,
      payload,
      signed_name: signedName,
      signed_date: signedDate,
    })

    if (submissionError) {
      console.error('Submission insert error:', submissionError)
      return NextResponse.json({ error: 'Failed to save onboarding submission.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, client_id: client.id })
  } catch (err) {
    console.error('Onboarding route error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
