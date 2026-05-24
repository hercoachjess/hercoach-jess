import type { Metadata } from 'next'
import EnquiryForm from './EnquiryForm'

export const metadata: Metadata = {
  title: 'Coaching enquiries — HerCoach Jess',
  description: 'Tell Jess a little about you — she replies personally to every enquiry within 24 hours.',
}

export default function EnquirePage() {
  return <EnquiryForm />
}
