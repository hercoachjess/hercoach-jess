/**
 * Computes whether a client is overdue their weekly check-in based on
 * the day-of-week recorded on `clients.checkin_day`.
 *
 * A client is overdue when:
 *  1. They have a configured check-in day.
 *  2. Today is past that day's most recent occurrence + a grace window.
 *  3. The latest check-in submission was BEFORE that most-recent
 *     occurrence (so the client hasn't actually checked in for the
 *     current week's window).
 */
const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function dayOfWeekToIndex(day: string): number | null {
  const target = day.trim().toLowerCase()
  const i = DAYS_OF_WEEK.findIndex((d) => d.toLowerCase() === target)
  return i === -1 ? null : i
}

/** Most recent occurrence of the given weekday at midnight, on/before today. */
function mostRecentWeekday(targetIdx: number, now: Date = new Date()): Date {
  const out = new Date(now)
  const diff = (now.getDay() - targetIdx + 7) % 7
  out.setDate(now.getDate() - diff)
  out.setHours(0, 0, 0, 0)
  return out
}

export function isCheckinOverdue(
  checkinDay: string | null | undefined,
  latestCheckinIso: string | null | undefined,
  /** Days of slack after the expected day before we count as overdue. */
  graceDays = 1,
  now: Date = new Date(),
): boolean {
  if (!checkinDay) return false
  const idx = dayOfWeekToIndex(checkinDay)
  if (idx === null) return false

  const lastExpected = mostRecentWeekday(idx, now)
  const cutoff = new Date(lastExpected)
  cutoff.setDate(lastExpected.getDate() + graceDays)
  // Still inside the grace window — not overdue yet.
  if (now < cutoff) return false

  if (!latestCheckinIso) return true
  const latest = new Date(latestCheckinIso)
  return latest < lastExpected
}

/** Human-readable "Tuesday — 3 days late" style string for UI. */
export function overdueLabel(
  checkinDay: string | null | undefined,
  latestCheckinIso: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!checkinDay) return null
  if (!isCheckinOverdue(checkinDay, latestCheckinIso, 1, now)) return null
  const idx = dayOfWeekToIndex(checkinDay)
  if (idx === null) return null
  const lastExpected = mostRecentWeekday(idx, now)
  const diffMs = now.getTime() - lastExpected.getTime()
  const diffDays = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
  return `${diffDays} day${diffDays === 1 ? '' : 's'} late`
}
