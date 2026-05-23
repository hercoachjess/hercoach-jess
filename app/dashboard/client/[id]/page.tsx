import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientFile from '@/components/dashboard/ClientFile'
import type {
  Client,
  OnboardingSubmission,
  CheckinSubmission,
  MealPlan,
  TrainingPlan,
  PlanHistory,
  Payment,
} from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientFilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: client },
    { data: onboarding },
    { data: checkins },
    { data: mealPlans },
    { data: trainingPlans },
    { data: planHistory },
    { data: payments },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase
      .from('onboarding_submissions')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('checkin_submissions')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('meal_plans')
      .select('*')
      .eq('client_id', id)
      .eq('is_current', true)
      .limit(1)
      .single(),
    supabase
      .from('training_plans')
      .select('*')
      .eq('client_id', id)
      .eq('is_current', true)
      .limit(1)
      .single(),
    supabase
      .from('plan_history')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('client_id', id)
      .order('due_date', { ascending: false }),
  ])

  if (!client) notFound()

  return (
    <ClientFile
      client={client as Client}
      onboarding={onboarding as OnboardingSubmission | null}
      checkins={(checkins ?? []) as CheckinSubmission[]}
      mealPlan={mealPlans as MealPlan | null}
      trainingPlan={trainingPlans as TrainingPlan | null}
      planHistory={(planHistory ?? []) as PlanHistory[]}
      payments={(payments ?? []) as Payment[]}
    />
  )
}
