import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'
import { POPPINS_SEMIBOLD_DATAURI } from './poppins-font'
import type { Client, CheckinSubmission } from '@/types'

// Poppins for display type — embedded as a base64 data URI so generation
// never depends on an external font fetch. (Idempotent with the plan doc's
// registration; registering the same family twice is harmless.)
Font.register({ family: 'Poppins', src: POPPINS_SEMIBOLD_DATAURI, fontWeight: 600 })

const C = {
  BLACK: '#080808', OFF_BLACK: '#141414', DARK_GREY: '#262626',
  MID_GREY: '#888888', LIGHT_GREY: '#c8c8c8', RULE_LIGHT: '#dedad4',
  WARM_WHITE: '#f0ece4', CREAM: '#e8e0d4', LINEN: '#f5f2ed',
  ROW_B: '#f2efe9', ACCENT: '#3a3530', TEXT_DARK: '#333333', ACCENT_GOLD: '#a9793f',
}

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff', color: C.OFF_BLACK, fontFamily: 'Helvetica',
    paddingTop: 170, paddingBottom: 56, paddingHorizontal: 50, fontSize: 10,
  },
  headerBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 154, backgroundColor: C.BLACK, paddingHorizontal: 50, paddingTop: 26 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoMain: { fontFamily: 'Poppins', fontWeight: 600, fontSize: 26, color: C.WARM_WHITE },
  logoDot: { fontSize: 22, color: C.LIGHT_GREY, marginHorizontal: 4 },
  logoJess: { fontFamily: 'Poppins', fontWeight: 600, fontSize: 28, color: C.WARM_WHITE },
  tagline: { fontSize: 7, color: '#666666', marginTop: 6, letterSpacing: 2.5 },
  taglineRule: { borderBottomWidth: 0.4, borderBottomColor: C.ACCENT, width: 220, marginTop: 3 },
  rdBadge: { position: 'absolute', right: 50, top: 24, width: 168, height: 90, borderRadius: 3, backgroundColor: C.DARK_GREY, borderWidth: 0.4, borderColor: C.ACCENT, paddingTop: 8, alignItems: 'center' },
  rdTitle: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.LIGHT_GREY, marginBottom: 6, letterSpacing: 1 },
  rdLine: { fontSize: 6.8, color: '#aaaaaa', textAlign: 'center', marginBottom: 2 },
  rdPin: { fontFamily: 'Helvetica-Oblique', fontSize: 6, color: '#666666', marginTop: 4, textAlign: 'center' },
  footerBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, backgroundColor: C.OFF_BLACK, paddingHorizontal: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerL: { fontSize: 6, color: C.MID_GREY },
  footerR: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.LIGHT_GREY },

  titleWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: C.RULE_LIGHT, marginBottom: 16 },
  eyebrow: { fontSize: 7, color: C.MID_GREY, letterSpacing: 1.5, marginBottom: 3, textTransform: 'uppercase' },
  title: { fontFamily: 'Poppins', fontWeight: 600, fontSize: 20, color: C.BLACK },
  titleR: { fontFamily: 'Helvetica-Oblique', fontSize: 9, color: C.MID_GREY, paddingBottom: 3 },

  greeting: { fontFamily: 'Poppins', fontWeight: 600, fontSize: 15, color: C.BLACK, marginBottom: 12 },

  chipRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  chip: { backgroundColor: C.LINEN, borderWidth: 0.5, borderColor: C.RULE_LIGHT, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 12 },
  chipVal: { fontFamily: 'Poppins', fontWeight: 600, fontSize: 12, color: C.BLACK },
  chipLbl: { fontSize: 7, color: C.MID_GREY, marginTop: 2, letterSpacing: 0.5 },

  para: { fontSize: 10.5, color: C.TEXT_DARK, lineHeight: 1.6, marginBottom: 9 },

  signOff: { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: C.RULE_LIGHT },
  signName: { fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, color: C.BLACK },
  signCred: { fontSize: 8, color: C.MID_GREY, marginTop: 3 },
  disclaimer: { fontFamily: 'Helvetica-Oblique', fontSize: 7.5, color: C.MID_GREY, marginTop: 14, lineHeight: 1.5 },
})

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
      <Text style={s.footerL}>hercoach Jess  ·  Check-in feedback  ·  Personalised &amp; confidential, not for redistribution</Text>
      <Text style={s.footerR} render={({ pageNumber }) => `Page ${pageNumber}`} />
    </View>
  )
}

interface Props {
  client: Client
  checkin: CheckinSubmission
  previousCheckin?: CheckinSubmission | null
  feedback: string
}

export default function CheckinFeedbackDocument({ client, checkin, previousCheckin = null, feedback }: Props) {
  const firstName = (client.full_name || '').trim().split(/\s+/)[0] || client.full_name
  const date = new Date(checkin.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // A light progress snapshot: weight movement and this week's headline signals.
  const cur = checkin.payload
  const prev = previousCheckin?.payload ?? null
  const chips: { val: string; lbl: string }[] = []
  if (cur.weight_kg != null) {
    if (prev && prev.weight_kg != null) {
      const diff = cur.weight_kg - prev.weight_kg
      chips.push({ val: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`, lbl: `weight (now ${cur.weight_kg} kg)` })
    } else {
      chips.push({ val: `${cur.weight_kg} kg`, lbl: 'current weight' })
    }
  }
  if (cur.nutrition_adherence) chips.push({ val: cur.nutrition_adherence, lbl: 'nutrition' })
  if (cur.training_sessions) chips.push({ val: cur.training_sessions, lbl: 'training' })
  if (cur.energy) chips.push({ val: cur.energy, lbl: 'energy' })

  const paragraphs = (feedback || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

  return (
    <Document title={`${client.full_name} — Check-in feedback, Week ${checkin.week_number ?? ''}`} author="hercoach Jess, Registered Dietitian (HCPC)">
      <Page size="A4" style={s.page}>
        <HeaderBar />
        <FooterBar />

        <View style={s.titleWrap}>
          <View>
            <Text style={s.eyebrow}>Check-in feedback</Text>
            <Text style={s.title}>Week {checkin.week_number ?? '—'}</Text>
          </View>
          <Text style={s.titleR}>{date}</Text>
        </View>

        <Text style={s.greeting}>Hi {firstName},</Text>

        {chips.length > 0 && (
          <View style={s.chipRow}>
            {chips.map((c, i) => (
              <View key={i} style={s.chip}>
                <Text style={s.chipVal}>{c.val}</Text>
                <Text style={s.chipLbl}>{c.lbl}</Text>
              </View>
            ))}
          </View>
        )}

        {paragraphs.length > 0
          ? paragraphs.map((p, i) => <Text key={i} style={s.para}>{p}</Text>)
          : <Text style={s.para}>{feedback}</Text>}

        <View style={s.signOff}>
          <Text style={s.signName}>Jess</Text>
          <Text style={s.signCred}>Registered Dietitian  ·  HCPC Registered  ·  BDA Member  ·  England &amp; Wales</Text>
        </View>

        <Text style={s.disclaimer}>
          This feedback is personalised to you and based on the check-in information you provided. It is not a substitute
          for medical advice. If your health changes, please tell Jess so your plan can be reviewed.
        </Text>
      </Page>
    </Document>
  )
}
