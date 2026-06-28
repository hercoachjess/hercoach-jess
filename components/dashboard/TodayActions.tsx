import Link from 'next/link'
import type { Client, CheckinSubmission, Payment, Enquiry } from '@/types'
import { isCheckinOverdue, overdueLabel } from '@/lib/checkin-day'
import { resolvePaymentStatus } from '@/lib/utils'

interface Props {
  clients: Client[]
  latestCheckin: Record<string, CheckinSubmission>
  checkins: CheckinSubmission[]
  payments: Payment[]
  enquiries: Enquiry[]
}

interface Action {
  key: string
  priority: number // lower = higher priority
  label: string
  detail: string
  href: string
  tone: 'urgent' | 'warn' | 'positive' | 'neutral'
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * "Today's actions" feed. Replaces the row of count tiles with a short,
 * ordered list of concrete things Jess should do right now. Each item
 * is tappable. When everything is done, a warm empty state.
 */
export default function TodayActions({
  clients,
  latestCheckin,
  checkins,
  payments,
  enquiries,
}: Props) {
  const clientById = new Map(clients.map((c) => [c.id, c] as const))
  const actions: Action[] = []

  // 1. Unreviewed check-ins (most recent first), top priority, fresh work.
  const unreviewed = checkins
    .filter((c) => !c.coach_reviewed_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  for (const c of unreviewed) {
    const client = clientById.get(c.client_id)
    if (!client) continue
    actions.push({
      key: `checkin-${c.id}`,
      priority: 1,
      label: `Reply to ${client.full_name}'s check-in`,
      detail: `Landed ${timeAgo(c.created_at)} · Week ${c.week_number ?? '?'}`,
      href: `/dashboard/client/${client.id}?tab=Check-ins`,
      tone: 'positive',
    })
  }

  // 2. Overdue check-ins (active clients past their checkin_day or no recent submission).
  for (const c of clients) {
    if (c.status !== 'active') continue
    const latest = latestCheckin[c.id]
    const overdue = c.checkin_day
      ? isCheckinOverdue(c.checkin_day, latest?.created_at)
      : !latest || (Date.now() - new Date(latest.created_at).getTime()) > 7 * 24 * 60 * 60 * 1000
    if (!overdue) continue
    const lateBy = c.checkin_day ? overdueLabel(c.checkin_day, latest?.created_at) : 'over a week'
    actions.push({
      key: `overdue-${c.id}`,
      priority: 2,
      label: `${c.full_name} hasn't checked in`,
      detail: `${lateBy ?? 'overdue'}${c.checkin_day ? ` · usually ${c.checkin_day}s` : ''}`,
      href: `/dashboard/client/${c.id}`,
      tone: 'warn',
    })
  }

  // 3. New enquiries, leads waiting on a reply.
  for (const e of enquiries.filter((x) => x.status === 'new')) {
    actions.push({
      key: `enquiry-${e.id}`,
      priority: 3,
      label: `New enquiry from ${e.first_name}${e.last_name ? ` ${e.last_name}` : ''}`,
      detail: `${e.goal || 'Goal not stated'} · ${timeAgo(e.created_at)}`,
      href: '/dashboard#enquiries',
      tone: 'positive',
    })
  }

  // 4. Overdue payments.
  const overduePaymentsByClient = new Map<string, number>()
  for (const p of payments) {
    if (resolvePaymentStatus(p.status, p.due_date) !== 'overdue') continue
    overduePaymentsByClient.set(p.client_id, (overduePaymentsByClient.get(p.client_id) ?? 0) + 1)
  }
  for (const [clientId, count] of overduePaymentsByClient) {
    const client = clientById.get(clientId)
    if (!client) continue
    actions.push({
      key: `payment-${clientId}`,
      priority: 4,
      label: `${client.full_name}'s payment is overdue`,
      detail: count > 1 ? `${count} payments awaiting` : 'Chase or mark paid',
      href: `/dashboard/client/${clientId}?tab=Payments`,
      tone: 'urgent',
    })
  }

  // Sort by priority, then push to a maximum we want to show.
  actions.sort((a, b) => a.priority - b.priority)
  const visible = actions.slice(0, 12)
  const overflow = actions.length - visible.length

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="bg-[#0e0e0e] border border-[rgba(255,255,255,0.24)] rounded-sm p-5 mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Today</span>
        <span className="text-xs text-[#8a8680]">{today}</span>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-[#b8b4ac] italic leading-relaxed py-4">
          All caught up. Nothing waiting on you right now.
        </p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((a) => (
            <li key={a.key}>
              <Link
                href={a.href}
                className="flex items-start gap-3 -mx-2 px-2 py-2.5 rounded-sm hover:bg-[rgba(255,255,255,0.04)] transition-colors group"
              >
                <ActionDot tone={a.tone} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0ece4] leading-snug group-hover:text-white">{a.label}</p>
                  <p className="text-xs text-[#8a8680] mt-0.5">{a.detail}</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" className="mt-2 flex-shrink-0">
                  <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
          {overflow > 0 && (
            <li className="text-xs text-[#8a8680] italic pt-2 pl-5">
              {overflow} more below.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function ActionDot({ tone }: { tone: Action['tone'] }) {
  const colour =
    tone === 'urgent' ? '#b06060' :
    tone === 'warn'   ? '#c89a6a' :
    tone === 'positive' ? '#7da87d' :
    '#b8b4ac'
  return (
    <span
      aria-hidden
      className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: colour }}
    />
  )
}
