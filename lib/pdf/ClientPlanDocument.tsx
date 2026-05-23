/* eslint-disable jsx-a11y/alt-text, @typescript-eslint/no-explicit-any */
import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'
import type { Client, MealPlan, TrainingPlan } from '@/types'

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

  // Table — exercise / meal / yoga / HR
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
        hercoach Jess  ·  Registered Dietitian  ·  HCPC Registered  ·  England &amp; Wales  ·  Personalised &amp; confidential — not for redistribution
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

function MealTable({ rows }: { rows: { name: string; detail: string }[] }) {
  return (
    <View wrap={false}>
      {rows.map((r, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 0 ? s.tableRowA : s.tableRowB, { borderTopWidth: i === 0 ? 0.3 : 0.3 }]}>
          <Text style={[s.cellMealLbl, { flex: 28 }]}>{r.name}</Text>
          <Text style={[s.cellMealDet, { flex: 72 }]}>{r.detail}</Text>
        </View>
      ))}
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

function HRTable() {
  const zones = [
    { z: '1', intensity: 'Very light',  hr: '94–113 bpm',  feel: 'Easy — full conversation',          use: 'Warm-up, cool-down, recovery walks' },
    { z: '2', intensity: 'Light',       hr: '113–132 bpm', feel: 'Comfortable — slightly breathless', use: 'Incline walk cardio — YOUR TARGET' },
    { z: '3', intensity: 'Moderate',    hr: '132–151 bpm', feel: 'Breathing harder, still talking',   use: 'Cross trainer — steady state' },
    { z: '4', intensity: 'Hard',        hr: '151–170 bpm', feel: 'Short sentences only',              use: 'Optional — not needed at this stage' },
    { z: '5', intensity: 'Max effort',  hr: '170+ bpm',    feel: 'Cannot speak',                      use: 'Not recommended currently' },
  ]
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
  version: string
  includeNumbers: boolean
}

export default function ClientPlanDocument({ client, mealPlan, trainingPlan, version, includeNumbers }: Props) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Macro chips vary by variant
  const chips: [string, string][] = includeNumbers && mealPlan
    ? [
        [`~${mealPlan.targets.kcal} kcal`, 'Daily Calories'],
        [`${mealPlan.targets.protein_g} g`, 'Protein Target'],
        ['10,000', 'Daily Steps'],
        ['Zone 2', 'Cardio Target'],
      ]
    : [
        ['Balanced', 'Daily Nutrition'],
        [`${trainingPlan?.days_per_week ?? 5} Days`, 'Active Training'],
        ['10,000', 'Daily Steps'],
        ['Zone 2', 'Cardio Target'],
      ]

  // Snack strip — variant aware
  const snacks: [string, string][] = includeNumbers
    ? [
        ['Fruit',           '1 piece\n~70 kcal'],
        ['Protein yoghurt', '150g Fage/Arla\n~130 kcal'],
        ['Rice cakes',      '2 Kallo cakes\n~70 kcal'],
        ['Popcorn',         '20g bag\n~90 kcal'],
        ['Dark chocolate',  '10g (85%+)\n~60 kcal'],
      ]
    : [
        ['Fruit',           '1 piece'],
        ['Protein yoghurt', '150g pot\nFage or Arla'],
        ['Rice cakes',      '2 Kallo cakes'],
        ['Popcorn',         '1 small bag\n(20g)'],
        ['Dark chocolate',  '2 squares\n(85%+)'],
      ]

  // Meals from the saved meal plan — render whatever Jess has built
  const breakfastRows = (mealPlan?.meals || [])
    .filter((m) => /breakfast/i.test(m.name))
    .flatMap((m) => m.items.map((item) => ({ name: m.name, detail: item })))
  const lunchRows = (mealPlan?.meals || [])
    .filter((m) => /lunch/i.test(m.name))
    .flatMap((m) => m.items.map((item) => ({ name: m.name, detail: item })))
  const dinnerRows = (mealPlan?.meals || [])
    .filter((m) => /dinner|evening/i.test(m.name))
    .flatMap((m) => m.items.map((item) => ({ name: m.name, detail: item })))

  // Days from saved training plan
  const trainingDays = (trainingPlan?.sessions || []).filter((s) => s.exercises.length > 0)
  const restDays = (trainingPlan?.sessions || []).filter((s) => s.exercises.length === 0)

  return (
    <Document title={`${client.full_name} — Plan ${version}`} author="hercoach Jess — Registered Dietitian (HCPC)">
      <Page size="A4" style={s.page}>
        <HeaderBar />
        <FooterBar />

        {/* Welcome strip */}
        <View style={s.welcomeStrip}>
          <Text style={s.welcomeL}>YOUR PERSONALISED PLAN</Text>
          <Text style={s.welcomeR}>Prepared by Jess  ·  Registered Dietitian (HCPC)  ·  {today}</Text>
        </View>

        {/* Client snapshot */}
        <LinenBox
          head="Client Overview"
          lines={[
            [
              client.date_of_birth ? `Age: ${new Date().getFullYear() - new Date(client.date_of_birth).getFullYear()}` : null,
              client.height_cm ? `Height: ${client.height_cm} cm` : null,
              client.current_weight_kg ? `Current weight: ${client.current_weight_kg} kg` : null,
            ].filter(Boolean).join('  ·  '),
            `Goal: ${client.goal || 'Personalised wellness & training programme'}`,
            `Programme: ${trainingPlan?.days_per_week ?? 5} active days — resistance training + recovery`,
            `Version: ${version}`,
          ]}
        />

        <View style={{ height: 8 }} />
        <MacroChips chips={chips} />

        {/* ──── SECTION 1 — TRAINING ──── */}
        {trainingPlan && (
          <>
            <SectionHeader eyebrow="Section 01" title="Training Plan" />

            <DarkBox
              head="WARM-UP — complete before every resistance session"
              lines={[
                '5 minutes incline treadmill walk — gradient 6–8, easy comfortable pace (Zone 1)',
                'Dynamic leg swings — 10 forward/back + 10 side to side each leg',
                'Hip circles — 10 each direction, hands on hips',
                'Resistance band glute activation — clamshells x15 each side',
                'Resistance band shoulder pull-aparts — x15, controlled',
                'Arm circles and shoulder rolls — 30 seconds each',
                'Bodyweight squats — 10 slow reps to open hips and prepare knees',
              ]}
            />
            <View style={{ height: 4 }} />
            <Text style={s.noteText}>
              Heart rate during warm-up should sit at 94–113 bpm (Zone 1). You should feel warm,
              mobile, and ready — not breathless. Never skip the warm-up; it protects your joints
              and improves performance.
            </Text>

            <View style={{ height: 8 }} />
            <LinenBox
              head={`Suggested Weekly Structure — ${trainingPlan.days_per_week} active days`}
              lines={[
                ...trainingDays.map((d, i) => `Day ${i + 1} — ${d.day}: ${d.focus}`),
                ...restDays.map((d) => `${d.day}: ${d.focus || 'Rest or 20 min Zone 2 walk'}`),
                'Rest days are active — aim for your 10,000 step target through normal daily movement.',
              ]}
            />

            <View style={{ height: 8 }} />
            <DarkBox
              head="Progressive Overload — the engine behind your results"
              lines={[
                'When you complete ALL reps across ALL sets with good form — increase weight by 1–2.5 kg the following week.',
                'Write down your weights every session. Without tracking, progression is guesswork.',
                "If you can't complete the minimum reps — reduce weight slightly and build back up.",
                'Form always comes first. Controlled and slow beats heavy and sloppy.',
              ]}
            />

            {/* Day-by-day exercise tables */}
            {trainingDays.map((day, i) => (
              <View key={i} wrap={false} style={{ marginTop: 12 }}>
                <Text style={s.dayHead}>Day {i + 1} — {day.day} — {day.focus}</Text>
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

            <View style={{ height: 8 }} />
            <LinenBox
              head="Cool-Down — 5 minutes after every resistance session"
              lines={[
                'Standing quad stretch — 30 seconds each leg',
                'Seated hamstring stretch — 30 seconds each leg, sit tall and hinge forward',
                'Hip flexor lunge stretch — 30 seconds each side',
                'Doorframe or band chest stretch — 30 seconds, open the chest',
                "Child's pose — 45 seconds, lower back release",
                '5 slow deep breaths — bring your heart rate back to Zone 1 before leaving the gym',
              ]}
            />
          </>
        )}

        {/* ──── SECTION 2 — YOGA & ACTIVE RECOVERY ──── */}
        <View break style={{ marginTop: 8 }}>
          <SectionHeader eyebrow="Section 02" title="Day 5 — Yoga & Active Recovery" />
          <Text style={s.noteText}>
            This session is your dedicated recovery and mobility day. Gentle, intentional,
            and just as important as resistance training. Yoga reduces cortisol, improves
            flexibility, aids recovery, and supports mental wellbeing — all of which directly
            support your goal. No gym required — do this at home on a yoga mat.
          </Text>

          <View style={{ height: 6 }} />
          <DarkBox
            head="How to approach Day 5"
            lines={[
              'Move slowly and intentionally — this is recovery, not a workout',
              'Never force a stretch. Work to the edge of comfort, not pain.',
              'Focus on your breathing throughout — inhale through the nose, exhale slowly through the mouth',
              'Play calm music or a guided yoga audio if it helps you stay present',
              'Duration: 35–45 minutes total',
            ]}
          />

          <View style={{ height: 6 }} />
          <Text style={s.dayHead}>Full Yoga Sequence</Text>
          <YogaTable
            rows={[
              { pose: "Child's Pose",            dur: '90 sec',    benefit: 'Releases lower back, hips, and shoulders. Starting position — breathe deeply.' },
              { pose: 'Cat-Cow Flow',            dur: '10 rounds', benefit: 'Mobilises the spine. Inhale as you arch (cow), exhale as you round (cat). Slow.' },
              { pose: 'Downward Facing Dog',     dur: '60 sec',    benefit: 'Full body stretch — hamstrings, calves, shoulders. Pedal the heels gently.' },
              { pose: 'Low Lunge (each side)',   dur: '60s each',  benefit: 'Opens hip flexors — essential after lower body sessions. Keep back knee soft.' },
              { pose: 'Pigeon Pose (each side)', dur: '90s each',  benefit: 'Deep glute and hip opener. One of the most important poses for gym-goers.' },
              { pose: 'Seated Forward Fold',     dur: '60 sec',    benefit: 'Hamstring lengthening. Sit tall, hinge from the hips — don\'t round the back.' },
              { pose: 'Supine Spinal Twist',     dur: '60s each',  benefit: 'Releases the lower back and thoracic spine. Keep both shoulders on the mat.' },
              { pose: 'Legs Up the Wall',        dur: '3 min',     benefit: 'Promotes circulation, reduces swelling in legs, deeply calming.' },
              { pose: 'Savasana',                dur: '5 min',     benefit: 'Full rest. Lie still, close your eyes. Let the nervous system reset completely.' },
            ]}
          />
          <Text style={[s.noteText, { marginTop: 6 }]}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Yoga tip: </Text>
            If you&apos;re new to yoga, search &lsquo;Yoga with Adriene — 30 minute recovery flow&rsquo;
            on YouTube. Free, beginner-friendly, and guided. Alternatively, the Alo Moves or
            Down Dog apps offer excellent guided sessions.
          </Text>
        </View>

        {/* ──── SECTION 3 — CARDIO & STEPS ──── */}
        <View break style={{ marginTop: 8 }}>
          <SectionHeader eyebrow="Section 03" title="Cardio & Daily Movement" />
          <TwoCol
            lHead="Cardio — 2 to 3 sessions per week"
            lLines={[
              '20–25 minutes incline treadmill walk or cross trainer',
              'Perform on rest or mid-week — not the same day as weights',
              'Target Zone 2: 113–132 bpm throughout',
              'Treadmill: gradient 6–10, comfortable walking pace',
              'Cross trainer: moderate resistance, steady consistent rhythm',
              'You should be able to hold a conversation but feel it',
            ]}
            rHead="Daily Step Target — 10,000 steps"
            rLines={[
              '10,000 steps = approximately 7 km of movement per day',
              'A 10-minute walk after each meal adds 3,000 steps easily',
              'Use your phone health app or fitness watch to monitor',
              'Steps from your gym sessions count toward the total',
              'Aim for 8,000 minimum on high-fatigue or rest days',
              'Walking is one of the most underrated tools for body composition',
            ]}
          />

          <View style={{ height: 10 }} />
          <Text style={s.dayHead}>Heart Rate Zones</Text>
          <Text style={s.noteText}>
            Estimated Maximum Heart Rate is calculated as 220 minus your age.
            Zone 2 (highlighted below) is your target for all cardio sessions in this programme.
            A fitness watch (Garmin, Apple Watch, Fitbit) or the heart rate grips on gym machines
            are accurate enough.
          </Text>
          <View style={{ height: 4 }} />
          <HRTable />
          <Text style={[s.noteText, { marginTop: 6 }]}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Why Zone 2? </Text>
            At this intensity your body uses fat as its primary fuel source, it doesn&apos;t spike
            cortisol or interfere with muscle recovery from weights, and it builds a strong
            aerobic base over time. It should feel easy — that&apos;s intentional.
          </Text>
        </View>

        {/* ──── SECTION 4 — NUTRITION ──── */}
        {mealPlan && (
          <View break style={{ marginTop: 8 }}>
            <SectionHeader eyebrow="Section 04" title="Nutrition Plan" />
            <Text style={s.noteText}>
              All foods are readily available at UK supermarkets (Tesco, Aldi, Lidl, Sainsbury&apos;s,
              Asda, Morrisons). Choose one option per meal each day and rotate throughout the week.
              Quantities are given in grams and ml.
              {includeNumbers
                ? ' Using a food scale for the first 1–2 weeks makes a significant difference to accuracy.'
                : ' Simply follow the portions provided — the balance is taken care of for you.'}
            </Text>

            {breakfastRows.length > 0 && (
              <>
                <View style={{ height: 6 }} />
                <Text style={s.dayHead}>Breakfast</Text>
                <MealTable rows={breakfastRows} />
              </>
            )}

            {lunchRows.length > 0 && (
              <>
                <View style={{ height: 8 }} />
                <Text style={s.dayHead}>Lunch</Text>
                <MealTable rows={lunchRows} />
              </>
            )}

            <View style={{ height: 8 }} />
            <Text style={s.dayHead}>Snacks — choose one per day</Text>
            <SnackStrip snacks={snacks} />

            {dinnerRows.length > 0 && (
              <>
                <View style={{ height: 8 }} />
                <Text style={s.dayHead}>Dinner</Text>
                <MealTable rows={dinnerRows} />
              </>
            )}

            <View style={{ height: 10 }} />
            <TwoCol
              lHead="Hydration — daily targets"
              lLines={[
                '2 to 2.5 litres of water per day as a minimum',
                'Add 500ml extra on each training day',
                'Herbal teas and sparkling water count toward your total',
                'Limit caffeine after 2pm to protect sleep quality',
                'Signs of good hydration: pale yellow urine throughout the day',
                'A 1 litre water bottle refilled twice is the easiest method',
              ]}
              rHead={includeNumbers ? 'Protein — why it matters' : 'Building balanced meals'}
              rLines={includeNumbers ? [
                `Target: ${mealPlan.targets.protein_g}g protein per day`,
                'Protein preserves and builds muscle while in a calorie deficit',
                'Spread across 3–4 meals for best absorption',
                'Each meal should contain a palm-sized protein source',
                'Chicken, eggs, Greek yoghurt and lean mince are your easiest wins',
                'If hitting targets is difficult, a protein shake can help',
              ] : [
                'Include a protein source at every meal — chicken, eggs, yoghurt, lean mince, tofu',
                'Fill half your plate with vegetables and salad where you can',
                'Include a carbohydrate — rice, pasta, potato, oats, bread — to fuel training',
                'A small amount of healthy fat each day — olive oil, hummus, peanut butter',
                'Eat slowly, without distractions, and stop when comfortably full',
                'Following the portions in this plan takes care of the balance for you',
              ]}
            />
          </View>
        )}

        {/* ──── SECTION 5 — GENERAL GUIDANCE ──── */}
        <View break style={{ marginTop: 8 }}>
          <SectionHeader eyebrow="Section 05" title="General Guidance" />

          <TwoCol
            lHead="Sleep & Recovery"
            lLines={[
              'Aim for 7–9 hours every night — this is when your body adapts',
              'Poor sleep raises ghrelin (hunger hormone) the next day',
              'A consistent bedtime routine makes the biggest difference',
              'Limit screen use 30 minutes before bed',
              'Poor sleep will stall progress even if nutrition is perfect',
              'Flag consistently poor sleep in your weekly check-in',
            ]}
            rHead="Stress & Mindset"
            rLines={[
              'Elevated stress raises cortisol — this actively slows progress',
              'Progress is never perfectly linear — trust the process',
              'A bad day or week does not undo your progress',
              'Focus on the next meal — not the last one',
              'Slow, sustainable change is the strategy. Patience is everything.',
              "Use your weekly check-in honestly — it's where results are made",
            ]}
          />

          <View style={{ height: 8 }} />
          <LinenBox
            head="Training day nutrition — timing"
            lines={[
              'Pre-workout (60–90 mins before): small carbohydrate snack — banana, 2 rice cakes, or your breakfast',
              'Do not train completely fasted — performance drops and recovery is slower',
              'Post-workout (within 60 minutes): protein-rich meal — your lunch option or a protein yoghurt with fruit',
              'On lower body days, you may feel hungrier — this is normal. Have your snack and don\'t skip it.',
            ]}
          />

          <View style={{ height: 8 }} />
          <DarkBox
            head="A note from Jess"
            lines={includeNumbers ? [
              'This plan has been built specifically for you — your measurements, your goals, your food preferences, and your lifestyle. It is evidence-based, nutritionally balanced, and designed to create steady, sustainable progress without feeling restrictive.',
              `At ${mealPlan?.targets?.kcal ?? '~1,800'} kcal with ${mealPlan?.targets?.protein_g ?? '120–135'}g protein, you are eating enough to fuel your training, protect your muscle, and progress gradually. Slow and steady is the approach that lasts.`,
              "Submit your check-in every week without fail. That is where I can help you most. If something isn't working — tell me. If you have a question — ask me.",
              'You have everything you need. Let\'s do this.',
            ] : [
              'This plan has been built specifically for you — your goals, your food preferences, and your lifestyle. It is evidence-based, nutritionally balanced, and designed to feel sustainable and enjoyable, never restrictive.',
              "You don't need to count or track anything. The meals and portions here have been carefully chosen to support your goal — simply follow the plan and trust it. Eat the meals, enjoy your food, and let the process do the work.",
              "Submit your check-in every week without fail. That is where I can help you most. If something isn't working — tell me. If you have a question — ask me.",
              'You have everything you need. Let\'s do this.',
            ]}
          />

          {/* ──── CLOSING PANEL ──── */}
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
        </View>
      </Page>
    </Document>
  )
}
