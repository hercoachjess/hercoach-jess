import type { DietDay } from '@/types'

/**
 * Small utilities for the weekly food tracker.
 *
 * The week runs Monday to Sunday to match the check-in weekly cadence.
 * All dates are ISO strings (YYYY-MM-DD) so they compare/store cleanly.
 */

/** Monday of the week containing `d`, at 00:00 local time. */
export function mondayOf(d: Date = new Date()): Date {
  const day = d.getDay() // 0 = Sunday
  const offset = day === 0 ? -6 : 1 - day
  const out = new Date(d)
  out.setDate(d.getDate() + offset)
  out.setHours(0, 0, 0, 0)
  return out
}

export function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** ISO Monday for the current week. */
export function currentWeekStart(now: Date = new Date()): string {
  return toIsoDate(mondayOf(now))
}

/** Array of 7 DietDay templates for the given week, in Mon-Sun order. */
export function emptyWeekDays(weekStartIso: string): DietDay[] {
  const start = new Date(weekStartIso)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return { date: toIsoDate(d) }
  })
}

/** Human "Mon 07 Jul" style label from an ISO date. */
export function shortDayLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
}

/** "Week of 07 Jul" from an ISO Monday. */
export function weekLabel(iso: string): string {
  const d = new Date(iso)
  return `Week of ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })}`
}
