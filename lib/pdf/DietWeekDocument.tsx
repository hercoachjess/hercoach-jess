/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { DietSubmission } from '@/types'
import { shortDayLabel, weekLabel } from '@/lib/diet-week'

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

  docStrip: {
    paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: C.RULE_LIGHT, marginBottom: 12,
  },
  eyebrow: { fontSize: 7, color: C.MID_GREY, letterSpacing: 1.4, marginBottom: 4 },
  docTitle: { fontFamily: 'Times-Italic', fontSize: 22, color: C.BLACK },
  docMeta: { fontSize: 8, color: C.MID_GREY, marginTop: 4 },

  daySection: { marginBottom: 12 },
  dayHead: { fontFamily: 'Times-Italic', fontSize: 14, color: C.BLACK, marginBottom: 4 },
  dayRule: { borderBottomWidth: 0.4, borderBottomColor: C.RULE_LIGHT, marginBottom: 6 },

  blockLabel: { fontSize: 7, color: C.MID_GREY, letterSpacing: 1, marginTop: 4, marginBottom: 2 },
  blockValue: { fontSize: 10, color: C.TEXT_DARK, lineHeight: 1.5, marginBottom: 2 },

  emptyDay: { fontSize: 9, color: C.MID_GREY, fontStyle: 'italic' },

  notesBox: {
    marginTop: 8,
    backgroundColor: '#faf8f5',
    borderWidth: 0.4, borderColor: C.RULE_LIGHT,
    padding: 12,
  },
})

const SECTIONS = [
  { key: 'breakfast' as const, label: 'BREAKFAST' },
  { key: 'lunch' as const,     label: 'LUNCH' },
  { key: 'dinner' as const,    label: 'DINNER' },
  { key: 'snacks' as const,    label: 'SNACKS' },
  { key: 'drinks' as const,    label: 'DRINKS' },
]

function fmtStamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DietWeekDocument({ submission, clientName }: { submission: DietSubmission; clientName: string }) {
  const p = submission.payload
  return (
    <Document title={`${clientName} — Food week ${submission.week_start}`} author={clientName}>
      <Page size="A4" style={s.page}>
        <View style={s.headerBar} fixed>
          <View style={s.logoRow}>
            <Text style={s.logoMain}>hercoach</Text>
            <Text style={s.logoJess}>Jess</Text>
          </View>
          <Text style={s.tagline}>L E S S    R E S T R I C T I O N .    M O R E    Y O U .</Text>
          <View style={s.rdBadge}>
            <Text style={s.rdTitle}>FOOD WEEK</Text>
            <Text style={s.rdLine}>Client submission</Text>
          </View>
        </View>

        <View style={s.footerBar} fixed>
          <Text style={s.footerL}>hercoach Jess · confidential client submission</Text>
          <Text style={s.footerR} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

        {/* Title */}
        <View style={s.docStrip}>
          <Text style={s.eyebrow}>FOOD WEEK</Text>
          <Text style={s.docTitle}>{weekLabel(submission.week_start)}</Text>
          <Text style={s.docMeta}>
            {clientName}
            {`  ·  First submitted ${fmtStamp(submission.created_at)}`}
            {submission.created_at !== submission.updated_at ? `  ·  Last edited ${fmtStamp(submission.updated_at)}` : ''}
          </Text>
        </View>

        {/* Days */}
        {p.days.map((d) => {
          const filled = SECTIONS.some((sec) => (d[sec.key] as string | undefined)?.trim())
          return (
            <View key={d.date} style={s.daySection} wrap={false}>
              <Text style={s.dayHead}>{shortDayLabel(d.date)}</Text>
              <View style={s.dayRule} />
              {!filled ? (
                <Text style={s.emptyDay}>Nothing recorded for this day.</Text>
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

        {p.notes && p.notes.trim().length > 0 && (
          <View style={s.notesBox}>
            <Text style={s.blockLabel}>NOTE FROM {clientName.toUpperCase()}</Text>
            <Text style={s.blockValue}>{p.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
