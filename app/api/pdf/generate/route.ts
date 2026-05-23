import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import ClientPlanDocument from '@/lib/pdf/ClientPlanDocument'
import type { MealPlan, TrainingPlan, Client } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const {
      clientId,
      mealPlan,
      trainingPlan,
      version,
      includeNumbers = true,
    }: {
      clientId: string
      mealPlan: MealPlan | null
      trainingPlan: TrainingPlan | null
      version: string
      includeNumbers?: boolean
    } = await request.json()

    const supabase = createAdminClient()

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
    }

    // Dynamic import to avoid ESM/CJS issues at module load time
    const { renderToBuffer } = await import('@react-pdf/renderer')

    const doc = createElement(ClientPlanDocument, {
      client: client as Client,
      mealPlan,
      trainingPlan,
      version,
      includeNumbers,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(doc as any)

    const fileName = `${clientId}/${version}_${Date.now()}.pdf`

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
