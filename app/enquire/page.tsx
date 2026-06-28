import type { Metadata } from 'next'
import EnquiryForm from './EnquiryForm'

export const metadata: Metadata = {
  title: 'Coaching enquiries, HerCoach Jess',
  description: 'Tell Jess a little about you, she reads and replies to every enquiry personally.',
}

export default function EnquirePage() {
  return <EnquiryForm />
}
