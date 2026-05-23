export function calculateAge(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function calculateBMR(
  weightKg: number | null,
  heightCm: number | null,
  age: number | null,
  sex: string | null
): number | null {
  if (!weightKg || !heightCm || !age || !sex) return null
  // Harris-Benedict revised (Mifflin-St Jeor)
  if (sex.toLowerCase() === 'female' || sex.toLowerCase() === 'f') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161)
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5)
}

export function calculateMaxHR(age: number | null): number | null {
  if (!age) return null
  return 220 - age
}

export function calculateZone2(maxHR: number | null): { low: number; high: number } | null {
  if (!maxHR) return null
  return {
    low: Math.round(maxHR * 0.6),
    high: Math.round(maxHR * 0.7),
  }
}

export function formatWeight(kg: number | null): string {
  if (kg == null) return '—'
  return `${kg.toFixed(1)} kg`
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getWeeksSince(dateStr: string | null): number {
  if (!dateStr) return 0
  const start = new Date(dateStr)
  const now = new Date()
  const ms = now.getTime() - start.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 7))
}

export function getWeightChange(
  current: number | null,
  starting: number | null
): { value: number; direction: 'up' | 'down' | 'none' } | null {
  if (current == null || starting == null) return null
  const diff = current - starting
  return {
    value: Math.abs(diff),
    direction: diff < 0 ? 'down' : diff > 0 ? 'up' : 'none',
  }
}

export function resolvePaymentStatus(
  status: string,
  dueDate: string | null
): 'pending' | 'paid' | 'overdue' | 'cancelled' {
  if (status === 'paid' || status === 'cancelled') return status as 'paid' | 'cancelled'
  if (status === 'pending' && dueDate && new Date(dueDate) < new Date()) return 'overdue'
  return status as 'pending' | 'overdue'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

export function nextVersionNumber(existing: string[]): string {
  const nums = existing
    .map((v) => parseInt(v.replace('v', ''), 10))
    .filter((n) => !isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `v${max + 1}`
}

// Map categorical check-in answers to a 1–10 score for charting + AI comparison.
// Returns null when the value isn't recognised so charts can skip the point.
export function scoreFromLabel(value: string | undefined | null): number | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  const map: Record<string, number> = {
    // body feel
    'amazing': 10, 'good': 8, 'okay': 6, 'not great': 4, 'rough week': 2,
    // adherence
    'nailed it': 10, 'mostly on track': 8, 'about 50/50': 5, 'struggled': 3, 'off the rails': 1,
    // hunger (manageable = best, extremes = worse)
    'never hungry': 4, 'slightly hungry': 7, 'manageable': 9, 'very hungry': 4, 'starving': 1,
    // training sessions
    'none — missed all': 0, '1 session': 1, '2 sessions': 2, '3 sessions': 3, '4 sessions': 4, 'did extra': 5,
    // training feel
    'felt strong — smashed it': 10, 'good — solid sessions': 8, 'average — went through it': 6,
    'tough — really struggled': 3, 'exhausted': 1,
    // sleep
    'excellent — 7–9hrs': 10, 'good — mostly solid': 8, 'average — broken': 5, 'poor — under 6hrs': 3, 'terrible': 1,
    // stress (low = best)
    'low — calm': 2, 'moderate': 5, 'high': 8, 'very high': 10,
    // energy (note: 'good' shares value with body-feel 'good'; 'low' shares with mood 'low')
    'high — feeling great': 10, 'moderate — up and down': 5, 'very low — exhausted': 1,
    // water
    '2l+ consistently': 10, 'about 1.5–2l': 8, 'about 1–1.5l': 5, 'under 1l': 2,
    // mood
    'positive': 8, 'neutral': 5, 'struggling': 1,
  }
  return map[v] ?? null
}

// Count training sessions completed from string label
export function trainingSessionsCompleted(value: string | undefined | null): number {
  if (!value) return 0
  const v = value.toLowerCase()
  if (v.startsWith('none')) return 0
  if (v.startsWith('1')) return 1
  if (v.startsWith('2')) return 2
  if (v.startsWith('3')) return 3
  if (v.startsWith('4')) return 4
  if (v.startsWith('did extra')) return 5
  return 0
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item)
      if (!acc[k]) acc[k] = []
      acc[k].push(item)
      return acc
    },
    {} as Record<string, T[]>
  )
}
