import { createClient } from '@/lib/supabase/server'
import { resolvePaymentStatus } from '@/lib/utils'
import type { Client, CheckinSubmission, Payment } from '@/types'
import AddClientButton from '@/components/dashboard/AddClientButton'
import CopyLink from '@/components/ui/CopyLink'
import ClientListSection from '@/components/dashboard/ClientListSection'

function getHour() {
  return new Date().getHours()
}

function greeting() {
  const h = getHour()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: clients },
    { data: recentCheckins },
    { data: payments },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase
      .from('checkin_submissions')
      .select('client_id, created_at, week_number, payload')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('payments')
      .select('client_id, status, due_date, paid_date')
      .in('status', ['pending', 'paid']),
  ])

  const clientList = (clients ?? []) as Client[]
  const checkinList = (recentCheckins ?? []) as CheckinSubmission[]
  const paymentList = (payments ?? []) as Payment[]

  // Build quick lookup maps
  const latestCheckin: Record<string, CheckinSubmission> = {}
  for (const c of checkinList) {
    if (!latestCheckin[c.client_id]) latestCheckin[c.client_id] = c
  }

  const paymentStatus: Record<string, 'paid' | 'pending' | 'overdue'> = {}
  for (const p of paymentList) {
    const resolved = resolvePaymentStatus(p.status, p.due_date)
    if (resolved === 'overdue') {
      paymentStatus[p.client_id] = 'overdue'
    } else if (!paymentStatus[p.client_id]) {
      paymentStatus[p.client_id] = resolved as 'paid' | 'pending'
    }
  }

  const activeClients = clientList.filter((c) => c.status === 'active').length

  // Check-ins "to review": clients with a check-in in the last 7 days that hasn't been older than that
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const checkinsToReview = Object.values(latestCheckin).filter(
    (c) => new Date(c.created_at) > oneWeekAgo
  ).length

  // Missed: active clients whose latest check-in is >7 days ago (or none)
  const missedCheckins = clientList.filter((c) => {
    if (c.status !== 'active') return false
    const latest = latestCheckin[c.id]
    if (!latest) return true
    return new Date(latest.created_at) < oneWeekAgo
  }).length

  const overduePayments = Object.values(paymentStatus).filter((s) => s === 'overdue').length

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="logo-text text-4xl mb-1">{greeting()}, Jess</h1>
        <p className="text-sm text-[#b8b4ac]">Here&apos;s your client overview.</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Active clients', value: activeClients },
          { label: 'Check-ins to review', value: checkinsToReview },
          { label: 'Missed check-ins', value: missedCheckins },
          { label: 'Overdue payments', value: overduePayments, warn: overduePayments > 0 },
        ].map(({ label, value, warn }) => (
          <div
            key={label}
            className="bg-[#0e0e0e] border border-[rgba(255,255,255,0.24)] rounded-sm px-5 py-4"
          >
            <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">{label}</p>
            <p
              className="text-3xl font-light"
              style={{ color: warn ? '#c89a6a' : '#f0ece4' }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Share links — public form URLs */}
      <div className="mb-10">
        <h2 className="text-sm text-[#e0d8cc] tracking-widest uppercase mb-3">Share with clients</h2>
        <div className="grid grid-cols-2 gap-3">
          <CopyLink
            label="Onboarding link"
            url={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://meal-generator-murex.vercel.app'}/onboarding`}
            hint="Send to new clients. They complete the 7-step form — a client file appears on your dashboard automatically."
          />
          <CopyLink
            label="Generic check-in link"
            url={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://meal-generator-murex.vercel.app'}/checkin`}
            hint="The same link for every client. They identify themselves by email when submitting. For pre-filled links per client, see their individual file."
          />
        </div>
      </div>

      {/* Client list — interactive search + status filters live in the client component */}
      <ClientListSection
        clients={clientList}
        latestCheckin={latestCheckin}
        paymentStatus={paymentStatus}
        oneWeekAgoIso={oneWeekAgo.toISOString()}
      />

      <AddClientButton />
    </div>
  )
}
