/* eslint-disable jsx-a11y/alt-text, @typescript-eslint/no-explicit-any */
import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'
import type { Client, MealPlan, TrainingPlan, Meal, MealAlternative, OnboardingSubmission } from '@/types'
import { normalizeMealItems } from '@/lib/meal'
import { itemHasMacros, itemMacros, mealMacros, formatItemDisplay, formatMacrosShort } from '@/lib/meal-macros'
import type { ReactNode } from 'react'
import {
  buildDefaultCustomisation, computeHrZones, normalizeSectionOrder,
  type PdfCustomisation, type HrZoneRow, type SectionKey,
} from '@/lib/pdf/plan-content'

// ───────────────── FONTS ─────────────────
// Using PDF built-in fonts (Helvetica + Times-Italic) so PDFs always generate
// without depending on external font URLs that can break. Times-Italic gives
// the serif-italic look for the logo wordmark and section titles.

// ───────────────── COLOURS (match Python) ─────────────────
const C = {
  BLACK:      '#080808',
  OFF_BLACK:  '#141414',
  DARK_GREY:  '#262626',
  MID_GREY:   '#888888',
  LIGHT_GREY: '#c8c8c8',
  RULE_LIGHT: '#dedad4',
  WARM_WHITE: '#f0ece4',
  CREAM:      '#e8e0d4',
  LINEN:      '#f5f2ed',
  ROW_A:      '#faf8f5',
  ROW_B:      '#f2efe9',
  ZONE2_HL:   '#eae5dc',
  TEXT_DARK:  '#333333',
  TEXT_MID:   '#444444',
  ACCENT:     '#3a3530',
}

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    color: C.OFF_BLACK,
    fontFamily: 'Helvetica',
    paddingTop: 170,       // header bar takes this
    paddingBottom: 56,     // footer bar
    paddingHorizontal: 50,
    fontSize: 9,
  },
  // Header bar
  headerBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 154,
    backgroundColor: C.BLACK,
    paddingHorizontal: 50, paddingTop: 26,
  },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoMain: { fontFamily: 'Times-Italic', fontSize: 26, color: C.WARM_WHITE },
  logoDot:  { fontSize: 22, color: C.LIGHT_GREY, marginHorizontal: 4 },
  logoJess: { fontFamily: 'Times-Italic', fontSize: 28, color: C.WARM_WHITE },
  tagline:  { fontSize: 7, color: '#666666', marginTop: 6, letterSpacing: 2.5 },
  taglineRule: { borderBottomWidth: 0.4, borderBottomColor: C.ACCENT, width: 220, marginTop: 3 },
  rdBadge: {
    position: 'absolute', right: 50, top: 24,
    width: 168, height: 90, borderRadius: 3,
    backgroundColor: C.DARK_GREY,
    borderWidth: 0.4, borderColor: C.ACCENT,
    paddingTop: 8, alignItems: 'center', justifyContent: 'flex-start',
  },
  rdTitle: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.LIGHT_GREY, marginBottom: 6, letterSpacing: 1 },
  rdLine:  { fontSize: 6.8, color: '#aaaaaa', textAlign: 'center', marginBottom: 2 },
  rdPin:   { fontFamily: 'Helvetica-Oblique', fontSize: 6, color: '#666666', marginTop: 4, textAlign: 'center' },

  // Footer bar
  footerBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
    backgroundColor: C.OFF_BLACK, paddingHorizontal: 50,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerL: { fontSize: 6, color: C.MID_GREY },
  footerR: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.LIGHT_GREY },

  // Welcome strip
  welcomeStrip: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 0.5, borderBottomColor: C.RULE_LIGHT,
    marginBottom: 12,
  },
  welcomeL: { fontSize: 8, color: C.MID_GREY },
  welcomeR: { fontFamily: 'Helvetica-Oblique', fontSize: 8, color: C.MID_GREY },

  // Section heading
  eyebrow: { fontSize: 7, color: C.MID_GREY, letterSpacing: 1.2, marginBottom: 2 },
  sectionTitle: {
    fontFamily: 'Times-Italic', fontSize: 18, color: C.BLACK,
    marginBottom: 6,
  },
  sectionRule: { borderBottomWidth: 0.5, borderBottomColor: C.RULE_LIGHT, marginBottom: 12 },

  // Day heading
  dayHead: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.BLACK, marginTop: 8, marginBottom: 4 },

  // Notes (italic muted)
  noteText: { fontFamily: 'Helvetica-Oblique', fontSize: 8, color: C.MID_GREY, lineHeight: 1.5, marginBottom: 2 },

  // Dark info box
  darkBox: {
    backgroundColor: C.BLACK, padding: 12, borderRadius: 2,
    marginVertical: 4,
  },
  darkBoxHead: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.WARM_WHITE, marginBottom: 6 },
  darkBoxItem: { fontSize: 8.5, color: C.CREAM, marginBottom: 3, lineHeight: 1.55 },

  // Linen info box
  linenBox: {
    backgroundColor: C.LINEN, padding: 12, borderRadius: 2,
    borderWidth: 0.5, borderColor: C.RULE_LIGHT, marginVertical: 4,
  },
  linenBoxHead: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.BLACK, marginBottom: 6 },
  linenBoxItem: { fontSize: 8.5, color: C.TEXT_MID, marginBottom: 3, lineHeight: 1.55 },

  // Personal welcome card (page 1)
  welcomeCard: {
    backgroundColor: C.LINEN,
    borderWidth: 0.5, borderColor: C.RULE_LIGHT,
    padding: 16, borderRadius: 2,
    marginBottom: 10,
  },
  welcomeEyebrow: { fontSize: 7, color: C.MID_GREY, letterSpacing: 1.4, marginBottom: 4 },
  welcomeGreeting: { fontFamily: 'Times-Italic', fontSize: 17, color: C.BLACK, marginBottom: 8 },
  welcomeBody: { fontSize: 9, color: C.TEXT_DARK, lineHeight: 1.6, marginBottom: 6 },
  welcomeBlockLabel: { fontSize: 7, color: C.MID_GREY, letterSpacing: 1, marginTop: 6, marginBottom: 3 },
  welcomeQuote: {
    fontFamily: 'Times-Italic', fontSize: 9.5, color: C.OFF_BLACK,
    lineHeight: 1.55, marginBottom: 6,
    borderLeftWidth: 1, borderLeftColor: C.MID_GREY, paddingLeft: 8,
  },

  // Macro chip
  chipRow: {
    flexDirection: 'row',
    backgroundColor: C.LINEN,
    borderWidth: 0.5, borderColor: C.RULE_LIGHT,
    marginBottom: 14,
  },
  chip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRightWidth: 0.5, borderRightColor: C.RULE_LIGHT,
  },
  chipValue: { fontFamily: 'Times-Italic', fontSize: 15, color: C.BLACK },
  chipLabel: { fontSize: 7, color: C.MID_GREY, marginTop: 3, letterSpacing: 0.5 },

  // Two-column linen
  twoCol: { flexDirection: 'row', gap: 6 },
  colHalf: { flex: 1, backgroundColor: C.LINEN, padding: 12, borderWidth: 0.5, borderColor: C.RULE_LIGHT, borderRadius: 2 },

  // Table, exercise / meal / yoga / HR
  tableHeader: { flexDirection: 'row', backgroundColor: C.BLACK, paddingVertical: 6, paddingHorizontal: 6 },
  tableHeaderCell: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.WARM_WHITE, letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 6, borderTopWidth: 0.3, borderTopColor: C.RULE_LIGHT },
  tableRowA: { backgroundColor: C.ROW_A },
  tableRowB: { backgroundColor: C.ROW_B },
  cellEx:    { fontSize: 9, color: C.OFF_BLACK, lineHeight: 1.4 },
  cellSR:    { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.BLACK, textAlign: 'center' },
  cellNote:  { fontFamily: 'Helvetica-Oblique', fontSize: 7.5, color: C.MID_GREY, lineHeight: 1.5 },
  cellMealLbl:{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.BLACK },
  cellMealDet:{ fontSize: 8.5, color: C.TEXT_MID, lineHeight: 1.5 },
  // ── New meal-block styles ──
  mealItemFood:  { fontSize: 9, color: C.OFF_BLACK, lineHeight: 1.45 },
  mealItemBrand: { fontFamily: 'Helvetica-Oblique', fontSize: 8.5, color: C.TEXT_MID, lineHeight: 1.45, textAlign: 'right' },
  mealPrepLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.MID_GREY, letterSpacing: 0.5, marginTop: 6, marginBottom: 2 },
  mealPrepBody:  { fontFamily: 'Helvetica-Oblique', fontSize: 8.5, color: C.TEXT_MID, lineHeight: 1.55, marginBottom: 4 },
  altCard:       { borderLeftWidth: 1, borderLeftColor: C.RULE_LIGHT, paddingLeft: 8, marginTop: 6, marginLeft: 2 },
  altLabel:      { fontFamily: 'Helvetica-Oblique', fontSize: 7.5, color: C.MID_GREY, marginBottom: 3, letterSpacing: 0.3 },
  cellYogaHead:{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.BLACK },
  cellYogaBody:{ fontFamily: 'Helvetica-Oblique', fontSize: 8.5, color: C.TEXT_MID, lineHeight: 1.5 },

  // Snack strip
  snackStrip: { flexDirection: 'row', backgroundColor: C.LINEN, borderWidth: 0.3, borderColor: C.RULE_LIGHT },
  snackCell: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRightWidth: 0.3, borderRightColor: C.RULE_LIGHT },
  snackName: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.BLACK, textAlign: 'center', marginBottom: 2 },
  snackDet:  { fontSize: 7.5, color: C.MID_GREY, textAlign: 'center', lineHeight: 1.4 },

  // Closing panel
  closeBox: {
    backgroundColor: C.LINEN, borderWidth: 0.5, borderColor: C.RULE_LIGHT,
    padding: 22, marginTop: 16, alignItems: 'center',
  },
  closeLogo: { fontFamily: 'Times-Italic', fontSize: 24, color: C.BLACK, marginBottom: 4 },
  closeTag:  { fontFamily: 'Helvetica-Oblique', fontSize: 9, color: C.MID_GREY, marginTop: 4 },
  closeCred: { fontSize: 8, color: C.MID_GREY, marginTop: 10, textAlign: 'center' },
  closeRule: { borderBottomWidth: 0.4, borderBottomColor: C.RULE_LIGHT, width: '60%', marginVertical: 8 },
  closeDisc: { fontFamily: 'Helvetica-Oblique', fontSize: 7.5, color: C.LIGHT_GREY, textAlign: 'center', marginTop: 6, lineHeight: 1.5 },

  // Plain paragraph
  para: { fontSize: 9, color: C.TEXT_DARK, lineHeight: 1.55, marginBottom: 4 },
})

// ───────────────── HELPER COMPONENTS ─────────────────
function HeaderBar() {
  return (
    <View fixed style={s.headerBar}>
      <View style={s.logoRow}>
        <Text style={s.logoMain}>hercoach</Text>
        <Text style={s.logoDot}>·</Text>
        <Text style={s.logoJess}>Jess</Text>
      </View>
      <Text style={s.tagline}>L E S S   R E S T R I C T I O N .   M O R E   Y O U .</Text>
      <View style={s.taglineRule} />

      <View style={s.rdBadge}>
        <Text style={s.rdTitle}>REGISTERED DIETITIAN</Text>
        <Text style={s.rdLine}>HCPC Registered  ·  BDA Member</Text>
        <Text style={s.rdLine}>England &amp; Wales</Text>
        <Text style={s.rdPin}>PIN available on request</Text>
      </View>
    </View>
  )
}

function FooterBar() {
  return (
    <View fixed style={s.footerBar}>
      <Text style={s.footerL}>
        hercoach Jess  ·  Registered Dietitian  ·  HCPC Registered  ·  England &amp; Wales  ·  Personalised &amp; confidential, not for redistribution
      </Text>
      <Text style={s.footerR} render={({ pageNumber }) => `Page ${pageNumber}`} />
    </View>
  )
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View>
      <Text style={s.eyebrow}>{eyebrow.toUpperCase()}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionRule} />
    </View>
  )
}

function DarkBox({ head, lines }: { head: string; lines: string[] }) {
  return (
    <View style={s.darkBox} wrap={false}>
      <Text style={s.darkBoxHead}>{head}</Text>
      {lines.map((l, i) => (
        <Text key={i} style={s.darkBoxItem}>–  {l}</Text>
      ))}
    </View>
  )
}

function LinenBox({ head, lines }: { head: string; lines: string[] }) {
  return (
    <View style={s.linenBox} wrap={false}>
      <Text style={s.linenBoxHead}>{head}</Text>
      {lines.map((l, i) => (
        <Text key={i} style={s.linenBoxItem}>–  {l}</Text>
      ))}
    </View>
  )
}

/**
 * Personalised welcome card on the first page of the plan PDF.
 *
 * Pulls from the latest onboarding submission so the plan opens with
 * the client's OWN reason for being here, in their own words. Falls
 * back gracefully when fields are thin, the warm greeting + plan
 * summary always render.
 */
function WelcomeCard({
  client,
  onboarding,
  trainingPlan,
  mealPlan,
  isTrainingOnly,
}: {
  client: Client
  onboarding: OnboardingSubmission | null
  trainingPlan: TrainingPlan | null
  mealPlan: MealPlan | null
  isTrainingOnly: boolean
}) {
  const firstName = (client.full_name || '').split(' ')[0] || client.full_name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = onboarding?.payload ?? {}
  const why: string = (p?.goals?.why || '').trim()
  const primaryGoal: string = (p?.goals?.primary_goal || client.goal || '').trim()
  const timeline: string = (p?.goals?.timeline || '').trim()

  // Programme bits at-a-glance. Training-only exports skip the
  // macro line entirely; the training PDF has no nutrition content.
  const summaryBits: string[] = []
  if (!isTrainingOnly) {
    if (mealPlan?.targets?.kcal) {
      summaryBits.push(`${mealPlan.targets.kcal} kcal · ${mealPlan.targets.protein_g}g protein daily`)
    } else if (client.primary_goal_kcal) {
      summaryBits.push(`${client.primary_goal_kcal} kcal · ${client.protein_target_g ?? '—'}g protein daily`)
    }
  }
  if (trainingPlan?.days_per_week) {
    const wks = trainingPlan.programme_length_weeks && trainingPlan.programme_length_weeks > 1
      ? `${trainingPlan.programme_length_weeks}-week programme`
      : ''
    summaryBits.push(`${trainingPlan.days_per_week} training days/week${wks ? ` · ${wks}` : ''}`)
  }
  if (timeline) summaryBits.push(`Timeline: ${timeline}`)

  return (
    <View style={s.welcomeCard} wrap={false}>
      <Text style={s.welcomeEyebrow}>FOR {firstName.toUpperCase()}</Text>
      <Text style={s.welcomeGreeting}>This is your plan, {firstName}.</Text>

      <Text style={s.welcomeBody}>
        Built around what you told me at onboarding{primaryGoal ? `: ${primaryGoal.toLowerCase()}` : ''}.
        Everything in here is personalised to your food preferences, training experience,
        and any health considerations you shared. The numbers, brands, and timings are
        guides, not rules, message me anytime if something isn&apos;t working for you.
      </Text>

      {why && (
        <>
          <Text style={s.welcomeBlockLabel}>WHY THIS MATTERS TO YOU</Text>
          <Text style={s.welcomeQuote}>&ldquo;{why}&rdquo;</Text>
        </>
      )}

      {summaryBits.length > 0 && (
        <>
          <Text style={s.welcomeBlockLabel}>YOUR PROGRAMME AT A GLANCE</Text>
          {summaryBits.map((b, i) => (
            <Text key={i} style={[s.welcomeBody, { marginBottom: 2 }]}>· {b}</Text>
          ))}
        </>
      )}

      <Text style={s.welcomeBlockLabel}>HOW TO USE THIS</Text>
      <Text style={s.welcomeBody}>
        Read through it once start to finish so nothing&apos;s a surprise. Then pick your
        meal options from the alternatives where you fancy, follow training as written
        with the cues, and let me know in your weekly check-in how it&apos;s landing.
        We adjust together.
      </Text>
    </View>
  )
}

function TwoCol({ lHead, lLines, rHead, rLines }: { lHead: string; lLines: string[]; rHead: string; rLines: string[] }) {
  return (
    <View style={s.twoCol} wrap={false}>
      <View style={s.colHalf}>
        <Text style={s.linenBoxHead}>{lHead}</Text>
        {lLines.map((l, i) => <Text key={i} style={s.linenBoxItem}>–  {l}</Text>)}
      </View>
      <View style={s.colHalf}>
        <Text style={s.linenBoxHead}>{rHead}</Text>
        {rLines.map((l, i) => <Text key={i} style={s.linenBoxItem}>–  {l}</Text>)}
      </View>
    </View>
  )
}

function MacroChips({ chips }: { chips: [string, string][] }) {
  return (
    <View style={s.chipRow} wrap={false}>
      {chips.map(([val, lbl], i) => (
        <View key={i} style={[s.chip, i === chips.length - 1 ? { borderRightWidth: 0 } : {}]}>
          <Text style={s.chipValue}>{val}</Text>
          <Text style={s.chipLabel}>{lbl}</Text>
        </View>
      ))}
    </View>
  )
}

function ExerciseTable({ rows }: { rows: { name: string; sr: string; note?: string }[] }) {
  return (
    <View wrap={false}>
      <View style={s.tableHeader}>
        <Text style={[s.tableHeaderCell, { flex: 40 }]}>EXERCISE</Text>
        <Text style={[s.tableHeaderCell, { flex: 15, textAlign: 'center' }]}>SETS × REPS</Text>
        <Text style={[s.tableHeaderCell, { flex: 45 }]}>COACHING NOTE</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 0 ? s.tableRowA : s.tableRowB]}>
          <Text style={[s.cellEx, { flex: 40 }]}>{r.name}</Text>
          <Text style={[s.cellSR, { flex: 15 }]}>{r.sr}</Text>
          <Text style={[s.cellNote, { flex: 45 }]}>{r.note ?? ''}</Text>
        </View>
      ))}
    </View>
  )
}

/**
 * Renders one meal: ingredient list (food on the left, optional brand on the
 * right), prep notes below, then any alternative versions in a side-cued
 * card. Replaces the old MealTable approach that repeated the meal name in
 * the first column for every single ingredient row.
 */
function MealBlock({ meal, showMacros }: { meal: Meal; showMacros: boolean }) {
  const items = normalizeMealItems(meal.items)
  const mealHasMacros = items.some(itemHasMacros)
  return (
    <View wrap={false}>
      {showMacros && mealHasMacros && (
        <Text style={[s.mealPrepLabel, { marginTop: 2, marginBottom: 4, color: '#666' }]}>
          {formatMacrosShort(mealMacros({ ...meal, items }))}
        </Text>
      )}
      {items.map((item, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 0 ? s.tableRowA : s.tableRowB]}>
          <Text style={[s.mealItemFood, { flex: 60 }]}>{formatItemDisplay(item)}</Text>
          <Text style={[s.mealItemBrand, { flex: 40 }]}>
            {showMacros && itemHasMacros(item) ? formatMacrosShort(itemMacros(item)) : (item.brand || '')}
          </Text>
        </View>
      ))}
      {meal.prep_notes && meal.prep_notes.trim().length > 0 && (
        <View>
          <Text style={s.mealPrepLabel}>PREP</Text>
          <Text style={s.mealPrepBody}>{meal.prep_notes.trim()}</Text>
        </View>
      )}
      {(meal.alternatives ?? []).map((alt, i) => (
        <MealAltBlock key={i} alt={alt} showMacros={showMacros} />
      ))}
    </View>
  )
}

function MealAltBlock({ alt, showMacros }: { alt: MealAlternative; showMacros: boolean }) {
  const items = normalizeMealItems(alt.items)
  if (!alt.label && items.length === 0) return null
  const altHasMacros = items.some(itemHasMacros)
  // Render alternatives as clearly subordinate "Or try…" swap options
  // rather than as standalone meals. Smaller / italic / muted so the
  // main meal stays the focal point on the page.
  const labelText = alt.label ? `Or try, ${alt.label.toLowerCase()}` : 'Or try'
  return (
    <View style={s.altCard} wrap={false}>
      <Text style={s.altLabel}>{labelText}</Text>
      {showMacros && altHasMacros && (
        <Text style={[s.mealPrepBody, { fontSize: 7.5, marginBottom: 2 }]}>
          {formatMacrosShort(mealMacros({ name: '', time: '', items }))}
        </Text>
      )}
      {items.map((item, i) => (
        <View key={i} style={[s.tableRow, { backgroundColor: 'transparent', paddingVertical: 2, borderTopWidth: 0 }]}>
          <Text style={[s.mealItemFood, { flex: 60, fontSize: 8 }]}>{formatItemDisplay(item)}</Text>
          <Text style={[s.mealItemBrand, { flex: 40, fontSize: 7.5 }]}>{item.brand || ''}</Text>
        </View>
      ))}
      {alt.prep_notes && alt.prep_notes.trim().length > 0 && (
        <Text style={[s.mealPrepBody, { fontSize: 7.5, marginTop: 2 }]}>{alt.prep_notes.trim()}</Text>
      )}
    </View>
  )
}

function YogaTable({ rows }: { rows: { pose: string; dur: string; benefit: string }[] }) {
  return (
    <View>
      <View style={s.tableHeader}>
        <Text style={[s.tableHeaderCell, { flex: 35 }]}>POSE / SEQUENCE</Text>
        <Text style={[s.tableHeaderCell, { flex: 15, textAlign: 'center' }]}>DURATION</Text>
        <Text style={[s.tableHeaderCell, { flex: 50 }]}>BENEFIT &amp; NOTES</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 0 ? s.tableRowA : s.tableRowB]}>
          <Text style={[s.cellYogaHead, { flex: 35 }]}>{r.pose}</Text>
          <Text style={[s.cellSR, { flex: 15 }]}>{r.dur}</Text>
          <Text style={[s.cellYogaBody, { flex: 50 }]}>{r.benefit}</Text>
        </View>
      ))}
    </View>
  )
}

function SnackStrip({ snacks }: { snacks: [string, string][] }) {
  return (
    <View style={s.snackStrip} wrap={false}>
      {snacks.map(([name, det], i) => (
        <View key={i} style={[s.snackCell, i === snacks.length - 1 ? { borderRightWidth: 0 } : {}]}>
          <Text style={s.snackName}>{name}</Text>
          <Text style={s.snackDet}>{det}</Text>
        </View>
      ))}
    </View>
  )
}

function HRTable({ zones }: { zones: HrZoneRow[] }) {
  return (
    <View>
      <View style={s.tableHeader}>
        <Text style={[s.tableHeaderCell, { flex: 7, textAlign: 'center' }]}>ZONE</Text>
        <Text style={[s.tableHeaderCell, { flex: 13 }]}>INTENSITY</Text>
        <Text style={[s.tableHeaderCell, { flex: 17, textAlign: 'center' }]}>HR (est.)</Text>
        <Text style={[s.tableHeaderCell, { flex: 29 }]}>FEELS LIKE</Text>
        <Text style={[s.tableHeaderCell, { flex: 34 }]}>USE FOR</Text>
      </View>
      {zones.map((r, i) => {
        const isZone2 = r.z === '2'
        const bg = isZone2 ? { backgroundColor: C.ZONE2_HL } : (i % 2 === 0 ? s.tableRowA : s.tableRowB)
        return (
          <View key={i} style={[s.tableRow, bg]}>
            <Text style={[s.cellSR, { flex: 7 }]}>{r.z}</Text>
            <Text style={[s.cellEx, { flex: 13 }]}>{r.intensity}</Text>
            <Text style={[s.cellSR, { flex: 17 }]}>{r.hr}</Text>
            <Text style={[s.cellNote, { flex: 29 }]}>{r.feel}</Text>
            <Text style={[s.cellNote, { flex: 34 }]}>{r.use}</Text>
          </View>
        )
      })}
    </View>
  )
}

// ───────────────── MAIN DOC ─────────────────
interface Props {
  client: Client
  mealPlan: MealPlan | null
  trainingPlan: TrainingPlan | null
  onboarding?: OnboardingSubmission | null
  version: string
  includeNumbers: boolean
  // Per-export customisation set by Jess in the export modal. Every
  // include* flag toggles a section on/off; the *Lines / text fields are
  // the editable content for that section. When omitted (e.g. the Plan
  // History save flow) we fall back to the full evidence-based defaults so
  // behaviour is unchanged for callers that don't opt in.
  customisation?: PdfCustomisation | null
}

export default function ClientPlanDocument({
  client,
  mealPlan,
  trainingPlan,
  onboarding = null,
  version,
  includeNumbers,
  customisation = null,
}: Props) {
  // Training-only export (no meal plan attached) must never leak
  // nutrition or macro content. This flag drives all the strip-outs
  // below so the training PDF reads as fitness-only.
  const isTrainingOnly = !mealPlan && !!trainingPlan
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Resolve the effective customisation. A supplied object is already
  // complete (built from buildDefaultCustomisation in the modal); otherwise
  // build the all-sections-on defaults here from the same helper.
  const cx: PdfCustomisation = customisation ?? buildDefaultCustomisation({
    scope: mealPlan && trainingPlan ? 'full' : mealPlan ? 'meal' : 'training',
    isTrainingOnly,
    includeNumbers,
    proteinTargetG: mealPlan?.targets?.protein_g ?? client.protein_target_g,
    fatTargetG: mealPlan?.targets?.fat_g ?? client.fat_target_g,
    carbsTargetG: mealPlan?.targets?.carbs_g ?? client.carbs_target_g,
    kcalTarget: mealPlan?.targets?.kcal ?? client.primary_goal_kcal,
  })

  // Personalised HR zones from the client's own max HR (from vitals, or
  // 220 − age). Falls back inside computeHrZones when age is unknown.
  const age = client.date_of_birth
    ? new Date().getFullYear() - new Date(client.date_of_birth).getFullYear()
    : null
  const maxHr = client.hr_max ?? (age ? 220 - age : null)
  const hrZones = computeHrZones(maxHr)

  // Macro chips vary by variant. Training-only exports don't show
  // nutrition or macro content on the strip.
  const chips: [string, string][] = isTrainingOnly
    ? [
        [`${trainingPlan?.days_per_week ?? 5} Days`, 'Active Training'],
        [`${trainingPlan?.programme_length_weeks ?? 1} Week${(trainingPlan?.programme_length_weeks ?? 1) > 1 ? 's' : ''}`, 'Programme Length'],
        [cx.stepGoal, 'Daily Steps'],
        ['Zone 2', 'Cardio Target'],
      ]
    : includeNumbers && mealPlan
      ? [
          [`~${mealPlan.targets.kcal} kcal`, 'Daily Calories'],
          [`${mealPlan.targets.protein_g} g`, 'Protein Target'],
          [cx.stepGoal, 'Daily Steps'],
          ['Zone 2', 'Cardio Target'],
        ]
      : [
          ['Balanced', 'Daily Nutrition'],
          [`${trainingPlan?.days_per_week ?? 5} Days`, 'Active Training'],
          [cx.stepGoal, 'Daily Steps'],
          ['Zone 2', 'Cardio Target'],
        ]

  // Snack strip, coach-editable per export (seeded from the numbers/no-numbers
  // variant in the modal, then whatever Jess left it as).
  const snacks: [string, string][] = cx.snacks.map((sn) => [sn.name, sn.detail])

  // Meals from the saved meal plan, group by slot and render one block per
  // meal. The old approach flattened items into rows with the meal name in
  // every row, which is why exported PDFs showed "Breakfast" five times.
  const allMeals = mealPlan?.meals ?? []
  const breakfastMeals = allMeals.filter((m) => /breakfast/i.test(m.name))
  const lunchMeals = allMeals.filter((m) => /lunch/i.test(m.name))
  const dinnerMeals = allMeals.filter((m) => /dinner|evening/i.test(m.name))

  // Days from saved training plan
  const trainingDays = (trainingPlan?.sessions || []).filter((s) => s.exercises.length > 0)
  const restDays = (trainingPlan?.sessions || []).filter((s) => s.exercises.length === 0)

  return (
    <Document title={`${client.full_name}, Plan ${version}`} author="hercoach Jess, Registered Dietitian (HCPC)">
      <Page size="A4" style={s.page}>
        <HeaderBar />
        <FooterBar />

        {/* Welcome strip */}
        <View style={s.welcomeStrip}>
          <Text style={s.welcomeL}>YOUR PERSONALISED PLAN</Text>
          <Text style={s.welcomeR}>Prepared by Jess  ·  Registered Dietitian (HCPC)  ·  {today}</Text>
        </View>

        {/* Personal welcome card, pulls from onboarding so the first
            page feels like it was written for this specific person.
            Falls back gracefully when onboarding data is thin. */}
        {cx.includeWelcome && (
          <WelcomeCard
            client={client}
            onboarding={onboarding}
            trainingPlan={trainingPlan}
            mealPlan={mealPlan}
            isTrainingOnly={isTrainingOnly}
          />
        )}

        {/* Client snapshot. The stats line (age/height/weight) is
            optional and coach-editable per export. */}
        {(() => {
          const autoStats = [
            client.date_of_birth ? `Age: ${new Date().getFullYear() - new Date(client.date_of_birth).getFullYear()}` : null,
            client.height_cm ? `Height: ${client.height_cm} cm` : null,
            client.current_weight_kg ? `Current weight: ${client.current_weight_kg} kg` : null,
          ].filter(Boolean).join('  ·  ')
          const statsLine = cx.includeClientStats
            ? (cx.clientStatsOverride && cx.clientStatsOverride.trim()) || autoStats
            : ''
          const overviewLines = [
            statsLine,
            `Goal: ${client.goal || 'Personalised wellness & training programme'}`,
            `Programme: ${trainingPlan?.days_per_week ?? 5} active days, resistance training + recovery`,
            `Version: ${version}`,
          ].filter((line) => line && line.trim().length > 0)
          return <LinenBox head="Client Overview" lines={overviewLines} />
        })()}

        {cx.includeMacroChips && (
          <>
            <View style={{ height: 8 }} />
            <MacroChips chips={chips} />
          </>
        )}

        {/* Body sections render in the coach-chosen order (cx.sectionOrder).
            The cover above is always first; the closing sign-off always last.
            Section numbers and the page break between sections are assigned
            dynamically from the running order. */}
        {(() => {
          const trainingBody: ReactNode = (trainingPlan && cx.includeTraining) ? (
          <>
            {cx.includeWarmup && cx.warmupLines.length > 0 && (
              <>
                <DarkBox
                  head="WARM-UP, complete before every resistance session"
                  lines={cx.warmupLines}
                />
                <View style={{ height: 4 }} />
                <Text style={s.noteText}>
                  Heart rate during warm-up should sit at 94–113 bpm (Zone 1). You should feel warm,
                  mobile, and ready, not breathless. Never skip the warm-up; it protects your joints
                  and improves performance.
                </Text>
              </>
            )}

            {cx.includeWeeklyStructure && (
              <>
                <View style={{ height: 8 }} />
                <LinenBox
                  head={`Suggested Weekly Structure, ${trainingPlan.days_per_week} active days`}
                  lines={[
                    ...trainingDays.map((d, i) => `Day ${i + 1}, ${d.day}: ${d.focus}`),
                    ...restDays.map((d) => `${d.day}: ${d.focus || 'Rest or 20 min Zone 2 walk'}`),
                    `Rest days are active, aim for your ${cx.stepGoal} step target through normal daily movement.`,
                  ]}
                />
              </>
            )}

            {cx.includeProgressiveOverload && cx.progressiveOverloadLines.length > 0 && (
              <>
                <View style={{ height: 8 }} />
                <DarkBox
                  head="Progressive Overload, the engine behind your results"
                  lines={cx.progressiveOverloadLines}
                />
              </>
            )}

            {/* Day-by-day exercise tables */}
            {trainingDays.map((day, i) => (
              <View key={i} wrap={false} style={{ marginTop: 12 }}>
                <Text style={s.dayHead}>Day {i + 1}, {day.day}, {day.focus}</Text>
                <ExerciseTable
                  rows={day.exercises.map((ex) => ({
                    name: ex.name,
                    sr: `${ex.sets} × ${ex.reps}`,
                    note: ex.notes,
                  }))}
                />
                {day.exercises.length > 0 && (
                  <Text style={[s.noteText, { marginTop: 4 }]}>
                    Rest 60–90 seconds between sets. If any movement causes sharp joint pain (not muscle burn), stop and let Jess know.
                  </Text>
                )}
              </View>
            ))}

            {cx.includeCooldown && cx.cooldownLines.length > 0 && (
              <>
                <View style={{ height: 8 }} />
                <LinenBox
                  head="Cool-Down, 5 minutes after every resistance session"
                  lines={cx.cooldownLines}
                />
              </>
            )}

            {/* Multi-week progression, listed when programme is longer
                than 1 week. Toggle-off + text-override are respected. */}
            {cx.includeWeeklyProgression && trainingPlan.programme_length_weeks && trainingPlan.programme_length_weeks > 1 && trainingPlan.weekly_progression && trainingPlan.weekly_progression.length > 0 && (
              <View wrap={false} style={{ marginTop: 18 }}>
                <Text style={[s.dayHead, { fontSize: 12 }]}>{trainingPlan.programme_length_weeks}-Week Progression</Text>
                {cx.weeklyProgressionOverride && cx.weeklyProgressionOverride.trim() ? (
                  <Text style={[s.noteText, { marginTop: 6 }]}>{cx.weeklyProgressionOverride.trim()}</Text>
                ) : (
                  <>
                    <Text style={[s.noteText, { marginBottom: 6 }]}>
                      Week 1 is detailed above. The following weeks build on that base, keep the same structure unless told otherwise, and apply the modifications listed.
                    </Text>
                    {trainingPlan.weekly_progression.map((wp, i) => (
                      <View key={i} style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: '#D8C9A8' }}>
                        <Text style={[s.dayHead, { fontSize: 10 }]}>
                          Week {wp.week}, {wp.focus}{wp.intensity_target ? `  ·  ${wp.intensity_target}` : ''}
                        </Text>
                        <Text style={s.noteText}>{wp.modifications}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </>
          ) : null

          const yogaBody: ReactNode = cx.includeYoga ? (
          <>
            {cx.yogaIntro.trim().length > 0 && (
              <Text style={s.noteText}>{cx.yogaIntro.trim()}</Text>
            )}

            {cx.yogaApproachLines.length > 0 && (
              <>
                <View style={{ height: 6 }} />
                <DarkBox head="How to approach your recovery day" lines={cx.yogaApproachLines} />
              </>
            )}

            {cx.yogaRows.length > 0 && (
              <>
                <View style={{ height: 6 }} />
                <Text style={s.dayHead}>Full Yoga Sequence</Text>
                <YogaTable rows={cx.yogaRows} />
              </>
            )}
            {cx.yogaTip.trim().length > 0 && (
              <Text style={[s.noteText, { marginTop: 6 }]}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>Yoga tip: </Text>
                {cx.yogaTip.trim()}
              </Text>
            )}
          </>
          ) : null

          const cardioBody: ReactNode = cx.includeCardio ? (
          <>
            <TwoCol
              lHead="Cardio, 2 to 3 sessions per week"
              lLines={cx.cardioLines}
              rHead={`Daily Step Target, ${cx.stepGoal} steps`}
              rLines={cx.stepsLines}
            />

            {cx.includeHRZones && (
              <>
                <View style={{ height: 10 }} />
                <Text style={s.dayHead}>Heart Rate Zones</Text>
                <Text style={s.noteText}>
                  Estimated Maximum Heart Rate is calculated as 220 minus your age.
                  Zone 2 (highlighted below) is your target for all cardio sessions in this programme.
                  A fitness watch (Garmin, Apple Watch, Fitbit) or the heart rate grips on gym machines
                  are accurate enough.
                </Text>
                <View style={{ height: 4 }} />
                <HRTable zones={hrZones} />
                {client.hr_resting && (
                  <Text style={[s.noteText, { marginTop: 4 }]}>
                    Your resting heart rate on file is {client.hr_resting} bpm. A lower resting HR over
                    time is a good sign your aerobic fitness is improving.
                  </Text>
                )}
                <Text style={[s.noteText, { marginTop: 6 }]}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Why Zone 2? </Text>
                  At this intensity your body uses fat as its primary fuel source, it doesn&apos;t spike
                  cortisol or interfere with muscle recovery from weights, and it builds a strong
                  aerobic base over time. It should feel easy, that&apos;s intentional.
                </Text>
              </>
            )}
          </>
          ) : null

          const nutritionBody: ReactNode = (mealPlan && cx.includeNutrition) ? (
          <>
            <Text style={s.noteText}>
              All foods are readily available at UK supermarkets (Tesco, Aldi, Lidl, Sainsbury&apos;s,
              Asda, Morrisons). Choose one option per meal each day and rotate throughout the week.
              Quantities are given in grams and ml.
              {includeNumbers
                ? ' Using a food scale for the first 1–2 weeks makes a significant difference to accuracy.'
                : ' Simply follow the portions provided, the balance is taken care of for you.'}
            </Text>

            {breakfastMeals.length > 0 && (
              <>
                <View style={{ height: 6 }} />
                <Text style={s.dayHead}>Breakfast</Text>
                {breakfastMeals.map((m, i) => (<MealBlock key={i} meal={m} showMacros={includeNumbers} />))}
              </>
            )}

            {lunchMeals.length > 0 && (
              <>
                <View style={{ height: 8 }} />
                <Text style={s.dayHead}>Lunch</Text>
                {lunchMeals.map((m, i) => (<MealBlock key={i} meal={m} showMacros={includeNumbers} />))}
              </>
            )}

            {cx.includeSnacks && snacks.length > 0 && (
              <>
                <View style={{ height: 8 }} />
                <Text style={s.dayHead}>Snacks, choose one per day</Text>
                <SnackStrip snacks={snacks} />
              </>
            )}

            {dinnerMeals.length > 0 && (
              <>
                <View style={{ height: 8 }} />
                <Text style={s.dayHead}>Dinner</Text>
                {dinnerMeals.map((m, i) => (<MealBlock key={i} meal={m} showMacros={includeNumbers} />))}
              </>
            )}

            {cx.includeHydration && (
              <>
                <View style={{ height: 10 }} />
                <TwoCol
                  lHead="Hydration, daily targets"
                  lLines={cx.hydrationLines}
                  rHead={includeNumbers ? 'Protein, why it matters' : 'Building balanced meals'}
                  rLines={cx.proteinLines}
                />
              </>
            )}

            {/* Food facts, evidence-based one-liners with sources */}
            {cx.includeFoodFacts && mealPlan.food_facts && mealPlan.food_facts.length > 0 && (
              <View wrap={false} style={{ marginTop: 18 }}>
                <Text style={[s.dayHead, { fontSize: 12 }]}>The Science Behind Your Plan</Text>
                <Text style={[s.noteText, { marginBottom: 6 }]}>
                  Short evidence-based facts about the foods in this plan, for context, not prescription.
                </Text>
                {mealPlan.food_facts.map((f, i) => (
                  <View key={i} style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: '#D8C9A8' }}>
                    <Text style={[s.dayHead, { fontSize: 10 }]}>{f.food}</Text>
                    <Text style={[s.noteText, { fontFamily: 'Helvetica', color: C.BLACK }]}>{f.fact}</Text>
                    <Text style={s.noteText}>Source: {f.source}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
          ) : null

          const generalBody: ReactNode = cx.includeGeneralGuidance ? (
          <>
            {/* Sleep + stress render side-by-side when both are on, or as a
                single full-width box when only one is kept. */}
            {cx.includeSleep && cx.includeStress ? (
              <TwoCol
                lHead="Sleep & Recovery"
                lLines={cx.sleepLines}
                rHead="Stress & Mindset"
                rLines={cx.stressLines}
              />
            ) : cx.includeSleep ? (
              <LinenBox head="Sleep & Recovery" lines={cx.sleepLines} />
            ) : cx.includeStress ? (
              <LinenBox head="Stress & Mindset" lines={cx.stressLines} />
            ) : null}

            {/* Nutrition-timing box only for combined/meal exports. */}
            {!isTrainingOnly && cx.includeTrainingDayNutrition && cx.trainingDayNutritionLines.length > 0 && (
              <>
                <View style={{ height: 8 }} />
                <LinenBox head="Training day nutrition, timing" lines={cx.trainingDayNutritionLines} />
              </>
            )}

            {cx.includeNoteFromJess && cx.noteFromJessLines.length > 0 && (
              <>
                <View style={{ height: 8 }} />
                <DarkBox head="A note from Jess" lines={cx.noteFromJessLines} />
              </>
            )}
          </>
          ) : null

          // Extra coach-authored sections, rendered together wherever the
          // 'custom' key sits in the section order.
          const customList = cx.customSections.filter((sec) => sec.title.trim() || sec.lines.some((l) => l.trim()))
          const customBody: ReactNode = customList.length > 0 ? (
            <>
              {customList.map((sec, i) => (
                <View key={i} style={{ marginTop: i === 0 ? 0 : 12 }}>
                  <LinenBox
                    head={sec.title.trim() || 'Extra guidance'}
                    lines={sec.lines.filter((l) => l.trim().length > 0)}
                  />
                </View>
              ))}
            </>
          ) : null

          const defs: Record<SectionKey, { title: string; body: ReactNode } | null> = {
            training: trainingBody ? { title: 'Training Plan', body: trainingBody } : null,
            yoga: yogaBody ? { title: 'Yoga & Active Recovery', body: yogaBody } : null,
            cardio: cardioBody ? { title: 'Cardio & Daily Movement', body: cardioBody } : null,
            nutrition: nutritionBody ? { title: 'Nutrition Plan', body: nutritionBody } : null,
            general: generalBody ? { title: 'General Guidance', body: generalBody } : null,
            custom: customBody ? { title: '', body: customBody } : null,
          }

          const nodes: ReactNode[] = []
          let sectionNo = 0
          for (const key of normalizeSectionOrder(cx.sectionOrder)) {
            const def = defs[key]
            if (!def) continue
            const isFirst = nodes.length === 0
            if (key === 'custom') {
              // Custom boxes are self-titled, so no numbered section header.
              nodes.push(
                <View key={key} break={!isFirst} style={{ marginTop: 8 }}>{def.body}</View>,
              )
            } else {
              sectionNo += 1
              nodes.push(
                <View key={key} break={!isFirst} style={{ marginTop: 8 }}>
                  <SectionHeader eyebrow={`Section ${String(sectionNo).padStart(2, '0')}`} title={def.title} />
                  {def.body}
                </View>,
              )
            }
          }
          return <>{nodes}</>
        })()}

        {/* ──── CLOSING PANEL ──── always last, after the ordered sections. */}
        {cx.includeClosing && (
          <View style={s.closeBox} wrap={false}>
            <Text style={s.closeLogo}>hercoach · Jess</Text>
            <View style={s.closeRule} />
            <Text style={s.closeTag}>Less restriction. More you.</Text>
            <Text style={s.closeCred}>
              Registered Dietitian  ·  HCPC Registered  ·  BDA Member  ·  England &amp; Wales
            </Text>
            <View style={s.closeRule} />
            <Text style={s.closeDisc}>
              This plan is personalised and confidential. It has been prepared by a Registered Dietitian
              on the basis of the health information provided. It is not for redistribution.
              If your health status changes at any point, please inform Jess immediately so your plan can be reviewed.
            </Text>
            <Text style={[s.closeDisc, { marginTop: 8 }]}>
              The fitness guidance within this plan constitutes general wellness programming and is not
              clinical exercise prescription or physiotherapy. Please consult your GP before commencing
              if you have any concerns about your physical health.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
