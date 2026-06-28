'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardHeader, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import WeightChart from '../WeightChart'
import {
  calculateAge,
  calculateBMR,
  calculateMaxHR,
  calculateZone2,
  estimateTargets,
  formatWeight,
  formatDate,
  getWeeksSince,
  getWeightChange,
  macrosForKcal,
  macroGuidance,
} from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import CopyLink from '@/components/ui/CopyLink'
import type { Client, CheckinSubmission, OnboardingSubmission } from '@/types'

interface Props {
  client: Client
  checkins: CheckinSubmission[]
  onboarding: OnboardingSubmission | null
}

export default function OverviewTab({ client, checkins, onboarding }: Props) {
  const router = useRouter()
  const [editingTargets, setEditingTargets] = useState(false)
  const [editingContact, setEditingContact] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const [applying, setApplying] = useState(false)

  const [targets, setTargets] = useState({
    primary_goal_kcal: client.primary_goal_kcal ?? '',
    protein_target_g: client.protein_target_g ?? '',
    fat_target_g: client.fat_target_g ?? '',
    carbs_target_g: client.carbs_target_g ?? '',
  })

  const [contact, setContact] = useState({
    full_name: client.full_name ?? '',
    phone: client.phone ?? '',
    email: client.email ?? '',
    pinned_note: client.pinned_note ?? '',
    food_dislikes_override: client.food_dislikes_override ?? '',
    exercise_dislikes: client.exercise_dislikes ?? '',
    checkin_day: client.checkin_day ?? '',
    coach_notes: client.coach_notes ?? '',
    status: client.status,
  })

  const age = calculateAge(client.date_of_birth)
  const bmr = calculateBMR(client.current_weight_kg, client.height_cm, age, client.sex)
  const maxHR = client.hr_max ?? calculateMaxHR(age)
  const zone2 = calculateZone2(maxHR)
  const weeksCoached = getWeeksSince(client.created_at)
  const weightChange = getWeightChange(client.current_weight_kg, client.starting_weight_kg)
  const latestCheckin = checkins[0]
  const estimate = estimateTargets(client, onboarding?.payload)

  // Weight chart data, last 8 weeks
  const chartData = checkins
    .filter((c) => c.payload.weight_kg != null)
    .slice(0, 8)
    .reverse()
    .map((c, i) => ({
      week: `W${c.week_number ?? i + 1}`,
      weight: c.payload.weight_kg as number,
    }))

  async function saveTargets() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('clients').update({
      primary_goal_kcal: Number(targets.primary_goal_kcal) || null,
      protein_target_g: Number(targets.protein_target_g) || null,
      fat_target_g: Number(targets.fat_target_g) || null,
      carbs_target_g: Number(targets.carbs_target_g) || null,
    }).eq('id', client.id)
    setSaving(false)
    setEditingTargets(false)
    router.refresh()
  }

  async function applyEstimate() {
    if (!estimate) return
    setApplying(true)
    const supabase = createClient()
    await supabase.from('clients').update({
      primary_goal_kcal: estimate.kcal,
      protein_target_g: estimate.protein_g,
      fat_target_g: estimate.fat_g,
      carbs_target_g: estimate.carbs_g,
    }).eq('id', client.id)
    setTargets({
      primary_goal_kcal: estimate.kcal,
      protein_target_g: estimate.protein_g,
      fat_target_g: estimate.fat_g,
      carbs_target_g: estimate.carbs_g,
    })
    setApplying(false)
    router.refresh()
  }

  async function saveContact() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('clients').update({
      full_name: contact.full_name.trim() || client.full_name,
      phone: contact.phone,
      email: contact.email,
      pinned_note: contact.pinned_note.trim() || null,
      food_dislikes_override: contact.food_dislikes_override.trim() || null,
      exercise_dislikes: contact.exercise_dislikes.trim() || null,
      checkin_day: contact.checkin_day || null,
      coach_notes: contact.coach_notes || null,
      status: contact.status,
    }).eq('id', client.id)
    setSaving(false)
    setEditingContact(false)
    router.refresh()
  }

  // Personalised check-in URL for this client (pre-fills email + name)
  const baseUrl =
    (typeof window !== 'undefined' && window.location.origin) ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://meal-generator-murex.vercel.app'
  const params = new URLSearchParams({ email: client.email, name: client.full_name }).toString()
  const personalisedCheckinUrl = `${baseUrl}/checkin?${params}`

  return (
    <div className="flex flex-col gap-6">
      {/* Per-client check-in link */}
      <CopyLink
        label={`Personalised check-in link for ${client.full_name}`}
        url={personalisedCheckinUrl}
        hint="Send this link to this specific client. Their name and email are pre-filled so they never need to type them."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Current weight', value: formatWeight(client.current_weight_kg) },
          {
            label: 'Total change',
            value: weightChange
              ? `${weightChange.direction === 'down' ? '−' : weightChange.direction === 'up' ? '+' : ''}${weightChange.value.toFixed(1)} kg`
              : '—',
            color: weightChange?.direction === 'down' ? '#7da87d' : weightChange?.direction === 'up' ? '#c89a6a' : undefined,
          },
          { label: 'Weeks coached', value: String(weeksCoached || 1) },
          { label: 'Check-ins logged', value: String(checkins.length) },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardBody>
              <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">{label}</p>
              <p className="text-3xl font-light" style={{ color: color ?? '#f0ece4' }}>{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Two-column row 1 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Contact & Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Contact & schedule</span>
              <Button size="sm" variant="ghost" onClick={() => setEditingContact(!editingContact)}>
                {editingContact ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {editingContact ? (
              <>
                {[
                  { key: 'full_name', label: 'Full name' },
                  { key: 'email', label: 'Email', type: 'email' },
                  { key: 'phone', label: 'Phone' },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <p className="text-xs text-[#b8b4ac] mb-1">{label}</p>
                    <input
                      type={type || 'text'}
                      className="input-underline text-sm"
                      value={contact[key as keyof typeof contact]}
                      onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <p className="text-xs text-[#b8b4ac] mb-1">Check-in day</p>
                  <select className="input-underline text-sm" value={contact.checkin_day} onChange={(e) => setContact((c) => ({ ...c, checkin_day: e.target.value }))}>
                    <option value="">None</option>
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-[#b8b4ac] mb-1">Status</p>
                  <select className="input-underline text-sm" value={contact.status} onChange={(e) => setContact((c) => ({ ...c, status: e.target.value as Client['status'] }))}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs text-[#b8b4ac] mb-1">Pinned note <span className="text-[#8a8680] italic">(shown at top of client file)</span></p>
                  <input
                    className="input-underline text-sm"
                    value={contact.pinned_note}
                    placeholder="e.g. Period week 23 May, expect water retention"
                    onChange={(e) => setContact((c) => ({ ...c, pinned_note: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-xs text-[#b8b4ac] mb-1">Extra food dislikes <span className="text-[#8a8680] italic">(in addition to onboarding, AI will never include)</span></p>
                  <textarea
                    className="input-underline text-sm"
                    rows={2}
                    value={contact.food_dislikes_override}
                    placeholder="e.g. cottage cheese, anchovies, anything with a strong smell"
                    onChange={(e) => setContact((c) => ({ ...c, food_dislikes_override: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-xs text-[#b8b4ac] mb-1">Exercise dislikes <span className="text-[#8a8680] italic">(AI will never programme these)</span></p>
                  <textarea
                    className="input-underline text-sm"
                    rows={2}
                    value={contact.exercise_dislikes}
                    placeholder="e.g. burpees, running, overhead pressing, any jumping"
                    onChange={(e) => setContact((c) => ({ ...c, exercise_dislikes: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-xs text-[#b8b4ac] mb-1">Coach notes</p>
                  <textarea
                    className="input-underline text-sm"
                    rows={2}
                    value={contact.coach_notes}
                    onChange={(e) => setContact((c) => ({ ...c, coach_notes: e.target.value }))}
                  />
                </div>
                <Button size="sm" onClick={saveContact} loading={saving}>Save changes</Button>
              </>
            ) : (
              <>
                <Row label="Email" value={client.email} />
                <Row label="Phone" value={client.phone || '—'} />
                <Row label="Check-in day" value={client.checkin_day || '—'} />
                <Row label="Last check-in" value={latestCheckin ? formatDate(latestCheckin.created_at) : '—'} />
                {client.coach_notes && (
                  <div>
                    <p className="text-xs text-[#b8b4ac] mb-1">Coach notes</p>
                    <p className="text-sm text-[#e0d8cc] leading-relaxed italic">{client.coach_notes}</p>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        {/* Vital Stats */}
        <Card>
          <CardHeader>
            <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Vital stats</span>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <Row label="Age" value={age != null ? `${age} yrs` : '—'} />
            <Row label="Sex" value={client.sex || '—'} />
            <Row label="Height" value={client.height_cm ? `${client.height_cm} cm` : '—'} />
            <Row label="Starting weight" value={formatWeight(client.starting_weight_kg)} />
            <Row label="Current weight" value={formatWeight(client.current_weight_kg)} />
            <Row label="DOB" value={client.date_of_birth ? formatDate(client.date_of_birth) : '—'} />
          </CardBody>
        </Card>
      </div>

      {/* Two-column row 2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Calculated Metrics */}
        <Card>
          <CardHeader>
            <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Calculated metrics</span>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-[#b8b4ac] mb-0.5">BMR (Mifflin-St Jeor)</p>
              <p className="text-sm text-[#f0ece4]">{bmr ? `${bmr} kcal/day` : '—'}</p>
              <p className="text-xs text-[#8a8680] mt-0.5">Calories burned at complete rest</p>
            </div>
            <div>
              <p className="text-xs text-[#b8b4ac] mb-0.5">Max HR (220 − age)</p>
              <p className="text-sm text-[#f0ece4]">{maxHR ? `${maxHR} bpm` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#b8b4ac] mb-0.5">Zone 2 range (60–70% max HR)</p>
              <p className="text-sm text-[#f0ece4]">
                {zone2 ? `${zone2.low}–${zone2.high} bpm` : '—'}
              </p>
              <p className="text-xs text-[#8a8680] mt-0.5">Aerobic base training zone</p>
            </div>
            {client.hr_resting && (
              <Row label="Resting HR" value={`${client.hr_resting} bpm`} />
            )}
          </CardBody>
        </Card>

        {/* Coach Targets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Coach targets</span>
              <div className="flex gap-1">
                {estimate && (
                  <Button size="sm" variant="ghost" onClick={() => setShowCalc((s) => !s)}>
                    {showCalc ? 'Hide calculation' : 'Show calculation'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditingTargets(!editingTargets)}>
                  {editingTargets ? 'Cancel' : 'Edit'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {editingTargets ? (
              <>
                {(() => {
                  // Guidance ranges shown beside each input field, recompute on every render
                  // from current goal + weight so they shift when you change the kcal target.
                  const live = macrosForKcal(
                    Number(targets.primary_goal_kcal) || estimate?.kcal || 2000,
                    client.current_weight_kg,
                    client.goal,
                  )
                  const guidance = live ? macroGuidance(live.protein_g, live.fat_g, live.carbs_g) : null
                  const fields: { key: keyof typeof targets; label: string; est: number | undefined; range: [number, number] | undefined }[] = [
                    { key: 'primary_goal_kcal', label: 'Calories (kcal)', est: estimate?.kcal, range: undefined },
                    { key: 'protein_target_g', label: 'Protein (g)',     est: estimate?.protein_g, range: guidance?.protein },
                    { key: 'fat_target_g',     label: 'Fat (g)',         est: estimate?.fat_g,     range: guidance?.fat },
                    { key: 'carbs_target_g',   label: 'Carbs (g)',       est: estimate?.carbs_g,   range: guidance?.carbs },
                  ]
                  return fields.map(({ key, label, est, range }) => (
                    <div key={key}>
                      <div className="flex items-baseline justify-between mb-1">
                        <p className="text-xs text-[#b8b4ac]">{label}</p>
                        {est != null && (
                          <button
                            type="button"
                            className="text-xs text-[#8a8680] hover:text-[#e0d8cc] transition-colors"
                            onClick={() => setTargets((t) => ({ ...t, [key]: String(est) }))}
                          >
                            estimate: {est}
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        className="input-underline text-sm"
                        value={targets[key]}
                        onChange={(e) => {
                          const v = e.target.value
                          if (key === 'primary_goal_kcal') {
                            // Coach has changed kcal, snap protein/fat/carbs to the research-based split
                            // for the new calorie target (same goal-tiered formulas as the estimate).
                            const kcalNum = Number(v)
                            const recomputed = macrosForKcal(kcalNum, client.current_weight_kg, client.goal)
                            setTargets((t) => ({
                              ...t,
                              primary_goal_kcal: v,
                              ...(recomputed
                                ? {
                                    protein_target_g: String(recomputed.protein_g),
                                    fat_target_g: String(recomputed.fat_g),
                                    carbs_target_g: String(recomputed.carbs_g),
                                  }
                                : {}),
                            }))
                          } else {
                            setTargets((t) => ({ ...t, [key]: v }))
                          }
                        }}
                      />
                      {range && (
                        <p className="text-xs text-[#8a8680] mt-1">Aim {range[0]}–{range[1]} g</p>
                      )}
                    </div>
                  ))
                })()}
                <p className="text-xs text-[#8a8680] italic leading-relaxed mt-1">
                  Changing the calorie target snaps protein, fat and carbs to the research-based split for the goal. You can still override any of them by hand.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveTargets} loading={saving}>Save targets</Button>
                  {estimate && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTargets({
                        primary_goal_kcal: String(estimate.kcal),
                        protein_target_g: String(estimate.protein_g),
                        fat_target_g: String(estimate.fat_g),
                        carbs_target_g: String(estimate.carbs_g),
                      })}
                    >
                      Fill all from estimate
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <Row label="Calories" value={client.primary_goal_kcal ? `${client.primary_goal_kcal} kcal` : '—'} />
                <Row label="Protein" value={client.protein_target_g ? `${client.protein_target_g} g` : '—'} />
                <Row label="Fat" value={client.fat_target_g ? `${client.fat_target_g} g` : '—'} />
                <Row label="Carbs" value={client.carbs_target_g ? `${client.carbs_target_g} g` : '—'} />
                {estimate && client.primary_goal_kcal == null && client.protein_target_g == null && (
                  <Button size="sm" variant="outline" onClick={applyEstimate} loading={applying}>
                    Apply estimated targets ({estimate.kcal} kcal · {estimate.protein_g}P / {estimate.fat_g}F / {estimate.carbs_g}C)
                  </Button>
                )}
              </>
            )}

            {/* Expandable calculation breakdown */}
            {showCalc && estimate && (
              <div className="mt-2 pt-4 border-t border-[rgba(255,255,255,0.14)] flex flex-col gap-4">
                <p className="text-xs text-[#b8b4ac] tracking-widest uppercase">How this estimate is calculated</p>

                <CalcSection title="Inputs from onboarding & vitals">
                  <CalcLine k="Weight" v={`${estimate.inputs.weight_kg} kg`} />
                  <CalcLine k="Height" v={`${estimate.inputs.height_cm} cm`} />
                  <CalcLine k="Age" v={`${estimate.inputs.age} yrs`} />
                  <CalcLine k="Sex" v={estimate.inputs.sex} />
                  <CalcLine k="Activity level" v={estimate.inputs.activity_label} />
                  <CalcLine k="Primary goal" v={estimate.inputs.goal} />
                </CalcSection>

                <CalcSection title="① BMR, Mifflin–St Jeor (1990)">
                  <p className="text-xs text-[#e0d8cc] font-mono leading-relaxed">{estimate.bmr_formula}</p>
                  <p className="text-xs text-[#8a8680] mt-1 italic">
                    The modern, more accurate refinement of the original Harris–Benedict equation, used in current BDA practice.
                  </p>
                </CalcSection>

                <CalcSection title="② TDEE, Total Daily Energy Expenditure">
                  <p className="text-xs text-[#e0d8cc] font-mono">
                    {estimate.bmr} × {estimate.inputs.activity_factor} (activity factor) = {estimate.tdee} kcal/day
                  </p>
                </CalcSection>

                <CalcSection title={`③ Goal-adjusted calories, ${estimate.goal_label}`}>
                  <p className="text-xs text-[#e0d8cc] font-mono">
                    {estimate.tdee} × {estimate.goal_factor} = <span className="text-[#f0ece4]">{estimate.kcal} kcal/day</span>
                  </p>
                  <p className="text-xs text-[#8a8680] mt-1 italic">{estimate.goal_rationale}</p>
                </CalcSection>

                <CalcSection title="④ Protein">
                  <p className="text-xs text-[#e0d8cc] font-mono">
                    {estimate.inputs.weight_kg} kg × {estimate.protein_per_kg} g/kg = <span className="text-[#f0ece4]">{estimate.protein_g} g/day</span>
                  </p>
                  <p className="text-xs text-[#8a8680] mt-1 italic">{estimate.protein_basis}</p>
                </CalcSection>

                <CalcSection title="⑤ Fat">
                  <p className="text-xs text-[#e0d8cc] font-mono">
                    <span className="text-[#f0ece4]">{estimate.fat_g} g/day</span>
                  </p>
                  <p className="text-xs text-[#8a8680] mt-1 italic">{estimate.fat_basis}</p>
                </CalcSection>

                <CalcSection title="⑥ Carbohydrates">
                  <p className="text-xs text-[#e0d8cc] font-mono">
                    {estimate.kcal} − ({estimate.protein_g} × 4) − ({estimate.fat_g} × 9) ÷ 4 = <span className="text-[#f0ece4]">{estimate.carbs_g} g/day</span>
                  </p>
                  <p className="text-xs text-[#8a8680] mt-1 italic">{estimate.carbs_basis}</p>
                </CalcSection>

                <p className="text-xs text-[#8a8680] leading-relaxed italic pt-2 border-t border-[rgba(255,255,255,0.08)]">
                  Estimates are a clinically-grounded starting point. Adjust based on client response, training load, recovery and individual context, your dietetic judgement always overrides the formula.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Latest check-in highlight */}
      {latestCheckin && (
        <Card>
          <CardHeader>
            <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">
              Latest check-in, Week {latestCheckin.week_number} · {formatDate(latestCheckin.created_at)}
            </span>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#7da87d] tracking-widest uppercase mb-2">Biggest win</p>
              <p className="text-sm text-[#e0d8cc] leading-relaxed italic">
                &ldquo;{latestCheckin.payload.biggest_win || 'Not recorded'}&rdquo;
              </p>
            </div>
            <div>
              <p className="text-xs text-[#c89a6a] tracking-widest uppercase mb-2">Hardest part</p>
              <p className="text-sm text-[#e0d8cc] leading-relaxed italic">
                &ldquo;{latestCheckin.payload.hardest_part || 'Not recorded'}&rdquo;
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Weight trend */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Weight trend, last 8 check-ins</span>
          </CardHeader>
          <CardBody className="pt-2">
            <WeightChart data={chartData} />
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#b8b4ac]">{label}</span>
      <span className="text-sm text-[#e0d8cc]">{value}</span>
    </div>
  )
}

function CalcSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-[#c89a6a] tracking-wider uppercase mb-1.5">{title}</p>
      {children}
    </div>
  )
}

function CalcLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-[#b8b4ac]">{k}</span>
      <span className="text-xs text-[#e0d8cc]">{v}</span>
    </div>
  )
}
