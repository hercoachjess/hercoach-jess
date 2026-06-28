import { createClient } from '@/lib/supabase/server'
import { resolvePaymentStatus } from '@/lib/utils'
import { isCheckinOverdue } from '@/lib/checkin-day'
import type { Client, CheckinSubmission, Payment, Enquiry } from '@/types'
import AddClientButton from '@/components/dashboard/AddClientButton'
import CopyLink from '@/components/ui/CopyLink'
import ClientListSection from '@/components/dashboard/ClientListSection'
import EnquiriesSection from '@/components/dashboard/EnquiriesSection'
import TodayActions from '@/components/dashboard/TodayActions'

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
    { data: enquiries },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase
      .from('checkin_submissions')
      .select('client_id, created_at, week_number, payload, coach_reviewed_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('payments')
      .select('client_id, status, due_date, paid_date')
      .in('status', ['pending', 'paid']),
    supabase.from('enquiries').select('*').order('created_at', { ascending: false }),
  ])

  const clientList = (clients ?? []) as Client[]
  const checkinList = (recentCheckins ?? []) as CheckinSubmission[]
  const paymentList = (payments ?? []) as Payment[]
  const enquiryList = (enquiries ?? []) as Enquiry[]
  const newEnquiries = enquiryList.filter((e) => e.status === 'new').length

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

  // Check-ins "to review": ANY check-in (regardless of age) that the coach
  // hasn't marked reviewed yet. Once reviewed via the check-in card it falls
  // off this count automatically.
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const checkinsToReview = checkinList.filter((c) => !c.coach_reviewed_at).length

  // Overdue: active clients whose configured `checkin_day` has passed
  // (+ 1 day grace) and haven't checked in this cycle. Falls back to a
  // generic 7-day-no-submission rule for clients whose day isn't set
  // yet, so they don't drop off the radar entirely.
  const overdueCheckins = clientList.filter((c) => {
    if (c.status !== 'active') return false
    const latest = latestCheckin[c.id]
    if (c.checkin_day) {
      return isCheckinOverdue(c.checkin_day, latest?.created_at)
    }
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

      {/* Today's actions: prioritised list of concrete things to do
          right now (check-ins to reply to, overdue clients, new
          enquiries, payments to chase). Replaces the old wall of
          count tiles, which was passive. */}
      <TodayActions
        clients={clientList}
        latestCheckin={latestCheckin}
        checkins={checkinList}
        payments={paymentList}
        enquiries={enquiryList}
      />

      {/* Slim summary line, just the at-a-glance counts that aren't
          actionable in themselves. */}
      <div className="mb-10 flex items-center gap-x-6 gap-y-2 flex-wrap text-xs text-[#b8b4ac] tracking-widest uppercase">
        <span><span className="text-[#f0ece4] text-sm normal-case tracking-normal mr-2">{activeClients}</span>active clients</span>
        <span><span className="text-[#f0ece4] text-sm normal-case tracking-normal mr-2">{checkinsToReview}</span>check-ins to review</span>
        <span style={{ color: overdueCheckins > 0 ? '#c89a6a' : undefined }}>
          <span className="text-sm normal-case tracking-normal mr-2" style={{ color: overdueCheckins > 0 ? '#c89a6a' : '#f0ece4' }}>{overdueCheckins}</span>overdue check-ins
        </span>
        <span style={{ color: overduePayments > 0 ? '#c89a6a' : undefined }}>
          <span className="text-sm normal-case tracking-normal mr-2" style={{ color: overduePayments > 0 ? '#c89a6a' : '#f0ece4' }}>{overduePayments}</span>overdue payments
        </span>
        <span style={{ color: newEnquiries > 0 ? '#7da87d' : undefined }}>
          <span className="text-sm normal-case tracking-normal mr-2" style={{ color: newEnquiries > 0 ? '#7da87d' : '#f0ece4' }}>{newEnquiries}</span>new enquiries
        </span>
      </div>

      {/* Share links, public form URLs */}
      <div className="mb-10">
        <h2 className="text-sm text-[#e0d8cc] tracking-widest uppercase mb-3">Share with clients</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CopyLink
            label="Coaching enquiry link"
            url={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://meal-generator-murex.vercel.app'}/enquire`}
            hint="Put this on your Instagram bio / website. Prospective clients fill a short form, they land in Enquiries below for you to follow up."
          />
          <CopyLink
            label="Onboarding link"
            url={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://meal-generator-murex.vercel.app'}/onboarding`}
            hint="Send to new clients once you've agreed to work together. They complete the 7-step form, a client file appears automatically."
          />
          <CopyLink
            label="Generic check-in link"
            url={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://meal-generator-murex.vercel.app'}/checkin`}
            hint="The same link for every client. For pre-filled per-client links, see Overview on each client file."
          />
        </div>
      </div>

      {/* Enquiries, sits above clients so new leads are the first thing you see */}
      <EnquiriesSection
        enquiries={enquiryList}
        onboardingUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://meal-generator-murex.vercel.app'}/onboarding`}
      />

      {/* Client list, interactive search + status filters live in the client component */}
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
