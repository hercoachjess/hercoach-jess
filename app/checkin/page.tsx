import CheckinForm from './CheckinForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Weekly Check-in, HerCoach Jess',
  description: 'Your weekly check-in with Jess.',
}

export default function CheckinPage() {
  return <CheckinForm />
}
