'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { getInitials, getWeeksSince } from '@/lib/utils'
import { isCheckinOverdue, overdueLabel } from '@/lib/checkin-day'
import type { Client, CheckinSubmission } from '@/types'

interface Props {
  clients: Client[]
  latestCheckin: Record<string, CheckinSubmission>
  paymentStatus: Record<string, 'paid' | 'pending' | 'overdue'>
  oneWeekAgoIso: string
}

const STATUS_FILTERS = ['active', 'paused', 'archived'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

export default function ClientListSection({ clients, latestCheckin, paymentStatus, oneWeekAgoIso }: Props) {
  const [query, setQuery] = useState('')
  // Hide archived by default — coach can toggle them in via the filter chips.
  const [activeFilters, setActiveFilters] = useState<Set<StatusFilter>>(new Set(['active', 'paused']))
  const oneWeekAgo = new Date(oneWeekAgoIso)

  function toggleFilter(s: StatusFilter) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(s)) {
        if (next.size > 1) next.delete(s)
      } else {
        next.add(s)
      }
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter((c) => {
      if (!activeFilters.has(c.status as StatusFilter)) return false
      if (!q) return true
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.goal?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [clients, query, activeFilters])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm text-[#e0d8cc] tracking-widest uppercase">Clients</h2>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          placeholder="Search by name, email or goal…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-[#0e0e0e] border border-[rgba(255,255,255,0.14)] rounded-sm px-4 py-2 text-sm text-[#f0ece4] placeholder:text-[#7a7670] focus:border-[rgba(255,255,255,0.3)] outline-none transition-colors"
        />
        <div className="flex gap-2">
          {STATUS_FILTERS.map((s) => {
            const on = activeFilters.has(s)
            return (
              <button
                key={s}
                onClick={() => toggleFilter(s)}
                className={`px-3 py-2 text-xs tracking-widest uppercase border rounded-sm transition-colors ${
                  on
                    ? 'border-[rgba(255,255,255,0.3)] text-[#f0ece4] bg-[rgba(255,255,255,0.06)]'
                    : 'border-[rgba(255,255,255,0.14)] text-[#b8b4ac] hover:text-[#e0d8cc]'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#b8b4ac] text-sm">
            {clients.length === 0
              ? 'No clients yet. Add your first client below.'
              : 'No clients match these filters.'}
          </div>
        )}
        {filtered.map((client) => {
          const checkin = latestCheckin[client.id]
          const pStatus = paymentStatus[client.id]
          const weeksCoached = getWeeksSince(client.created_at)
          // "New check-in" badge — show only if it landed recently AND coach
          // hasn't marked it reviewed yet. Reviewing on the check-in card
          // clears the badge automatically.
          const hasRecentCheckin =
            checkin
            && new Date(checkin.created_at) > oneWeekAgo
            && !checkin.coach_reviewed_at
          const overdue =
            client.status === 'active' &&
            (client.checkin_day
              ? isCheckinOverdue(client.checkin_day, checkin?.created_at)
              : !checkin || new Date(checkin.created_at) < oneWeekAgo)
          const overdueText = overdue ? overdueLabel(client.checkin_day, checkin?.created_at) : null

          return (
            <Link
              key={client.id}
              href={`/dashboard/client/${client.id}`}
              className="flex items-center gap-4 bg-[#0e0e0e] border border-[rgba(255,255,255,0.24)] hover:border-[rgba(255,255,255,0.24)] rounded-sm px-5 py-4 transition-colors group"
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.10)', color: '#e0d8cc' }}
              >
                {getInitials(client.full_name)}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                  <span className="text-sm font-medium text-[#f0ece4] group-hover:text-white transition-colors">
                    {client.full_name}
                  </span>
                  <Badge variant={client.status as 'active' | 'paused' | 'archived'} dot>
                    {client.status}
                  </Badge>
                </div>
                <p className="text-xs text-[#b8b4ac] truncate">
                  {client.goal || 'No goal set'}
                  {client.checkin_day && ` · Check-in: ${client.checkin_day}s`}
                  {weeksCoached > 0 && ` · Week ${weeksCoached}`}
                </p>
                {client.pinned_note && (
                  <p className="text-xs text-[#c89a6a] italic truncate mt-0.5">📌 {client.pinned_note}</p>
                )}
              </div>

              {/* Right-side badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasRecentCheckin && (
                  <Badge variant="default">New check-in</Badge>
                )}
                {overdue && (
                  <span className="text-xs px-2 py-0.5 rounded-sm border border-[#c89a6a] text-[#c89a6a] whitespace-nowrap">
                    Overdue{overdueText ? ` · ${overdueText}` : ''}
                  </span>
                )}
                {pStatus && (
                  <Badge variant={pStatus}>{pStatus === 'overdue' ? 'Overdue' : pStatus === 'paid' ? 'Paid' : 'Pending'}</Badge>
                )}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2">
                  <path d="M5 2l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
