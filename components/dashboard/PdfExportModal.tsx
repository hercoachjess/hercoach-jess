'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import {
  SECTION_LABELS, normalizeSectionOrder,
  type PdfCustomisation, type YogaRow, type SnackItem, type CustomSection, type SectionKey,
} from '@/lib/pdf/plan-content'

interface Props {
  open: boolean
  onClose: () => void
  scope: 'meal' | 'training' | 'full'
  /** Full default customisation, freshly built by the tab on each open. */
  defaults: PdfCustomisation
  /** Whether this plan actually has a multi-week progression to show. */
  hasWeeklyProgression?: boolean
  /** Whether this meal plan has any food facts to show. */
  hasFoodFacts?: boolean
  onGenerate: (customisation: PdfCustomisation) => Promise<void>
  /** Optional: open the PDF inline in a new tab instead of downloading. */
  onPreview?: (customisation: PdfCustomisation) => Promise<void>
  /** localStorage key for a per-client saved setup (preset). */
  storageKey?: string
  generating: boolean
  previewing?: boolean
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
  onPreview,
  storageKey,
  generating,
  previewing = false,
  error,
}: Props) {
  const [cx, setCx] = useState<PdfCustomisation>(defaults)
  const [presetLoaded, setPresetLoaded] = useState(false)
  const [savedTick, setSavedTick] = useState(false)

  // Re-seed every time the modal opens. Start from the fresh defaults (so
  // edits made on the plan itself — targets, step goal, weekly progression —
  // flow through), then overlay any saved per-client setup for the section
  // toggles + wording. Macros always stay live from the current plan targets.
  useEffect(() => {
    if (!open) return
    let next = defaults
    let loaded = false
    if (storageKey && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(storageKey)
        if (raw) {
          const saved = JSON.parse(raw) as Partial<PdfCustomisation>
          next = { ...defaults, ...saved, macroOverride: defaults.macroOverride }
          loaded = true
        }
      } catch {
        /* ignore corrupt preset */
      }
    }
    setCx(next)
    setPresetLoaded(loaded)
    setSavedTick(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function set<K extends keyof PdfCustomisation>(key: K, value: PdfCustomisation[K]) {
    setCx((c) => ({ ...c, [key]: value }))
  }

  const isTrainingScope = scope === 'training'
  const isMealScope = scope === 'meal'
  const isFullScope = scope === 'full'
  // Training + nutrition content is available on the full plan and on their
  // respective single-scope exports.
  const showTraining = isTrainingScope || isFullScope
  const showNutrition = isMealScope || isFullScope

  // Sections that actually render for this scope, in the coach-chosen order.
  // (Training only appears on training/full, Nutrition on meal/full, the
  // day-by-day schedule on the full plan only.)
  const applicableKeys: SectionKey[] = isFullScope
    ? ['schedule', 'training', 'nutrition', 'yoga', 'cardio', 'general', 'custom']
    : isTrainingScope
      ? ['training', 'yoga', 'cardio', 'general', 'custom']
      : ['nutrition', 'general', 'custom']
  const orderedApplicable = normalizeSectionOrder(cx.sectionOrder).filter((k) => applicableKeys.includes(k))

  const sectionEnabled: Record<SectionKey, boolean> = {
    schedule: cx.includeSchedule,
    training: cx.includeTraining,
    yoga: cx.includeYoga,
    cardio: cx.includeCardio,
    nutrition: cx.includeNutrition,
    general: cx.includeGeneralGuidance,
    custom: cx.customSections.some((s) => s.title.trim() || s.lines.some((l) => l.trim())),
  }

  function moveSection(index: number, dir: -1 | 1) {
    const full = normalizeSectionOrder(cx.sectionOrder)
    const app = full.filter((k) => applicableKeys.includes(k))
    const rest = full.filter((k) => !applicableKeys.includes(k))
    const j = index + dir
    if (j < 0 || j >= app.length) return
    ;[app[index], app[j]] = [app[j], app[index]]
    set('sectionOrder', [...app, ...rest])
  }

  function clean(): PdfCustomisation {
    // Drop blank bullet lines and empty yoga/snack/custom rows so the PDF
    // never renders a stray empty bullet or row.
    const cleanLines = (arr: string[]) => arr.map((l) => l.replace(/\s+$/g, '')).filter((l) => l.trim().length > 0)
    return {
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
      customSections: cx.customSections
        .map((sec) => ({ title: sec.title.trim(), lines: cleanLines(sec.lines) }))
        .filter((sec) => sec.title || sec.lines.length > 0),
    }
  }

  async function generate() {
    await onGenerate(clean())
  }

  async function preview() {
    if (onPreview) await onPreview(clean())
  }

  function savePreset() {
    if (!storageKey || typeof window === 'undefined') return
    // Section choices + wording are worth remembering; macros always come
    // fresh from the plan, so don't freeze them into the preset.
    const toStore = { ...clean(), macroOverride: null }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(toStore))
      setPresetLoaded(true)
      setSavedTick(true)
      setTimeout(() => setSavedTick(false), 2500)
    } catch {
      /* storage full / unavailable — silently ignore */
    }
  }

  function resetToDefaults() {
    setCx(defaults)
    setPresetLoaded(false)
    setSavedTick(false)
    if (storageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isFullScope ? 'Review & export full plan' : isTrainingScope ? 'Review & export training plan' : 'Review & export meal plan'}
      size="xl"
      footer={
        <div className="flex items-center justify-between gap-2 w-full flex-wrap">
          <div className="flex items-center gap-2">
            {storageKey && (
              <Button variant="ghost" onClick={savePreset}>
                {savedTick ? 'Saved ✓' : 'Save setup'}
              </Button>
            )}
            {onPreview && (
              <Button variant="outline" onClick={preview} loading={previewing}>Preview</Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={generate} loading={generating}>Generate PDF</Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-xs text-[#8a8680] italic leading-relaxed">
          This is exactly what will appear on the PDF. Switch any section off, or edit its wording,
          before generating. In the bullet-list boxes each line is one bullet. Use <span className="text-[#b8b4ac]">Preview</span> to
          open a draft in a new tab, and <span className="text-[#b8b4ac]">Save setup</span> to remember these choices for this client.
          Changes only affect this export, the saved plan stays untouched.
        </p>

        {presetLoaded && (
          <div className="flex items-center justify-between gap-3 flex-wrap border border-[rgba(125,168,125,0.4)] bg-[rgba(125,168,125,0.06)] rounded-sm px-3 py-2">
            <p className="text-xs text-[#7da87d] leading-relaxed">
              Loaded your saved setup for this client. Macros &amp; stats are still taken live from the current plan.
            </p>
            <button className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] transition-colors whitespace-nowrap" onClick={resetToDefaults}>
              Reset to defaults
            </button>
          </div>
        )}

        {/* ── COVER & OVERVIEW ── */}
        <GroupHeading>Cover &amp; overview</GroupHeading>

        <Section label={isFullScope ? 'Mini intro (from you)' : 'Personal welcome card'}
          hint={isFullScope ? "The short opener at the top: name, goal, and a line in your voice about the plan." : "The warm 'This is your plan' opener pulled from onboarding."}
          checked={cx.includeWelcome} onCheck={(v) => set('includeWelcome', v)}>
          {isFullScope ? (
            <TextField label="Intro paragraph (your voice)" rows={5} value={cx.introBlurb}
              onChange={(v) => set('introBlurb', v)} />
          ) : null}
        </Section>

        <Section
          label={isFullScope ? 'Detail line (age · height · email)' : 'Client stats line'}
          hint={isFullScope ? 'The small line under the intro. No weight, macros or steps here.' : 'Age, height, current weight in the overview box. Some clients prefer this off.'}
          checked={cx.includeClientStats} onCheck={(v) => set('includeClientStats', v)}>
          {isFullScope ? (
            <p className="text-xs text-[#8a8680] italic leading-relaxed">Pulled live from the client file (age, height, email).</p>
          ) : (
            <TextField label="Text on the PDF" rows={2} value={cx.clientStatsOverride}
              placeholder="Age, height, current weight…" onChange={(v) => set('clientStatsOverride', v)} />
          )}
        </Section>

        {isFullScope ? (
          <InlineField label="Daily step goal" value={cx.stepGoal} placeholder="10,000"
            onChange={(v) => set('stepGoal', v)} hint="Used across the schedule and the cardio & movement section." />
        ) : (
          <Section label="At-a-glance chips" hint="The strip of headline numbers under the overview (calories, protein, steps, cardio target)."
            checked={cx.includeMacroChips} onCheck={(v) => set('includeMacroChips', v)}>
            <InlineField label="Daily step goal" value={cx.stepGoal} placeholder="10,000"
              onChange={(v) => set('stepGoal', v)} hint="Shown on the chips and used across the cardio & movement section." />
          </Section>
        )}

        {showNutrition && cx.macroOverride && (
          <div className="border border-[rgba(255,255,255,0.14)] rounded-sm p-4">
            <p className="text-sm text-[#f0ece4] font-medium leading-tight">Macro targets on the PDF</p>
            <p className="text-xs text-[#8a8680] italic leading-relaxed mt-0.5 mb-3">
              Amend the calories &amp; macros shown on the chips and nutrition guidance for this export.
              Seeded from the Meal Plan tab targets.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {([
                { key: 'kcal', label: 'Calories' },
                { key: 'protein_g', label: 'Protein (g)' },
                { key: 'fat_g', label: 'Fat (g)' },
                { key: 'carbs_g', label: 'Carbs (g)' },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs text-[#b8b4ac] mb-1">{label}</p>
                  <input
                    type="number"
                    className="input-underline text-sm w-full"
                    value={cx.macroOverride![key]}
                    onChange={(e) =>
                      set('macroOverride', { ...cx.macroOverride!, [key]: Number(e.target.value) })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION ORDER ── */}
        <GroupHeading>Section order</GroupHeading>
        <p className="text-xs text-[#8a8680] italic leading-relaxed -mt-1">
          Drag isn&apos;t needed, use the arrows to set the order sections appear on the PDF. The cover stays first
          and the sign-off stays last. Sections switched off keep their place but won&apos;t print.
        </p>
        <div className="flex flex-col gap-1">
          {orderedApplicable.map((key, i) => (
            <div key={key} className="flex items-center justify-between gap-2 border border-[rgba(255,255,255,0.14)] rounded-sm px-3 py-2">
              <span className="text-sm text-[#e0d8cc] flex items-center gap-2">
                <span className="text-xs text-[#8a8680] tabular-nums w-4">{i + 1}.</span>
                {SECTION_LABELS[key]}
                {!sectionEnabled[key] && <span className="text-xs text-[#8a8680] italic">· off</span>}
              </span>
              <span className="flex items-center gap-1">
                <button
                  className="p-1 text-[#b8b4ac] hover:text-[#f0ece4] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  onClick={() => moveSection(i, -1)} disabled={i === 0} aria-label={`Move ${SECTION_LABELS[key]} up`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 10V4M4 7l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button
                  className="p-1 text-[#b8b4ac] hover:text-[#f0ece4] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  onClick={() => moveSection(i, 1)} disabled={i === orderedApplicable.length - 1} aria-label={`Move ${SECTION_LABELS[key]} down`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 4v6M4 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </span>
            </div>
          ))}
        </div>

        {/* ── YOUR WEEK (full plan only) ── */}
        {isFullScope && (
          <>
            <GroupHeading>Your week (day-by-day)</GroupHeading>
            <Section label="Day-by-day schedule" hint="Each training day with the meals slotted around it, built from the client's routine. Reorder or switch off above."
              checked={cx.includeSchedule} onCheck={(v) => set('includeSchedule', v)}>
              <TextField label="Intro line above the week" rows={3} value={cx.scheduleNote}
                onChange={(v) => set('scheduleNote', v)} />
              <p className="text-xs text-[#8a8680] italic leading-relaxed mt-2">
                Meal times come from the meal plan; training is placed using the client&apos;s routine (Overview → Routine).
              </p>
            </Section>
          </>
        )}

        {/* ── TRAINING (training + full scope) ── */}
        {showTraining && (
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

        {/* ── YOGA & RECOVERY ── (fitness content: training / full scope only,
            never on a nutrition-only export) */}
        {showTraining && (
          <>
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
          </>
        )}

        {/* ── NUTRITION (meal + full scope) ── */}
        {showNutrition && (
          <>
            <GroupHeading>Nutrition</GroupHeading>
            <Toggle label="Include the whole nutrition section" hint="Master switch for Section 04 (meals, snacks, hydration, food facts)."
              checked={cx.includeNutrition} onCheck={(v) => set('includeNutrition', v)} />
            {cx.includeNutrition && (
              <div className="flex flex-col gap-4 pl-3 border-l border-[rgba(255,255,255,0.10)]">
                <p className="text-xs text-[#8a8680] italic leading-relaxed">
                  The meals themselves are edited on the Meal Plan tab. Below are the extra nutrition blocks.
                </p>

                <Section
                  label="Alternative meal options"
                  hint="Print each meal's 'same macros' swaps (edited on the Meal Plan tab). Turn off to send the core meals only."
                  checked={cx.includeAlternatives} onCheck={(v) => set('includeAlternatives', v)}
                >
                  <div className="flex items-center gap-3">
                    <FieldLabel>Show up to</FieldLabel>
                    <select
                      className="input-underline text-sm bg-transparent"
                      value={cx.maxAlternativesPerMeal}
                      onChange={(e) => set('maxAlternativesPerMeal', Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n} className="bg-[#0e0e0e]">{n}</option>
                      ))}
                    </select>
                    <span className="text-xs text-[#8a8680]">per meal</span>
                  </div>
                </Section>

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
            <Section label="Sleep & recovery" hint="Sleep hygiene and recovery guidance."
              checked={cx.includeSleep} onCheck={(v) => set('includeSleep', v)}>
              <LinesField value={cx.sleepLines} onChange={(v) => set('sleepLines', v)} rows={6} />
            </Section>
            <Section label="Stress & mindset" hint="Mindset and consistency guidance."
              checked={cx.includeStress} onCheck={(v) => set('includeStress', v)}>
              <LinesField value={cx.stressLines} onChange={(v) => set('stressLines', v)} rows={6} />
            </Section>
            {showNutrition && (
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

        {/* ── EXTRA SECTIONS ── */}
        <GroupHeading>Extra sections</GroupHeading>
        <p className="text-xs text-[#8a8680] italic leading-relaxed -mt-1">
          Add your own one-off sections for this export, e.g. supplement guidance, holiday eating, a specific
          rehab note. Each shows as a titled box near the end of the plan.
        </p>
        <CustomSectionsEditor sections={cx.customSections} onChange={(v) => set('customSections', v)} />

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

function CustomSectionsEditor({ sections, onChange }: { sections: CustomSection[]; onChange: (v: CustomSection[]) => void }) {
  const updateTitle = (i: number, title: string) =>
    onChange(sections.map((s, j) => (j === i ? { ...s, title } : s)))
  const updateLines = (i: number, lines: string[]) =>
    onChange(sections.map((s, j) => (j === i ? { ...s, lines } : s)))
  const remove = (i: number) => onChange(sections.filter((_, j) => j !== i))
  const add = () => onChange([...sections, { title: '', lines: [] }])
  return (
    <div className="flex flex-col gap-3">
      {sections.map((sec, i) => (
        <div key={i} className="border border-[rgba(255,255,255,0.14)] rounded-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <input className="input-underline text-sm flex-1" value={sec.title} placeholder="Section title (e.g. Supplements)"
              onChange={(e) => updateTitle(i, e.target.value)} />
            <button className="text-[#b8b4ac] hover:text-[#b06060] transition-colors p-1" onClick={() => remove(i)} aria-label="Remove section">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" /></svg>
            </button>
          </div>
          <LinesField value={sec.lines} onChange={(v) => updateLines(i, v)} rows={4} />
        </div>
      ))}
      <button className="text-xs text-[#b8b4ac] hover:text-[#e0d8cc] text-left transition-colors" onClick={add}>
        + Add a section
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
