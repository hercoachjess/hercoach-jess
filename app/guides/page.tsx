import type { Metadata } from 'next'
import { Suspense } from 'react'
import GuideEnquiryForm from './GuideEnquiryForm'

export const metadata: Metadata = {
  title: 'Guides, HerCoach Jess',
  description: 'Grab one of Jess’s guides — tell her which one and she’ll send it over.',
}

export default function GuidesPage() {
  return (
    <Suspense fallback={null}>
      <GuideEnquiryForm />
    </Suspense>
  )
}
