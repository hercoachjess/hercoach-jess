/* eslint-disable jsx-a11y/alt-text */
import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'
import type { OnboardingSubmission } from '@/types'

const C = {
  BLACK: '#080808',
  OFF_BLACK: '#141414',
  DARK_GREY: '#262626',
  MID_GREY: '#888888',
  LIGHT_GREY: '#c8c8c8',
  RULE_LIGHT: '#dedad4',
  WARM_WHITE: '#f0ece4',
  TEXT_DARK: '#333333',
  TEXT_MID: '#555555',
  ACCENT: '#c89a6a',
}

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    color: C.OFF_BLACK,
    fontFamily: 'Helvetica',
    paddingTop: 130,
    paddingBottom: 50,
    paddingHorizontal: 50,
    fontSize: 9.5,
  },
  // ── Header ─────────────────────────────────────────────
  headerBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 112,
    backgroundColor: C.BLACK,
    paddingHorizontal: 50, paddingTop: 26,
  },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoMain: { fontFamily: 'Times-Italic', fontSize: 24, color: C.WARM_WHITE },
  logoJess: { fontFamily: 'Times-Italic', fontSize: 26, color: C.WARM_WHITE, marginLeft: 6 },
  tagline: { fontSize: 7, color: '#888888', marginTop: 8, letterSpacing: 2 },
  taglineRule: { borderBottomWidth: 0.4, borderBottomColor: C.MID_GREY, width: 200, marginTop: 4 },
  rdBadge: {
    position: 'absolute', right: 50, top: 26,
    paddingTop: 6, paddingHorizontal: 12, paddingBottom: 8,
    borderWidth: 0.4, borderColor: '#3a3530', borderRadius: 2,
    backgroundColor: C.DARK_GREY,
  },
  rdTitle: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.LIGHT_GREY, marginBottom: 4, letterSpacing: 1 },
  rdLine: { fontSize: 6.5, color: '#aaaaaa', textAlign: 'right' },

  // ── Footer ─────────────────────────────────────────────
  footerBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
    backgroundColor: C.OFF_BLACK, paddingHorizontal: 50,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerL: { fontSize: 6, color: C.MID_GREY },
  footerR: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.LIGHT_GREY },

  // ── Doc title ──────────────────────────────────────────
  docTitleStrip: {
    paddingBottom: 8,
    borderBottomWidth: 0.5, borderBottomColor: C.RULE_LIGHT,
    marginBottom: 14,
  },
  eyebrow: { fontSize: 7, color: C.MID_GREY, letterSpacing: 1.4, marginBottom: 4 },
  docTitle: { fontFamily: 'Times-Italic', fontSize: 22, color: C.BLACK, marginBottom: 2 },
  docMeta: { fontSize: 8, color: C.MID_GREY, marginTop: 4 },

  // ── Sections ───────────────────────────────────────────
  section: { marginBottom: 14 },
  sectionTitle: {
    fontFamily: 'Times-Italic', fontSize: 14, color: C.BLACK, marginBottom: 6,
  },
  sectionRule: { borderBottomWidth: 0.4, borderBottomColor: C.RULE_LIGHT, marginBottom: 8 },

  // Rows
  row: { flexDirection: 'row', marginBottom: 4, paddingVertical: 1 },
  rowLabel: { width: 140, fontSize: 8, color: C.MID_GREY, paddingRight: 8 },
  rowValue: { flex: 1, fontSize: 9, color: C.TEXT_DARK, lineHeight: 1.4 },

  // Multiline value block
  blockLabel: { fontSize: 7.5, color: C.MID_GREY, marginBottom: 2, letterSpacing: 0.5 },
  blockValue: { fontSize: 9, color: C.TEXT_DARK, lineHeight: 1.5, marginBottom: 8 },

  // Declaration
  declarationBox: {
    backgroundColor: '#faf8f5',
    borderWidth: 0.4, borderColor: C.RULE_LIGHT,
    padding: 14, marginTop: 4,
  },
  declarationItem: { flexDirection: 'row', marginBottom: 5 },
  tick: { width: 12, fontSize: 9, color: '#5a7a5a' },
  cross: { width: 12, fontSize: 9, color: '#a06060' },
  declarationText: { flex: 1, fontSize: 8.5, color: C.TEXT_DARK, lineHeight: 1.4 },

  signatureRow: { marginTop: 12, paddingTop: 10, borderTopWidth: 0.4, borderTopColor: C.RULE_LIGHT, flexDirection: 'row' },
  signatureLabel: { fontSize: 7, color: C.MID_GREY, letterSpacing: 1, marginBottom: 4 },
  signatureName: { fontFamily: 'Times-Italic', fontSize: 16, color: C.BLACK },
  signatureMeta: { fontSize: 8, color: C.TEXT_MID, marginTop: 2 },
  signatureBlock: { flex: 1 },
})

const DECLARATION_LABELS: Record<string, string> = {
  scope: 'I understand Jess works within her scope of practice as a Registered Dietitian and will refer me on if anything falls outside it.',
  referral: 'I agree to inform my GP / specialist where appropriate and to consult them if I have any concerns about my health.',
  health: 'I have answered all health-screening questions honestly and accurately.',
  liability: 'I take full responsibility for my own wellbeing, including activities I undertake based on this coaching.',
  payment: 'I accept the agreed payment terms.',
  cancellation: 'I understand the cancellation policy.',
  data: 'I consent to my personal and health data being processed for the purposes of coaching, in line with UK GDPR.',
  age: 'I confirm I am 18 or over and agree to all of the above.',
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function val(v: string | null | undefined): string {
  if (v == null) return '—'
  const trimmed = String(v).trim()
  return trimmed.length ? trimmed : '—'
}

function listVal(arr?: string[]): string {
  if (!arr || arr.length === 0) return '—'
  return arr.filter(Boolean).join(', ')
}

interface RowProps { label: string; value: string }
function Row({ label, value }: RowProps) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

interface BlockProps { label: string; value: string }
function Block({ label, value }: BlockProps) {
  return (
    <View>
      <Text style={s.blockLabel}>{label.toUpperCase()}</Text>
      <Text style={s.blockValue}>{value}</Text>
    </View>
  )
}

interface SectionProps { title: string; children: React.ReactNode }
function Section({ title, children }: SectionProps) {
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionRule} />
      {children}
    </View>
  )
}

interface Props {
  onboarding: OnboardingSubmission
  clientName: string
}

export default function OnboardingDocument({ onboarding, clientName }: Props) {
  const p = onboarding.payload
  const b = p.basics ?? ({} as typeof p.basics)
  const g = p.goals ?? ({} as typeof p.goals)
  const l = p.lifestyle ?? ({} as typeof p.lifestyle)
  const f = p.food_preferences ?? ({} as typeof p.food_preferences)
  const h = p.health_screening ?? ({} as typeof p.health_screening)
  const a = p.acknowledgements ?? ({} as typeof p.acknowledgements)

  return (
    <Document title={`Onboarding — ${clientName}`} author="HerCoach Jess">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerBar} fixed>
          <View style={s.logoRow}>
            <Text style={s.logoMain}>HerCoach</Text>
            <Text style={s.logoJess}>Jess</Text>
          </View>
          <Text style={s.tagline}>R E G I S T E R E D    D I E T I T I A N</Text>
          <View style={s.taglineRule} />
          <View style={s.rdBadge}>
            <Text style={s.rdTitle}>CLIENT FILE</Text>
            <Text style={s.rdLine}>ONBOARDING SUBMISSION</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footerBar} fixed>
          <Text style={s.footerL}>HerCoach Jess · jesswetherellxo@gmail.com</Text>
          <Text
            style={s.footerR}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>

        {/* Doc title */}
        <View style={s.docTitleStrip}>
          <Text style={s.eyebrow}>ONBOARDING FILE</Text>
          <Text style={s.docTitle}>{clientName}</Text>
          <Text style={s.docMeta}>Submitted {fmtDate(onboarding.created_at)}</Text>
        </View>

        <Section title="Basics">
          <Row label="First name" value={val(b.first_name)} />
          <Row label="Age" value={val(b.age)} />
          <Row label="Email" value={val(b.email)} />
          <Row label="Phone" value={val(b.phone)} />
          <Row label="City / Town" value={val(b.city)} />
          <Row label="GP Surgery" value={val(b.gp_surgery)} />
          <Row label="Current weight" value={b.current_weight_kg ? `${b.current_weight_kg} kg` : '—'} />
          <Row label="Height" value={b.height_cm ? `${b.height_cm} cm` : '—'} />
          <Row label="Goal weight" value={b.goal_weight_kg ? `${b.goal_weight_kg} kg` : '—'} />
        </Section>

        <Section title="Goals">
          <Row label="Primary goal" value={val(g.primary_goal)} />
          <Row label="Timeline" value={val(g.timeline)} />
          <Block label="Why it matters" value={val(g.why)} />
          <Block label="Previous experience" value={val(g.previous)} />
        </Section>

        <Section title="Lifestyle & training">
          <Row label="Activity level" value={val(l.activity)} />
          <Row label="Training experience" value={val(l.experience)} />
          <Row label="Days / week" value={val(l.training_days_per_week)} />
          <Row label="Session length" value={val(l.session_length)} />
          <Row label="Training location" value={val(l.training_location)} />
          <Block label="Job / routine" value={val(l.job)} />
        </Section>

        <Section title="Food & nutrition">
          <Row label="Diet type" value={val(f.diet_type)} />
          <Row label="Meals per day" value={val(f.meals_per_day)} />
          <Row label="Cooking confidence" value={val(f.cooking_confidence)} />
          <Row label="Meal prep" value={val(f.meal_prep)} />
          <Block label="Foods loved" value={val(f.foods_loved)} />
          <Block label="Foods disliked" value={val(f.foods_disliked)} />
          <Block label="Allergies / intolerances" value={val(f.allergies)} />
          <Row label="Supplements" value={val(f.supplements)} />
          <Block label="Current eating pattern" value={val(f.eating_pattern)} />
        </Section>

        <Section title="Health — physical">
          <Block label="Injuries / limitations" value={val(h.injuries)} />
          <Row label="Diagnosed conditions" value={listVal(h.conditions)} />
          <Block label="Medications" value={val(h.medications)} />
          <Row label="Pregnancy / TTC" value={val(h.pregnancy)} />
        </Section>

        <Section title="Health — mental & relationship with food">
          <Row label="Mental health" value={val(h.mental_health)} />
          <Row label="Food relationship" value={val(h.food_relationship)} />
          <Row label="ED history" value={listVal(h.ed_history)} />
          <Block label="Mental health notes" value={val(h.mh_notes)} />
        </Section>

        <Section title="Wellbeing">
          <Row label="Sleep quality" value={val(h.sleep)} />
          <Row label="Stress level" value={val(h.stress_level)} />
          <Row label="Water intake" value={val(h.water_intake)} />
          <Row label="Alcohol" value={val(h.alcohol)} />
          <Block label="Other notes" value={val(h.other_health)} />
        </Section>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Signed declaration</Text>
          <View style={s.sectionRule} />
          <View style={s.declarationBox}>
            {Object.entries(DECLARATION_LABELS).map(([key, label]) => {
              const ticked = !!(a as Record<string, boolean>)[key]
              return (
                <View key={key} style={s.declarationItem}>
                  <Text style={ticked ? s.tick : s.cross}>{ticked ? '✓' : '✕'}</Text>
                  <Text style={s.declarationText}>{label}</Text>
                </View>
              )
            })}

            <View style={s.signatureRow}>
              <View style={s.signatureBlock}>
                <Text style={s.signatureLabel}>SIGNED</Text>
                <Text style={s.signatureName}>{val(onboarding.signed_name)}</Text>
              </View>
              <View style={s.signatureBlock}>
                <Text style={s.signatureLabel}>DATE</Text>
                <Text style={s.signatureMeta}>{val(onboarding.signed_date)}</Text>
                <Text style={[s.signatureMeta, { marginTop: 6, fontStyle: 'italic' }]}>
                  Electronic signature under the Electronic Communications Act 2000
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
