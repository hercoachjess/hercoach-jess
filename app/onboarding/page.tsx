import OnboardingForm from './OnboardingForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Client Onboarding, HerCoach Jess',
  description: 'Complete your onboarding with Jess, Registered Dietitian.',
}

export default function OnboardingPage() {
  return <OnboardingForm />
}
