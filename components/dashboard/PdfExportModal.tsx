'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { PdfCustomisation, YogaRow, SnackItem } from '@/lib/pdf/plan-content'

interface Props {
  open: boolean
  onClose: () => void
  scope: 'meal' | 'training'
  /** Full default customisation, freshly built by the tab on each open. */
  defaults: PdfCustomisation
  /** Whether this plan actually has a multi-week progression to show. */
  hasWeeklyProgression?: boolean
  /** Whether this meal plan has any food facts to show. */
  hasFoodFacts?: boolean
  onGenerate: (customisation: PdfCustomisation) => Promise<void>
  generating: boolean
  error?: string
}

/**
 * Full pre-generate review + customise modal for the plan PDF.
 *
 * Every section that will end up in the PDF is listed with a toggle and, when
 * kept, inline editors for its content. Jess can switch whole sections off,
 * amend the step goal, rewrite the yoga sequence, edit warm-ups, snacks,
 * hydration, general guidance, the note she signs off with, and so on, all
 * before a single PDF is produced. Nothing is persisted; each export is
 * customised on the fly and the saved plan is untouched.
 */
export default function PdfExportModal({
  open,
  onClose,
  scope,
  defaults,
  hasWeeklyProgression = false,
  hasFoodFacts = false,
  onGenerate,
  generating,
  error,
}: Props) {
  const [cx, setCx] = useState<PdfCustomisation>(defaults)

  // Re-seed from defaults every time the modal opens so edits made on the
  // plan itself (targets, step goal, weekly progression) flow through.
  useEffect(() => {
    if (open) setCx(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function set<K extends keyof PdfCustomisation>(key: K, value: PdfCustomisation[K]) {
    setCx((c) => ({ ...c, [key]: value }))
  }

  const isTrainingScope = scope === 'training'
  const isMealScope = scope === 'meal'

  async function generate() {
    // Clean pass: drop blank bullet lines and empty yoga/snack rows so the
    // PDF never renders a stray empty bullet or row.
    const cleanLines = (arr: string[]) => arr.map((l) => l.replace(/\s+$/g, '')).filter((l) => l.trim().length > 0)
    const cleaned: PdfCustomisation = {
      ...cx,
      warmupLines: cleanLines(cx.warmupLines),
      progressiveOverloadLines: cleanLines(cx.progressiveOverloadLines),
      cooldownLines: cleanLines(cx.cooldownLines),
      yogaApproachLines: cleanLines(cx.yogaApproachLines),
      yogaRows: cx.yogaRows.filter((r) => r.pose.trim() || r.benefit.trim()),
      cardioLines: cleanLines(cx.cardioLines),
      stepsLines: cleanLines(cx.stepsLines),
      snacks: cx.snacks.filter((sn) => sn.name.trim() || sn.detail.trim()),
      hydrationLines: cleanLines(cx.hydrationLines),
      proteinLines: cleanLines(cx.proteinLines),
      sleepLines: cleanLines(cx.sleepLines),
      stressLines: cleanLines(cx.stressLines),
      trainingDayNutritionLines: cleanLines(cx.trainingDayNutritionLines),
      noteFromJessLines: cleanLines(cx.noteFromJessLines),
    }
    await onGenerate(cleaned)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isTrainingScope ? 'Review & export training plan' : 'Review & export meal plan'}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={generate} loading={generating}>Generate PDF</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-xs text-[#8a8680] italic leading-relaxed">
          This is exactly what will appear on the PDF. Switch any section off, or edit its wording,
          before generating. In the bullet-list boxes each line is one bullet. Changes only affect
          this one export, the saved plan stays untouched.
        </p>

        {/* ── COVER & OVERVIEW ── */}
        <GroupHeading>Cover &amp; overview</GroupHeading>

        <Toggle label="Personal welcome card" hint="The warm 'This is your plan' opener pulled from onboarding."
          checked={cx.includeWelcome} onCheck={(v) => set('includeWelcome', v)} />

        <Section label="Client stats line" hint="Age, height, current weight in the overview box. Some clients prefer this off."
          checked={cx.includeClientStats} onCheck={(v) => set('includeClientStats', v)}>
          <TextField label="Text on the PDF" rows={2} value={cx.clientStatsOverride}
            placeholder="Age, height, current weight…" onChange={(v) => set('clientStatsOverride', v)} />
        </Section>

        <Section label="At-a-glance chips" hint="The strip of headline numbers under the overview (calories, protein, steps, cardio target)."
          checked={cx.includeMacroChips} onCheck={(v) => set('includeMacroChips', v)}>
          <InlineField label="Daily step goal" value={cx.stepGoal} placeholder="10,000"
            onChange={(v) => set('stepGoal', v)} hint="Shown on the chips and used across the cardio & movement section." />
        </Section>

        {isMealScope && (
          <p className="text-xs text-[#8a8680] italic leading-relaxed -mt-1">
            Calories &amp; macros come from the targets on the Meal Plan tab, edit them there and they update here on the next open.
          </p>
        )}

        {/* ── TRAINING (training scope only) ── */}
        {isTrainingScope && (
          <>
            <GroupHeading>Training plan</GroupHeading>
            <Toggle label="Include the whole training section" hint="Master switch for Section 01 (warm-up, sessions, progression, cool-down)."
              checked={cx.includeTraining} onCheck={(v) => set('includeTraining', v)} />

            {cx.includeTraining && (
              <div className="flex flex-col gap-4 pl-3 border-l border-[rgba(255,255,255,0.10)]">
                <Section label="Warm-up" hint="Shown before the sessions."
                  checked={cx.includeWarmup} onCheck={(v) => set('includeWarmup', v)}>
                  <LinesField value={cx.warmupLines} onChange={(v) => set('warmupLines', v)} rows={7} />
                </Section>

                <Toggle label="Suggested weekly structure" hint="The day-by-day overview built from the sessions."
                  checked={cx.includeWeeklyStructure} onCheck={(v) => set('includeWeeklyStructure', v)} />

                <Section label="Progressive overload box" hint="How to add load week to week."
                  checked={cx.includeProgressiveOverload} onCheck={(v) => set('includeProgressiveOverload', v)}>
                  <LinesField value={cx.progressiveOverloadLines} onChange={(v) => set('progressiveOverloadLines', v)} rows={4} />
                </Section>

                <Section label="Cool-down" hint="Stretch sequence after each session."
                  checked={cx.includeCooldown} onCheck={(v) => set('includeCooldown', v)}>
                  <LinesField value={cx.cooldownLines} onChange={(v) => set('cooldownLines', v)} rows={6} />
                </Section>

                {hasWeeklyProgression && (
                  <Section label="Multi-week progression" hint="The weeks 2–N breakdown for programmes longer than a week."
                    checked={cx.includeWeeklyProgression} onCheck={(v) => set('includeWeeklyProgression', v)}>
                    <TextField label="Override text (optional)" rows={5} value={cx.weeklyProgressionOverride}
                      placeholder="Leave blank to auto-build from the weekly progression cards…"
                      onChange={(v) => set('weeklyProgressionOverride', v)} />
                  </Section>
                )}
              </div>
            )}
          </>
        )}

        {/* ── YOGA & RECOVERY ── */}
        <GroupHeading>Yoga &amp; active recovery</GroupHeading>
        <Toggle label="Include the yoga & recovery section" hint="Turn off if this client doesn't want a yoga / mobility day."
          checked={cx.includeYoga} onCheck={(v) => set('includeYoga', v)} />
        {cx.includeYoga && (
          <div className="flex flex-col gap-4 pl-3 border-l border-[rgba(255,255,255,0.10)]">
            <TextField label="Intro paragraph" rows={3} value={cx.yogaIntro} onChange={(v) => set('yogaIntro', v)} />
            <div>
              <FieldLabel>How to approach it</FieldLabel>
              <LinesField value={cx.yogaApproachLines} onChange={(v) => set('yogaApproachLines', v)} rows={5} />
            </div>
            <YogaEditor rows={cx.yogaRows} onChange={(v) => set('yogaRows', v)} />
            <TextField label="Yoga tip" rows={3} value={cx.yogaTip} onChange={(v) => set('yogaTip', v)} />
          </div>
        )}

        {/* ── CARDIO & MOVEMENT ── */}
        <GroupHeading>Cardio &amp; daily movement</GroupHeading>
        <Toggle label="Include cardio & movement section" hint="Steady-state cardio, daily steps and heart-rate zones."
          checked={cx.includeCardio} onCheck={(v) => set('includeCardio', v)} />
        {cx.includeCardio && (
          <div className="flex flex-col gap-4 pl-3 border-l border-[rgba(255,255,255,0.10)]">
            <div>
              <FieldLabel>Cardio guidance</FieldLabel>
              <LinesField value={cx.cardioLines} onChange={(v) => set('cardioLines', v)} rows={6} />
            </div>
            <div>
              <FieldLabel>Daily steps guidance</FieldLabel>
              <LinesField value={cx.stepsLines} onChange={(v) => set('stepsLines', v)} rows={6} />
            </div>
            <Toggle label="Heart-rate zones table" hint="The Zone 1–5 reference table with your Zone 2 target highlighted."
              checked={cx.includeHRZones} onCheck={(v) => set('includeHRZones', v)} />
          </div>
        )}

        {/* ── NUTRITION (meal scope only) ── */}
        {isMealScope && (
          <>
            <GroupHeading>Nutrition</GroupHeading>
            <Toggle label="Include the whole nutrition section" hint="Master switch for Section 04 (meals, snacks, hydration, food facts)."
              checked={cx.includeNutrition} onCheck={(v) => set('includeNutrition', v)} />
            {cx.includeNutrition && (
              <div className="flex flex-col gap-4 pl-3 border-l border-[rgba(255,255,255,0.10)]">
                <p className="text-xs text-[#8a8680] italic leading-relaxed">
                  The meals themselves are edited on the Meal Plan tab. Below are the extra nutrition blocks.
                </p>
                <Section label="Snack ideas strip" hint="The row of go-to snacks."
                  checked={cx.includeSnacks} onCheck={(v) => set('includeSnacks', v)}>
                  <SnackEditor snacks={cx.snacks} onChange={(v) => set('snacks', v)} />
                </Section>

                <Section label="Hydration & protein box" hint="Two-column hydration + protein / balanced-meals guidance."
                  checked={cx.includeHydration} onCheck={(v) => set('includeHydration', v)}>
                  <div className="flex flex-col gap-3">
                    <div>
                      <FieldLabel>Hydration</FieldLabel>
                      <LinesField value={cx.hydrationLines} onChange={(v) => set('hydrationLines', v)} rows={6} />
                    </div>
                    <div>
                      <FieldLabel>Protein / balanced meals</FieldLabel>
                      <LinesField value={cx.proteinLines} onChange={(v) => set('proteinLines', v)} rows={6} />
                    </div>
                  </div>
                </Section>

                {hasFoodFacts && (
                  <Toggle label="'The science behind your plan' facts" hint="The evidence-based food facts with sources. Edit the facts on the Meal Plan tab."
                    checked={cx.includeFoodFacts} onCheck={(v) => set('includeFoodFacts', v)} />
                )}
              </div>
            )}
          </>
        )}

        {/* ── GENERAL GUIDANCE ── */}
        <GroupHeading>General guidance</GroupHeading>
        <Toggle label="Include the general guidance section" hint="Master switch for Section 05 (sleep, stress, note from Jess)."
          checked={cx.includeGeneralGuidance} onCheck={(v) => set('includeGeneralGuidance', v)} />
        {cx.includeGeneralGuidance && (
          <div className="flex flex-col gap-4 pl-3 border-l border-[rgba(255,255,255,0.10)]">
            <div>
              <FieldLabel>Sleep &amp; recovery</FieldLabel>
              <LinesField value={cx.sleepLines} onChange={(v) => set('sleepLines', v)} rows={6} />
            </div>
            <div>
              <FieldLabel>Stress &amp; mindset</FieldLabel>
              <LinesField value={cx.stressLines} onChange={(v) => set('stressLines', v)} rows={6} />
            </div>
            {isMealScope && (
              <Section label="Training-day nutrition timing" hint="Pre / post-workout fuelling guidance."
                checked={cx.includeTrainingDayNutrition} onCheck={(v) => set('includeTrainingDayNutrition', v)}>
                <LinesField value={cx.trainingDayNutritionLines} onChange={(v) => set('trainingDayNutritionLines', v)} rows={4} />
              </Section>
            )}
            <Section label="A note from Jess" hint="Your personal sign-off to the client."
              checked={cx.includeNoteFromJess} onCheck={(v) => set('includeNoteFromJess', v)}>
              <LinesField value={cx.noteFromJessLines} onChange={(v) => set('noteFromJessLines', v)} rows={6} />
            </Section>
          </div>
        )}

        <Toggle label="Closing panel & disclaimers" hint="The hercoach sign-off with the professional registration and safety disclaimers. Recommended to keep on."
          checked={cx.includeClosing} onCheck={(v) => set('includeClosing', v)} />

        {error && <p className="text-xs text-[#b06060]">{error}</p>}
      </div>
    </Modal>
  )
}

// ── Building blocks ──────────────────────────────────────────────────────

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-[#c89a6a] tracking-widest uppercase pt-2 border-t border-[rgba(255,255,255,0.10)]">
      {children}
    </p>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[#b8b4ac] mb-1">{children}</p>
}

function ToggleBox({
  label, hint, checked, onCheck, children,
}: {
  label: string; hint: string; checked: boolean; onCheck: (v: boolean) => void; children?: React.ReactNode
}) {
  return (
    <div className="border border-[rgba(255,255,255,0.14)] rounded-sm p-4">
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input type="checkbox" className="h-4 w-4 mt-0.5" checked={checked}
          onChange={(e) => onCheck(e.target.checked)} style={{ touchAction: 'manipulation' }} />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-[#f0ece4] font-medium block leading-tight">{label}</span>
          <span className="text-xs text-[#8a8680] italic leading-relaxed mt-0.5 block">{hint}</span>
        </div>
      </label>
      {children}
    </div>
  )
}

/** Toggle with no editable body. */
function Toggle(props: { label: string; hint: string; checked: boolean; onCheck: (v: boolean) => void }) {
  return <ToggleBox {...props} />
}

/** Toggle that reveals editable content when kept on. */
function Section({
  label, hint, checked, onCheck, children,
}: {
  label: string; hint: string; checked: boolean; onCheck: (v: boolean) => void; children: React.ReactNode
}) {
  return (
    <ToggleBox label={label} hint={hint} checked={checked} onCheck={onCheck}>
      {checked && <div className="mt-3">{children}</div>}
    </ToggleBox>
  )
}

function TextField({
  label, value, onChange, rows = 2, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea className="input-underline text-sm w-full" rows={rows} value={value}
        placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function InlineField({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input className="input-underline text-sm w-full" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-[#8a8680] italic mt-1">{hint}</p>}
    </div>
  )
}

/** Edits a string[] as newline-separated bullets. */
function LinesField({ value, onChange, rows = 4 }: { value: string[]; onChange: (v: string[]) => void; rows?: number }) {
  return (
    <textarea
      className="input-underline text-sm w-full"
      rows={rows}
      value={value.join('\n')}
      placeholder="One bullet per line…"
      onChange={(e) => onChange(e.target.value.split('\n'))}
    />
  )
}

function YogaEditor({ rows, onChange }: { rows: YogaRow[]; onChange: (v: YogaRow[]) => void }) {
  const update = (i: number, field: keyof YogaRow, val: string) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, [field]: val } : r)))
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i))
  const add = () => onChange([...rows, { pose: '', dur: '', benefit: '' }])
  return (
    <div>
      <FieldLabel>Yoga sequence</FieldLabel>
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-col gap-1 border-b border-[rgba(255,255,255,0.06)] pb-2 last:border-b-0">
            <div className="grid grid-cols-[1fr_70px_auto] gap-2 items-center">
              <input className="input-underline text-sm" value={r.pose} placeholder="Pose / sequence"
                onChange={(e) => update(i, 'pose', e.target.value)} />
              <input className="input-underline text-sm text-center" value={r.dur} placeholder="Duration"
                onChange={(e) => update(i, 'dur', e.target.value)} />
              <button className="text-[#b8b4ac] hover:text-[#b06060] transition-colors p-1" onClick={() => remove(i)} aria-label="Remove pose">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" /></svg>
              </button>
            </div>
            <input className="input-underline text-xs text-[#b8b4ac]" value={r.benefit} placeholder="Benefit & notes"
              onChange={(e) => update(i, 'benefit', e.target.value)} />
          </div>
        ))}
      </div>
      <button className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] text-left transition-colors mt-2" onClick={add}>
        + Add pose
      </button>
    </div>
  )
}

function SnackEditor({ snacks, onChange }: { snacks: SnackItem[]; onChange: (v: SnackItem[]) => void }) {
  const update = (i: number, field: keyof SnackItem, val: string) =>
    onChange(snacks.map((s, j) => (j === i ? { ...s, [field]: val } : s)))
  const remove = (i: number) => onChange(snacks.filter((_, j) => j !== i))
  const add = () => onChange([...snacks, { name: '', detail: '' }])
  return (
    <div>
      <FieldLabel>Snack ideas</FieldLabel>
      <div className="flex flex-col gap-2">
        {snacks.map((sn, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
            <input className="input-underline text-sm" value={sn.name} placeholder="Snack"
              onChange={(e) => update(i, 'name', e.target.value)} />
            <textarea className="input-underline text-xs" rows={2} value={sn.detail} placeholder="Portion / detail"
              onChange={(e) => update(i, 'detail', e.target.value)} />
            <button className="text-[#b8b4ac] hover:text-[#b06060] transition-colors p-1" onClick={() => remove(i)} aria-label="Remove snack">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" /></svg>
            </button>
          </div>
        ))}
      </div>
      <button className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] text-left transition-colors mt-2" onClick={add}>
        + Add snack
      </button>
    </div>
  )
}
