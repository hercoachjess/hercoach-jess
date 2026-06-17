import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCoach } from '@/lib/supabase/require-coach'
import ClientPlanDocument from '@/lib/pdf/ClientPlanDocument'
import type { MealPlan, TrainingPlan, Client, OnboardingSubmission } from '@/types'

type Scope = 'meal' | 'training' | 'full'
type Mode = 'save' | 'inline'

export async function POST(request: NextRequest) {
  const unauthorized = await requireCoach()
  if (unauthorized) return unauthorized
  try {
    const {
      clientId,
      mealPlan,
      trainingPlan,
      version,
      includeNumbers = true,
      scope = 'full',
      mode = 'save',
    }: {
      clientId: string
      mealPlan: MealPlan | null
      trainingPlan: TrainingPlan | null
      version: string
      includeNumbers?: boolean
      scope?: Scope
      mode?: Mode
    } = await request.json()

    const supabase = createAdminClient()

    const [{ data: client }, { data: onboarding }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
    }

    // Scope strips the section the caller doesn't want.
    const docMealPlan = scope === 'training' ? null : mealPlan
    const docTrainingPlan = scope === 'meal' ? null : trainingPlan

    // Dynamic import to avoid ESM/CJS issues at module load time
    const { renderToBuffer } = await import('@react-pdf/renderer')

    const doc = createElement(ClientPlanDocument, {
      client: client as Client,
      mealPlan: docMealPlan,
      trainingPlan: docTrainingPlan,
      onboarding: (onboarding as OnboardingSubmission | null) ?? null,
      version,
      includeNumbers,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(doc as any)

    // Inline mode: stream the PDF straight back to the browser for download — no storage write.
    if (mode === 'inline') {
      const safeName = (client.full_name as string).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      const sectionTag = scope === 'meal' ? 'meal-plan' : scope === 'training' ? 'training-plan' : 'full-plan'
      const filename = `${safeName}-${sectionTag}-${version}.pdf`
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    // Save mode (default): upload to storage and return public URL.
    const scopeFolder = scope === 'full' ? '' : `${scope}/`
    const fileName = `${clientId}/${scopeFolder}${version}_${Date.now()}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('plan-pdfs')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload PDF.' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('plan-pdfs').getPublicUrl(fileName)

    return NextResponse.json({ pdf_url: urlData.publicUrl, file_name: fileName })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Failed to generate PDF.' }, { status: 500 })
  }
}
