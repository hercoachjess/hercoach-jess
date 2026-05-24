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
  // Mifflin–St Jeor equation (Mifflin et al, 1990) — the modern, more accurate
  // refinement of the original Harris–Benedict and the formula used in current
  // BDA / Academy of Nutrition and Dietetics practice.
  if (sex.toLowerCase() === 'female' || sex.toLowerCase() === 'f') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161)
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5)
}

// Physical activity multipliers as used with Mifflin–St Jeor / Harris–Benedict.
export function activityFactor(level: string | undefined | null): { value: number; label: string } {
  const k = (level ?? '').trim().toLowerCase()
  if (k.startsWith('sedentary'))  return { value: 1.2,   label: 'Sedentary (desk job, little/no exercise)' }
  if (k.startsWith('lightly'))    return { value: 1.375, label: 'Lightly active (1–3 sessions/week)' }
  if (k.startsWith('moderate'))   return { value: 1.55,  label: 'Moderate (3–5 sessions/week)' }
  if (k.startsWith('very'))       return { value: 1.725, label: 'Very active (6+ sessions/week or physical job)' }
  return { value: 1.4, label: 'Default (no activity level recorded)' }
}

// Goal-based calorie adjustment to TDEE.
export function goalAdjustment(goal: string | undefined | null): { factor: number; label: string; rationale: string } {
  const k = (goal ?? '').trim().toLowerCase()
  if (k.includes('fat loss'))     return { factor: 0.80, label: '−20% deficit', rationale: 'Sustainable fat loss ≈ 0.5 kg/week (BDA weight-management guidance, NICE CG189)' }
  if (k.includes('build muscle')) return { factor: 1.10, label: '+10% surplus', rationale: 'Lean muscle gain with minimal fat accrual (Aragon & Schoenfeld, 2013)' }
  if (k.includes('recomp'))       return { factor: 1.00, label: 'Maintenance', rationale: 'Body recomposition — eat at maintenance, prioritise protein & resistance training (Barakat et al, 2020)' }
  if (k.includes('maintain'))     return { factor: 1.00, label: 'Maintenance', rationale: 'Hold current weight while improving body composition' }
  if (k.includes('health'))       return { factor: 1.00, label: 'Maintenance', rationale: 'General health & wellbeing' }
  return { factor: 1.0, label: 'Maintenance', rationale: 'No primary goal recorded — defaulting to maintenance' }
}

// Protein requirement per kg bodyweight, goal-adjusted.
export function proteinPerKg(goal: string | undefined | null): { value: number; basis: string } {
  const k = (goal ?? '').trim().toLowerCase()
  if (k.includes('fat loss'))     return { value: 2.2, basis: 'Higher protein in a deficit to preserve lean mass (Helms et al, 2014; ISSN position stand 2017)' }
  if (k.includes('build muscle')) return { value: 2.0, basis: 'Maximises muscle protein synthesis in a surplus (ISSN position stand, 2017)' }
  if (k.includes('recomp'))       return { value: 2.2, basis: 'Body recomposition protocols require higher protein (Barakat et al, 2020)' }
  if (k.includes('maintain'))     return { value: 1.8, basis: 'Active adult maintenance (BDA Food Fact Sheet — Protein)' }
  if (k.includes('health'))       return { value: 1.6, basis: 'General active adult (BDA Food Fact Sheet — Protein)' }
  return { value: 1.8, basis: 'Active adult default' }
}

// Recompute macro split from a given calorie target, weight, and goal.
// Used when the coach overrides kcal manually — the macros snap to the
// research-based split for that goal rather than staying out of date.
export function macrosForKcal(
  kcal: number,
  weightKg: number | null,
  goal: string | null | undefined
): { protein_g: number; fat_g: number; carbs_g: number } | null {
  if (!kcal || !weightKg) return null
  const ppk = proteinPerKg(goal)
  const proteinG = Math.round((weightKg * ppk.value) / 5) * 5
  const fatFromKcal = (kcal * 0.25) / 9
  const fatFromKg = weightKg * 0.8
  const fatG = Math.round(Math.max(fatFromKcal, fatFromKg) / 5) * 5
  const remainingKcal = kcal - proteinG * 4 - fatG * 9
  const carbsG = Math.max(50, Math.round(remainingKcal / 4 / 5) * 5)
  return { protein_g: proteinG, fat_g: fatG, carbs_g: carbsG }
}

// Guidance ranges for each macro (±15% for protein/fat — narrower than kcal
// since hitting protein/fat targets matters more clinically; carbs is a wider
// remainder so ±20%).
export function macroGuidance(
  protein_g: number,
  fat_g: number,
  carbs_g: number
): { protein: [number, number]; fat: [number, number]; carbs: [number, number] } {
  const span = (v: number, pct: number) => [
    Math.max(0, Math.round((v * (1 - pct)) / 5) * 5),
    Math.round((v * (1 + pct)) / 5) * 5,
  ] as [number, number]
  return {
    protein: span(protein_g, 0.15),
    fat: span(fat_g, 0.15),
    carbs: span(carbs_g, 0.20),
  }
}

// Add months to a date string (YYYY-MM-DD) and return the same format.
// Handles month-end rollover safely.
export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return dateStr
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay))
  return target.toISOString().split('T')[0]
}

export interface EstimatedTargets {
  inputs: {
    weight_kg: number
    height_cm: number
    age: number
    sex: string
    activity_level: string
    activity_label: string
    activity_factor: number
    goal: string
  }
  bmr: number
  bmr_formula: string
  tdee: number
  goal_factor: number
  goal_label: string
  goal_rationale: string
  kcal: number
  protein_g: number
  protein_per_kg: number
  protein_basis: string
  fat_g: number
  fat_basis: string
  carbs_g: number
  carbs_basis: string
}

// Estimate calorie + macro targets from a client's vitals and onboarding payload.
// Returns null if any of weight / height / age / sex is missing.
export function estimateTargets(
  client: { current_weight_kg: number | null; height_cm: number | null; sex: string | null; date_of_birth: string | null },
  payload: { lifestyle?: { activity?: string }; goals?: { primary_goal?: string } } | null | undefined
): EstimatedTargets | null {
  const age = calculateAge(client.date_of_birth)
  const weight = client.current_weight_kg
  const height = client.height_cm
  const sex = client.sex
  if (!weight || !height || !age || !sex) return null

  const activity = payload?.lifestyle?.activity || ''
  const goal = payload?.goals?.primary_goal || ''

  const bmr = calculateBMR(weight, height, age, sex)
  if (bmr == null) return null

  const sexTerm = sex.toLowerCase().startsWith('f') ? '− 161' : '+ 5'
  const bmrFormula = `(10 × ${weight}) + (6.25 × ${height}) − (5 × ${age}) ${sexTerm} = ${bmr} kcal/day`

  const af = activityFactor(activity)
  const tdee = Math.round(bmr * af.value)
  const ga = goalAdjustment(goal)
  const kcal = Math.round((tdee * ga.factor) / 10) * 10

  const ppk = proteinPerKg(goal)
  const proteinG = Math.round((weight * ppk.value) / 5) * 5

  // Fat: max of 25% kcal (Institute of Medicine guidance) or 0.8 g/kg floor for hormonal health
  const fatFromKcal = (kcal * 0.25) / 9
  const fatFromKg = weight * 0.8
  const fatG = Math.round(Math.max(fatFromKcal, fatFromKg) / 5) * 5
  const fatBasis =
    fatFromKcal >= fatFromKg
      ? '25% of total kcal (Institute of Medicine AMDR — satiety & hormonal health)'
      : '0.8 g/kg bodyweight floor (minimum for hormonal & cellular health)'

  const remainingKcal = kcal - proteinG * 4 - fatG * 9
  const carbsG = Math.max(50, Math.round(remainingKcal / 4 / 5) * 5)

  return {
    inputs: {
      weight_kg: weight, height_cm: height, age, sex,
      activity_level: activity || 'not recorded',
      activity_label: af.label,
      activity_factor: af.value,
      goal: goal || 'not recorded',
    },
    bmr,
    bmr_formula: bmrFormula,
    tdee,
    goal_factor: ga.factor,
    goal_label: ga.label,
    goal_rationale: ga.rationale,
    kcal,
    protein_g: proteinG,
    protein_per_kg: ppk.value,
    protein_basis: ppk.basis,
    fat_g: fatG,
    fat_basis: fatBasis,
    carbs_g: carbsG,
    carbs_basis: 'Remaining kcal after protein & fat — primary fuel for training intensity & recovery',
  }
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
