import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCoach } from '@/lib/supabase/require-coach'
import OnboardingDocument from '@/lib/pdf/OnboardingDocument'
import type { OnboardingSubmission } from '@/types'

type Mode = 'save' | 'inline'

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized

  try {
    const { clientId, mode = 'save' }: { clientId: string; mode?: Mode } = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const [{ data: client, error: clientError }, { data: onboarding, error: onbError }] = await Promise.all([
      supabase.from('clients').select('id, full_name').eq('id', clientId).single(),
      supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (clientError) {
      console.error('[pdf/onboarding] client fetch error:', clientError)
      return NextResponse.json(
        { error: clientError.message, code: clientError.code, details: clientError.details },
        { status: 500 },
      )
    }
    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
    }
    if (onbError) {
      console.error('[pdf/onboarding] onboarding fetch error:', onbError)
      return NextResponse.json(
        { error: onbError.message, code: onbError.code, details: onbError.details },
        { status: 500 },
      )
    }
    if (!onboarding) {
      return NextResponse.json({ error: 'No onboarding submission on record for this client.' }, { status: 404 })
    }

    const { renderToBuffer } = await import('@react-pdf/renderer')

    const doc = createElement(OnboardingDocument, {
      onboarding: onboarding as OnboardingSubmission,
      clientName: client.full_name,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(doc as any)

    const safeName = (client.full_name as string).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    const filename = `${safeName}-onboarding-file.pdf`

    if (mode === 'inline') {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    // Save mode: upload to storage so the URL can be shared via WhatsApp / email.
    const filePath = `${clientId}/onboarding/${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('plan-pdfs')
      .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      console.error('[pdf/onboarding] upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('plan-pdfs').getPublicUrl(filePath)

    return NextResponse.json({ pdf_url: urlData.publicUrl, file_name: filename })
  } catch (err) {
    console.error('[pdf/onboarding] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate onboarding PDF.' },
      { status: 500 },
    )
  }
}
