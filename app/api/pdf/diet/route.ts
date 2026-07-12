import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import DietWeekDocument from '@/lib/pdf/DietWeekDocument'
import type { DietSubmission } from '@/types'

// PDF rendering on a cold start easily exceeds Vercel's 10s default.
export const maxDuration = 60

/**
 * Public "generate diet week PDF" endpoint.
 *
 * No requireCoach guard: the client hits this after saving their
 * week to share it back to Jess. Access is scoped by (email +
 * week_start); we look up the client by email (case-insensitive) and
 * return the PDF for their own week only. Same email-based access
 * pattern as /api/checkin.
 *
 * The PDF is uploaded to the plan-pdfs bucket (public paths, UUID
 * filenames) so it can be shared via WhatsApp / email as a link.
 */
export async function POST(request: NextRequest) {
  try {
    let body: { email?: string; week_start?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const email = (body.email || '').trim()
    const weekStart = (body.week_start || '').trim()
    if (!email || !weekStart) {
      return NextResponse.json({ error: 'Email and week are required.' }, { status: 400 })
    }

    let supabase
    try {
      supabase = createAdminClient()
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : String(envErr)
      console.error('[pdf/diet] createAdminClient failed:', msg)
      return NextResponse.json({ error: 'The site is temporarily unavailable. Try again shortly.' }, { status: 500 })
    }

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, full_name')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()
    if (clientErr) {
      console.error('[pdf/diet] client lookup error:', clientErr)
      return NextResponse.json({ error: 'Lookup failed. Message Jess if it keeps happening.' }, { status: 500 })
    }
    if (!client) {
      return NextResponse.json({ error: "We couldn't find your file. Double-check the email you used above." }, { status: 404 })
    }

    const { data: submission, error: subErr } = await supabase
      .from('diet_submissions')
      .select('*')
      .eq('client_id', client.id)
      .eq('week_start', weekStart)
      .maybeSingle()
    if (subErr) {
      console.error('[pdf/diet] submission lookup error:', subErr)
      return NextResponse.json({ error: "Couldn't load this week." }, { status: 500 })
    }
    if (!submission) {
      return NextResponse.json({ error: 'Nothing saved for this week yet. Save the week first.' }, { status: 404 })
    }

    const { renderToBuffer } = await import('@react-pdf/renderer')
    const doc = createElement(DietWeekDocument, {
      submission: submission as DietSubmission,
      clientName: client.full_name,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf = await renderToBuffer(doc as any)

    const safeName = (client.full_name as string).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    const path = `${client.id}/diet/${weekStart}_${Date.now()}.pdf`
    const { error: uploadErr } = await supabase.storage
      .from('plan-pdfs')
      .upload(path, buf, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) {
      console.error('[pdf/diet] upload error:', uploadErr)
      return NextResponse.json({ error: "Couldn't save the PDF. Try once more." }, { status: 500 })
    }
    const { data: urlData } = supabase.storage.from('plan-pdfs').getPublicUrl(path)

    return NextResponse.json({ pdf_url: urlData.publicUrl, file_name: `${safeName}-food-week-${weekStart}.pdf` })
  } catch (err) {
    console.error('[pdf/diet] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to make the PDF.' },
      { status: 500 },
    )
  }
}
