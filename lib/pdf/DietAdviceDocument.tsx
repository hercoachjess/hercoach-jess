/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { DietSubmission } from '@/types'
import { shortDayLabel, weekLabel } from '@/lib/diet-week'

/**
 * Coach-side PDF export for a client's diet week + Jess's advice.
 *
 * Reads like a note from Jess with the client's food data included
 * as reference. No mention of AI anywhere. Structure deliberately
 * puts the personal note FIRST so when the client opens the PDF on
 * WhatsApp, they see the value (Jess's feedback) before the reference
 * (their own food).
 */

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
  NOTE_BG: '#faf8f5',
}

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    color: C.OFF_BLACK,
    fontFamily: 'Helvetica',
    paddingTop: 120,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontSize: 10,
  },
  headerBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 96,
    backgroundColor: C.BLACK,
    paddingHorizontal: 48, paddingTop: 22,
  },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoMain: { fontFamily: 'Times-Italic', fontSize: 22, color: C.WARM_WHITE },
  logoJess: { fontFamily: 'Times-Italic', fontSize: 24, color: C.WARM_WHITE, marginLeft: 6 },
  tagline: { fontSize: 7, color: '#888', marginTop: 7, letterSpacing: 2 },
  rdBadge: {
    position: 'absolute', right: 48, top: 22,
    paddingTop: 6, paddingHorizontal: 12, paddingBottom: 8,
    borderWidth: 0.4, borderColor: '#3a3530', borderRadius: 2,
    backgroundColor: C.DARK_GREY,
  },
  rdTitle: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.LIGHT_GREY, marginBottom: 3, letterSpacing: 1 },
  rdLine: { fontSize: 6.5, color: '#aaa', textAlign: 'right' },

  footerBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 30,
    backgroundColor: C.OFF_BLACK, paddingHorizontal: 48,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerL: { fontSize: 6, color: C.MID_GREY },
  footerR: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.LIGHT_GREY },

  // Personal note block (top of the doc, the star of the page)
  noteBlock: {
    backgroundColor: C.NOTE_BG,
    borderWidth: 0.5, borderColor: C.RULE_LIGHT,
    padding: 20, marginBottom: 18,
  },
  noteEyebrow: { fontSize: 7, letterSpacing: 1.4, color: C.MID_GREY, marginBottom: 4 },
  noteGreeting: {
    fontFamily: 'Times-Italic', fontSize: 20, color: C.BLACK,
    marginBottom: 12, lineHeight: 1.2,
  },
  noteBody: {
    fontSize: 10.5, color: C.TEXT_DARK, lineHeight: 1.65,
    marginBottom: 6,
  },
  noteSignature: {
    fontFamily: 'Times-Italic', fontSize: 12, color: C.OFF_BLACK,
    marginTop: 12,
  },

  // Reference section
  refStrip: {
    paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: C.RULE_LIGHT,
    marginTop: 12, marginBottom: 12,
  },
  refEyebrow: { fontSize: 7, letterSpacing: 1.4, color: C.MID_GREY, marginBottom: 3 },
  refTitle: { fontFamily: 'Times-Italic', fontSize: 15, color: C.BLACK },

  daySection: { marginBottom: 10 },
  dayHead: { fontFamily: 'Times-Italic', fontSize: 12, color: C.BLACK, marginBottom: 3 },
  dayRule: { borderBottomWidth: 0.4, borderBottomColor: C.RULE_LIGHT, marginBottom: 5 },

  blockLabel: {
    fontSize: 7, letterSpacing: 1, color: C.MID_GREY, textTransform: 'uppercase',
    marginTop: 3, marginBottom: 2,
  },
  blockValue: {
    fontSize: 9.5, color: C.TEXT_DARK, lineHeight: 1.45, marginBottom: 2,
  },
  emptyDay: { fontSize: 9, color: C.MID_GREY, fontStyle: 'italic' },
})

const SECTIONS = [
  { key: 'breakfast' as const, label: 'BREAKFAST' },
  { key: 'lunch' as const,     label: 'LUNCH' },
  { key: 'dinner' as const,    label: 'DINNER' },
  { key: 'snacks' as const,    label: 'SNACKS' },
  { key: 'drinks' as const,    label: 'DRINKS' },
]

export default function DietAdviceDocument({
  submission,
  clientName,
  advice,
}: {
  submission: DietSubmission
  clientName: string
  advice: string
}) {
  const firstName = (clientName || '').split(' ')[0] || clientName
  const p = submission.payload
  const paragraphs = (advice || '')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <Document title={`Note for ${clientName} — ${submission.week_start}`} author="hercoach Jess">
      <Page size="A4" style={s.page}>
        <View style={s.headerBar} fixed>
          <View style={s.logoRow}>
            <Text style={s.logoMain}>hercoach</Text>
            <Text style={s.logoJess}>Jess</Text>
          </View>
          <Text style={s.tagline}>L E S S    R E S T R I C T I O N .    M O R E    Y O U .</Text>
          <View style={s.rdBadge}>
            <Text style={s.rdTitle}>WEEK REVIEW</Text>
            <Text style={s.rdLine}>from Jess</Text>
          </View>
        </View>

        <View style={s.footerBar} fixed>
          <Text style={s.footerL}>hercoach Jess · Registered Dietitian (HCPC) · confidential</Text>
          <Text style={s.footerR} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

        {/* The note (Jess's message, edited by her) — top of the page */}
        <View style={s.noteBlock}>
          <Text style={s.noteEyebrow}>A NOTE FROM JESS · {weekLabel(submission.week_start).toUpperCase()}</Text>
          <Text style={s.noteGreeting}>Hi {firstName},</Text>
          {paragraphs.length > 0 ? (
            paragraphs.map((para, i) => (
              <Text key={i} style={s.noteBody}>{para}</Text>
            ))
          ) : (
            <Text style={s.noteBody}>
              A quick note about your food this week is coming, message me if you need it sooner.
            </Text>
          )}
          <Text style={s.noteSignature}>Jess</Text>
        </View>

        {/* Reference: their own food from the week */}
        <View style={s.refStrip}>
          <Text style={s.refEyebrow}>FOR REFERENCE</Text>
          <Text style={s.refTitle}>Your food this week</Text>
        </View>

        {p.days.map((d) => {
          const filled = SECTIONS.some((sec) => (d[sec.key] as string | undefined)?.trim())
          return (
            <View key={d.date} style={s.daySection} wrap={false}>
              <Text style={s.dayHead}>{shortDayLabel(d.date)}</Text>
              <View style={s.dayRule} />
              {!filled ? (
                <Text style={s.emptyDay}>Nothing recorded.</Text>
              ) : (
                SECTIONS.map((sec) => {
                  const value = (d[sec.key] as string | undefined)?.trim()
                  if (!value) return null
                  return (
                    <View key={sec.key}>
                      <Text style={s.blockLabel}>{sec.label}</Text>
                      <Text style={s.blockValue}>{value}</Text>
                    </View>
                  )
                })
              )}
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
