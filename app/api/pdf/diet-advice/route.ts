import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { requireCoach } from '@/lib/supabase/require-coach'
import { createAdminClient } from '@/lib/supabase/admin'
import DietAdviceDocument from '@/lib/pdf/DietAdviceDocument'
import type { DietSubmission } from '@/types'

// PDF rendering on a cold start easily exceeds Vercel's 10s default.
export const maxDuration = 60

/**
 * Coach-side PDF export: personal note from Jess + client's food week
 * for reference. Auth-gated with requireCoach so only Jess can hit it.
 *
 * Body: { dietSubmissionId, advice }
 *   - dietSubmissionId: which week to include as reference
 *   - advice: the (possibly edited) note Jess wants to send. We render
 *     exactly what she passes; no AI branding anywhere on the PDF.
 *
 * Returns { pdf_url } after uploading to plan-pdfs bucket so Jess can
 * share it via WhatsApp / email.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized

  try {
    const { dietSubmissionId, advice }: { dietSubmissionId: string; advice?: string } = await request.json()
    if (!dietSubmissionId) {
      return NextResponse.json({ error: 'dietSubmissionId is required.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: sub, error: subErr } = await supabase
      .from('diet_submissions')
      .select('*')
      .eq('id', dietSubmissionId)
      .maybeSingle()
    if (subErr) {
      console.error('[pdf/diet-advice] submission lookup error:', subErr)
      return NextResponse.json({ error: "Couldn't load this week." }, { status: 500 })
    }
    if (!sub) {
      return NextResponse.json({ error: 'Diet week not found.' }, { status: 404 })
    }
    const submission = sub as DietSubmission

    const { data: client } = await supabase
      .from('clients')
      .select('id, full_name')
      .eq('id', submission.client_id)
      .single()
    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
    }

    // Render the doc.
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const doc = createElement(DietAdviceDocument, {
      submission,
      clientName: client.full_name,
      advice: (advice ?? submission.ai_advice ?? '').trim(),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf = await renderToBuffer(doc as any)

    const safeName = (client.full_name as string).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    const path = `${client.id}/diet-advice/${submission.week_start}_${Date.now()}.pdf`
    const { error: uploadErr } = await supabase.storage
      .from('plan-pdfs')
      .upload(path, buf, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) {
      console.error('[pdf/diet-advice] upload error:', uploadErr)
      return NextResponse.json({ error: "Couldn't save the PDF. Try once more." }, { status: 500 })
    }
    const { data: urlData } = supabase.storage.from('plan-pdfs').getPublicUrl(path)

    return NextResponse.json({
      pdf_url: urlData.publicUrl,
      file_name: `${safeName}-week-review-${submission.week_start}.pdf`,
    })
  } catch (err) {
    console.error('[pdf/diet-advice] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to make the PDF.' },
      { status: 500 },
    )
  }
}
