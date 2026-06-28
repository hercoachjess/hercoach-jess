'use client'

import { useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { resolvePaymentStatus, getWeeksSince } from '@/lib/utils'
import { isCheckinOverdue, overdueLabel } from '@/lib/checkin-day'
import NudgeButton from './NudgeButton'
import QuickNoteButton from './QuickNoteButton'
import ClientBriefingButton from './ClientBriefingButton'
import type {
  Client,
  OnboardingSubmission,
  CheckinSubmission,
  MealPlan,
  TrainingPlan,
  PlanHistory,
  Payment,
  ClientNote,
} from '@/types'

import OverviewTab from './tabs/OverviewTab'
import CheckinsTab from './tabs/CheckinsTab'
import CompareTab from './tabs/CompareTab'
import ProgressTab from './tabs/ProgressTab'
import MealPlanTab from './tabs/MealPlanTab'
import TrainingPlanTab from './tabs/TrainingPlanTab'
import PlanHistoryTab from './tabs/PlanHistoryTab'
import PaymentsTab from './tabs/PaymentsTab'
import OnboardingFileTab from './tabs/OnboardingFileTab'

const TABS = [
  'Overview',
  'Check-ins',
  'Compare',
  'Progress',
  'Meal Plan',
  'Training',
  'Plan History',
  'Payments',
  'Onboarding',
]

interface Props {
  client: Client
  onboarding: OnboardingSubmission | null
  checkins: CheckinSubmission[]
  mealPlan: MealPlan | null
  trainingPlan: TrainingPlan | null
  planHistory: PlanHistory[]
  payments: Payment[]
  notes?: ClientNote[]
}

export default function ClientFile({
  client,
  onboarding,
  checkins,
  mealPlan,
  trainingPlan,
  planHistory,
  payments,
  notes = [],
}: Props) {
  const [activeTab, setActiveTab] = useState(0)

  const weeksCoached = getWeeksSince(client.created_at)
  const overduePayments = payments.some(
    (p) => resolvePaymentStatus(p.status, p.due_date) === 'overdue'
  )
  const latestCheckinIso = checkins[0]?.created_at ?? null
  const checkinOverdue =
    client.status === 'active' && isCheckinOverdue(client.checkin_day, latestCheckinIso)
  const overdueLine = checkinOverdue ? overdueLabel(client.checkin_day, latestCheckinIso) : null

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-[#b8b4ac] hover:text-[#e0d8cc] transition-colors mb-6"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M8 2L4 6l4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All clients
      </Link>

      {/* Client header */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="logo-text text-4xl mb-1">{client.full_name}</h1>
          <p className="text-sm text-[#b8b4ac]">
            {client.goal || 'No goal set'}
            {weeksCoached > 0 && ` · Week ${weeksCoached}`}
            {client.checkin_day && ` · Check-ins ${client.checkin_day}s`}
          </p>
          {client.pinned_note && (
            <p className="text-sm text-[#c89a6a] italic mt-2 leading-relaxed">📌 {client.pinned_note}</p>
          )}
          {checkinOverdue && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-sm border border-[#c89a6a] text-[#c89a6a]">
                Check-in overdue{overdueLine ? ` · ${overdueLine}` : ''}
              </span>
              <NudgeButton client={client} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <ClientBriefingButton clientId={client.id} />
          <Badge variant={client.status as 'active' | 'paused' | 'archived'} dot>
            {client.status}
          </Badge>
          {overduePayments && (
            <Badge variant="overdue" dot>Payment overdue</Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[rgba(255,255,255,0.24)] mb-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map((tab, i) => {
            const hasAlert =
              (tab === 'Payments' && overduePayments)
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`relative px-4 py-3 text-xs tracking-wider uppercase transition-colors whitespace-nowrap ${
                  activeTab === i
                    ? 'text-[#f0ece4] border-b-2 border-[#f0ece4]'
                    : 'text-[#b8b4ac] hover:text-[#e0d8cc] border-b-2 border-transparent'
                }`}
              >
                {tab}
                {hasAlert && (
                  <span className="absolute top-2.5 right-1.5 w-1.5 h-1.5 bg-[#c89a6a] rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="fade-in" key={activeTab}>
        {activeTab === 0 && (
          <OverviewTab client={client} checkins={checkins} onboarding={onboarding} />
        )}
        {activeTab === 1 && (
          <CheckinsTab checkins={checkins} clientId={client.id} client={client} onboarding={onboarding} />
        )}
        {activeTab === 2 && (
          <CompareTab checkins={checkins} client={client} />
        )}
        {activeTab === 3 && (
          <ProgressTab checkins={checkins} />
        )}
        {activeTab === 4 && (
          <MealPlanTab client={client} initialMealPlan={mealPlan} onboarding={onboarding} />
        )}
        {activeTab === 5 && (
          <TrainingPlanTab client={client} initialTrainingPlan={trainingPlan} onboarding={onboarding} checkins={checkins} />
        )}
        {activeTab === 6 && (
          <PlanHistoryTab
            clientId={client.id}
            client={client}
            planHistory={planHistory}
            currentMealPlan={mealPlan}
            currentTrainingPlan={trainingPlan}
          />
        )}
        {activeTab === 7 && (
          <PaymentsTab clientId={client.id} payments={payments} />
        )}
        {activeTab === 8 && (
          <OnboardingFileTab onboarding={onboarding} client={client} />
        )}
      </div>

      <QuickNoteButton clientId={client.id} initialNotes={notes} />
    </div>
  )
}
