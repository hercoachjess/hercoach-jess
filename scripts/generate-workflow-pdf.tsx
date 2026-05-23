/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Generates a branded "HerCoach Jess — Coach Workflow Guide" PDF.
 *
 * Run with:
 *   npx tsx scripts/generate-workflow-pdf.tsx
 *
 * Outputs to: C:/Users/jessw/Downloads/hercoach-jess-workflow-guide.pdf
 */
import {
  Document, Page, Text, View, StyleSheet, renderToFile,
} from '@react-pdf/renderer'
import { createElement } from 'react'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

// ───────── Fonts ─────────
// Using built-in PDF fonts (Helvetica, Times-Italic) so PDFs always generate
// without depending on external font URLs. Times-Italic gives the serif-italic
// brand feel we want for the logo wordmark.

// ───────── Brand colours ─────────
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
  TAG_BG:     '#1f1d1a',
  ROW_A:      '#faf8f5',
  ROW_B:      '#f2efe9',
  ACCENT:     '#3a3530',
  AUTO_BG:    '#d9e8d9',   // soft green tint
  AUTO_FG:    '#3d6b3d',
  YOU_BG:     '#f0e4d8',   // warm cream tint
  YOU_FG:     '#7a5a3a',
  OFF_BG:     '#e8e3da',   // grey-cream
  OFF_FG:     '#5a5247',
}

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff', color: C.OFF_BLACK,
    fontFamily: 'Helvetica',
    paddingTop: 170, paddingBottom: 56, paddingHorizontal: 50,
    fontSize: 9,
  },
  // Fixed header
  headerBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 154,
    backgroundColor: C.BLACK, paddingHorizontal: 50, paddingTop: 26,
  },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoMain: { fontFamily: 'Times-Italic', fontSize: 26, color: C.WARM_WHITE },
  logoDot:  { fontSize: 22, color: C.LIGHT_GREY, marginHorizontal: 4 },
  logoJess: { fontFamily: 'Times-Italic', fontSize: 28, color: C.WARM_WHITE },
  tagline:  { fontSize: 7, color: '#888888', marginTop: 6, letterSpacing: 2.5 },
  taglineRule: { borderBottomWidth: 0.4, borderBottomColor: C.ACCENT, width: 220, marginTop: 3 },
  badge: {
    position: 'absolute', right: 50, top: 24,
    width: 168, height: 90, borderRadius: 3,
    backgroundColor: C.DARK_GREY,
    borderWidth: 0.4, borderColor: C.ACCENT,
    paddingTop: 8, alignItems: 'center',
  },
  badgeTitle: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.LIGHT_GREY, marginBottom: 6, letterSpacing: 1 },
  badgeLine:  { fontSize: 6.8, color: '#aaaaaa', textAlign: 'center', marginBottom: 2 },
  badgePin:   { fontFamily: 'Helvetica-Oblique', fontSize: 6, color: '#666666', marginTop: 4 },

  // Footer
  footerBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
    backgroundColor: C.OFF_BLACK, paddingHorizontal: 50,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerL: { fontSize: 6, color: C.MID_GREY },
  footerR: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.LIGHT_GREY },

  // Title
  titleWrap: {
    paddingBottom: 8,
    borderBottomWidth: 0.5, borderBottomColor: C.RULE_LIGHT,
    marginBottom: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  titleL: { flexDirection: 'column' },
  eyebrow: { fontSize: 7, color: C.MID_GREY, letterSpacing: 1.5, marginBottom: 2, textTransform: 'uppercase' },
  title:   { fontFamily: 'Times-Italic', fontSize: 22, color: C.BLACK },
  titleR:  { fontFamily: 'Helvetica-Oblique', fontSize: 8, color: C.MID_GREY, paddingBottom: 4 },

  // Legend strip
  legendRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 3,
    borderWidth: 0.4, borderColor: C.RULE_LIGHT,
    flex: 1,
  },
  legendChip: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  legendChipText: { fontFamily: 'Helvetica-Bold', fontSize: 8 },
  legendLabel: { fontSize: 7.5, color: C.OFF_BLACK, flex: 1, lineHeight: 1.3 },

  // Stage card
  stageCard: {
    marginBottom: 12, borderWidth: 0.5, borderColor: C.RULE_LIGHT,
    borderRadius: 3, overflow: 'hidden',
  },
  stageHeader: {
    backgroundColor: C.BLACK, paddingVertical: 8, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
  },
  stageNum: { fontFamily: 'Times-Italic', fontSize: 14, color: C.LIGHT_GREY },
  stageTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.WARM_WHITE, letterSpacing: 0.3 },
  stageBody: { backgroundColor: C.LINEN, paddingVertical: 10, paddingHorizontal: 14 },

  // Step row
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  stepBadge: {
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
    flexShrink: 0,
  },
  stepBadgeText: { fontFamily: 'Helvetica-Bold', fontSize: 7 },
  stepText: { fontSize: 9, color: C.OFF_BLACK, lineHeight: 1.55, flex: 1 },
  stepBold: { fontFamily: 'Helvetica-Bold', color: C.BLACK },

  // Big tip box
  tipBox: {
    backgroundColor: C.BLACK, padding: 12, borderRadius: 3, marginBottom: 12,
  },
  tipHead: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.WARM_WHITE, marginBottom: 4, letterSpacing: 0.5 },
  tipLine: { fontSize: 8.5, color: C.CREAM, lineHeight: 1.5, marginBottom: 2 },

  // Section heading inside body
  bodySection: {
    fontFamily: 'Times-Italic', fontSize: 14, color: C.BLACK,
    marginTop: 16, marginBottom: 6,
  },

  // Closing
  closeBox: {
    backgroundColor: C.LINEN, borderWidth: 0.5, borderColor: C.RULE_LIGHT,
    padding: 22, marginTop: 20, alignItems: 'center',
  },
  closeLogo: { fontFamily: 'Times-Italic', fontSize: 22, color: C.BLACK, marginBottom: 4 },
  closeTag:  { fontFamily: 'Helvetica-Oblique', fontSize: 9, color: C.MID_GREY, marginTop: 4 },
  closeCred: { fontSize: 8, color: C.MID_GREY, marginTop: 10, textAlign: 'center' },
  closeRule: { borderBottomWidth: 0.4, borderBottomColor: C.RULE_LIGHT, width: '60%', marginVertical: 8 },
  closeDisc: { fontFamily: 'Helvetica-Oblique', fontSize: 7.5, color: C.MID_GREY, textAlign: 'center', marginTop: 6, lineHeight: 1.5 },
})

// ───────── Step types ─────────
type StepKind = 'you' | 'system' | 'off'
type Step = { kind: StepKind; text: string; bold?: string }

function getBadge(kind: StepKind) {
  if (kind === 'system') return { bg: C.AUTO_BG, fg: C.AUTO_FG, text: '⚙' }
  if (kind === 'you')    return { bg: C.YOU_BG, fg: C.YOU_FG, text: 'J' }
  return { bg: C.OFF_BG, fg: C.OFF_FG, text: '↗' }
}

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
      <View style={s.badge}>
        <Text style={s.badgeTitle}>REGISTERED DIETITIAN</Text>
        <Text style={s.badgeLine}>HCPC Registered  ·  BDA Member</Text>
        <Text style={s.badgeLine}>England &amp; Wales</Text>
        <Text style={s.badgePin}>PIN available on request</Text>
      </View>
    </View>
  )
}

function FooterBar() {
  return (
    <View fixed style={s.footerBar}>
      <Text style={s.footerL}>
        hercoach Jess  ·  Coach Workflow Guide  ·  Personalised &amp; confidential — not for redistribution
      </Text>
      <Text style={s.footerR} render={({ pageNumber }) => `Page ${pageNumber}`} />
    </View>
  )
}

function Stage({ num, title, steps }: { num: string; title: string; steps: Step[] }) {
  return (
    <View style={s.stageCard} wrap={false}>
      <View style={s.stageHeader}>
        <Text style={s.stageNum}>{num}</Text>
        <Text style={s.stageTitle}>{title.toUpperCase()}</Text>
      </View>
      <View style={s.stageBody}>
        {steps.map((step, i) => {
          const b = getBadge(step.kind)
          return (
            <View key={i} style={s.stepRow}>
              <View style={[s.stepBadge, { backgroundColor: b.bg }]}>
                <Text style={[s.stepBadgeText, { color: b.fg }]}>{b.text}</Text>
              </View>
              <Text style={s.stepText}>
                {step.bold ? (
                  <>
                    <Text style={s.stepBold}>{step.bold}</Text>
                    {step.text ? ` ${step.text}` : ''}
                  </>
                ) : step.text}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function Doc() {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return createElement(Document, { title: 'HerCoach Jess — Coach Workflow Guide', author: 'HerCoach Jess' },
    createElement(Page, { size: 'A4', style: s.page },
      createElement(HeaderBar, null),
      createElement(FooterBar, null),

      // Title row
      createElement(View, { style: s.titleWrap },
        createElement(View, { style: s.titleL },
          createElement(Text, { style: s.eyebrow }, 'Coach Workflow Guide'),
          createElement(Text, { style: s.title }, 'Start to finish — your day-to-day with a client'),
        ),
        createElement(Text, { style: s.titleR }, `Generated ${today}`),
      ),

      // Legend strip
      createElement(View, { style: s.legendRow },
        createElement(View, { style: s.legendItem },
          createElement(View, { style: [s.legendChip, { backgroundColor: C.YOU_BG }] },
            createElement(Text, { style: [s.legendChipText, { color: C.YOU_FG }] }, 'J'),
          ),
          createElement(Text, { style: s.legendLabel }, 'You do this manually'),
        ),
        createElement(View, { style: s.legendItem },
          createElement(View, { style: [s.legendChip, { backgroundColor: C.AUTO_BG }] },
            createElement(Text, { style: [s.legendChipText, { color: C.AUTO_FG }] }, '⚙'),
          ),
          createElement(Text, { style: s.legendLabel }, 'The platform handles automatically'),
        ),
        createElement(View, { style: s.legendItem },
          createElement(View, { style: [s.legendChip, { backgroundColor: C.OFF_BG }] },
            createElement(Text, { style: [s.legendChipText, { color: C.OFF_FG }] }, '↗'),
          ),
          createElement(Text, { style: s.legendLabel }, 'Happens outside the platform (Instagram / WhatsApp / email / bank)'),
        ),
      ),

      // Stage 1 — Interest
      createElement(Stage, {
        num: '01',
        title: 'Client interested — initial outreach',
        steps: [
          { kind: 'off', text: 'Client messages you on Instagram or via your website — "I\'d love to start coaching."' },
          { kind: 'you', bold: 'In your dashboard:', text: 'click the "Copy" button on the Onboarding link card.' },
          { kind: 'off', text: 'Paste that link into your DM reply to the client.' },
        ],
      }),

      // Stage 2 — Onboarding
      createElement(Stage, {
        num: '02',
        title: 'Client onboards (~5–8 mins for them)',
        steps: [
          { kind: 'off', text: 'Client opens the link and works through the 7 steps: basics, goals, lifestyle, food, health screening, scope, declaration.' },
          { kind: 'off', text: 'They sign the declaration with their typed name and submit.' },
          { kind: 'system', bold: 'Automatic:', text: 'a new client row is created in your dashboard with their full onboarding payload, linked to their email.' },
          { kind: 'system', text: 'Client sees the branded "You\'re all set" success screen.' },
        ],
      }),

      // Stage 3 — Payment
      createElement(Stage, {
        num: '03',
        title: 'Payment (outside the platform)',
        steps: [
          { kind: 'off', text: 'You and the client agree on the package + price via DM.' },
          { kind: 'off', text: 'Client pays you via bank transfer, PayPal, or Stripe link — outside the platform.' },
          { kind: 'you', bold: 'On their client file → Payments tab:', text: 'click "+ Log Payment" and record the amount, due date, paid date, and method.' },
        ],
      }),

      // Stage 4 — Build plan
      createElement(Stage, {
        num: '04',
        title: 'Build her plan',
        steps: [
          { kind: 'you', bold: 'Meal Plan tab:', text: 'click "✨ AI Draft New Version" — Claude generates a draft based on her goal + macros + food preferences from onboarding.' },
          { kind: 'you', text: 'Edit anything — swap meals, adjust portions, rewrite items. Click Save Draft.' },
          { kind: 'you', bold: 'Training Plan tab:', text: 'click "✨ AI Draft New Version" — Claude generates a programme based on experience level, days/week, gym access, and injuries.' },
          { kind: 'you', text: 'Edit anything. Click Save Draft.' },
          { kind: 'you', bold: 'Plan History tab:', text: 'click "Save & Add to Plan History". Pick "With numbers" or "Without numbers".' },
          { kind: 'system', bold: 'Automatic:', text: 'a full branded PDF is generated combining meal + training plan and stored in Supabase Storage.' },
        ],
      }),
    ),

    // Page 2
    createElement(Page, { size: 'A4', style: s.page },
      createElement(HeaderBar, null),
      createElement(FooterBar, null),

      // Stage 5 — Share plan
      createElement(Stage, {
        num: '05',
        title: 'Share the plan PDF with her',
        steps: [
          { kind: 'you', bold: 'Plan History tab:', text: 'click "Copy link" or "Download" next to the new version.' },
          { kind: 'off', text: 'Paste the PDF or URL into WhatsApp, Instagram DM, or email to send it to her.' },
          { kind: 'you', text: 'Plan is preserved permanently — you can re-share any version at any time.' },
        ],
      }),

      // Stage 6 — Weekly check-ins
      createElement(Stage, {
        num: '06',
        title: 'Weekly check-ins (recurring)',
        steps: [
          { kind: 'you', bold: 'On her client file Overview tab:', text: 'click "Copy link" on the personalised check-in link card (her name and email are pre-filled).' },
          { kind: 'off', text: 'Pin that link in your DM/WhatsApp chat with her, or send fresh every week on her check-in day.' },
          { kind: 'off', text: 'Client fills the check-in form. Her name and email auto-populate from the link.' },
          { kind: 'system', bold: 'Automatic:', text: 'check-in saves to her file. Her current weight is updated. Week number is auto-calculated.' },
          { kind: 'system', text: 'On your dashboard, her row gets a "New check-in" badge. The Check-ins tab marks it "Needs Review".' },
        ],
      }),

      // Stage 7 — Feedback
      createElement(Stage, {
        num: '07',
        title: 'Send feedback after a check-in',
        steps: [
          { kind: 'you', bold: 'Compare & Feedback tab:', text: 'pick a "From" check-in and a "To" check-in. Tick which areas to include.' },
          { kind: 'you', text: 'Switch between "AI Feedback Draft" (Claude writes in your voice) or "Side-by-side comparison" (every field shown side by side — useful for recording feedback videos).' },
          { kind: 'system', text: 'Claude generates a personalised, evidence-based summary — warm and professional, 3–4 short paragraphs.' },
          { kind: 'you', text: 'Edit anything in the textarea. Click "Approve & copy".' },
          { kind: 'off', text: 'Paste into WhatsApp/Instagram/email and send to her.' },
        ],
      }),

      // Stage 8 — Update plan
      createElement(Stage, {
        num: '08',
        title: 'Update her plan as she progresses',
        steps: [
          { kind: 'you', text: 'When she\'s ready for v2: Meal Plan and Training Plan tabs → AI Draft OR manually edit.' },
          { kind: 'you', text: 'Save & Add to Plan History → pick numbers/no-numbers → new branded PDF generated as version 2.' },
          { kind: 'system', text: 'Plan History shows v1 (previous) + v2 (current). Old plans never deleted.' },
          { kind: 'off', text: 'Share new PDF with her like before. She always has access to old plans if needed.' },
        ],
      }),

      // Stage 9 — Payments tracking
      createElement(Stage, {
        num: '09',
        title: 'Ongoing payments',
        steps: [
          { kind: 'off', text: 'Each month, invoice her externally (bank/PayPal/Stripe).' },
          { kind: 'you', bold: 'Payments tab:', text: 'click "+ Log Payment" when each payment arrives. Mark pending → paid when received.' },
          { kind: 'system', text: 'If a pending payment passes its due date, it shows as "Overdue" in warm orange on the dashboard.' },
        ],
      }),
    ),

    // Page 3 — Tips + closing
    createElement(Page, { size: 'A4', style: s.page },
      createElement(HeaderBar, null),
      createElement(FooterBar, null),

      createElement(Text, { style: s.bodySection }, 'Two key things to remember'),

      createElement(View, { style: s.tipBox },
        createElement(Text, { style: s.tipHead }, '1.  One link for every client — they identify themselves by email'),
        createElement(Text, { style: s.tipLine }, 'You don\'t generate a new check-in link per client. The same /checkin URL works for everyone. They enter their email at the top, and the system matches them to their file.'),
        createElement(Text, { style: s.tipLine }, 'Optionally, use the personalised URL from each client\'s Overview tab (email & name pre-filled) — this eliminates the typo risk and feels more personal to the client.'),
      ),

      createElement(View, { style: s.tipBox },
        createElement(Text, { style: s.tipHead }, '2.  AI drafts are always editable — you stay in control'),
        createElement(Text, { style: s.tipLine }, 'Every AI output (feedback, meal plan, training plan) is a draft that you review and edit before saving or sending. Nothing is ever auto-sent to a client.'),
        createElement(Text, { style: s.tipLine }, 'The Anthropic Claude prompts are primed with: you are an HCPC-registered RD, evidence-based, UK foods, metric units, warm-professional tone.'),
      ),

      createElement(Text, { style: s.bodySection }, 'Quick reference — your client URLs'),

      createElement(View, { style: s.tipBox },
        createElement(Text, { style: s.tipHead }, 'Onboarding link (one for everyone)'),
        createElement(Text, { style: s.tipLine }, 'https://meal-generator-murex.vercel.app/onboarding'),
        createElement(Text, { style: s.tipHead, ...{ marginTop: 8 } }, 'Generic check-in link (one for everyone — email matches them to file)'),
        createElement(Text, { style: s.tipLine }, 'https://meal-generator-murex.vercel.app/checkin'),
        createElement(Text, { style: s.tipHead, ...{ marginTop: 8 } }, 'Personalised check-in link (per client — email pre-filled)'),
        createElement(Text, { style: s.tipLine }, 'https://meal-generator-murex.vercel.app/checkin?email=CLIENT_EMAIL&name=CLIENT_NAME'),
        createElement(Text, { style: s.tipLine }, '(Copy this directly from each client\'s Overview tab — no manual URL editing needed.)'),
      ),

      createElement(Text, { style: s.bodySection }, 'What\'s automated vs. what you do'),

      createElement(View, { style: s.tipBox },
        createElement(Text, { style: s.tipHead }, '⚙ Automated by the platform'),
        createElement(Text, { style: s.tipLine }, '• New client created from onboarding form'),
        createElement(Text, { style: s.tipLine }, '• Check-in saved to correct client file (via email match)'),
        createElement(Text, { style: s.tipLine }, '• Current weight updated from each check-in'),
        createElement(Text, { style: s.tipLine }, '• Week number auto-calculated'),
        createElement(Text, { style: s.tipLine }, '• AI drafts generated on-demand (you click the button)'),
        createElement(Text, { style: s.tipLine }, '• Plan PDFs generated and stored permanently'),
        createElement(Text, { style: s.tipLine }, '• Overdue payment detection'),
      ),

      createElement(View, { style: s.tipBox },
        createElement(Text, { style: s.tipHead }, 'J You do manually'),
        createElement(Text, { style: s.tipLine }, '• Send onboarding link via DM'),
        createElement(Text, { style: s.tipLine }, '• Send check-in link weekly'),
        createElement(Text, { style: s.tipLine }, '• Send plan PDFs and AI feedback via DM/email'),
        createElement(Text, { style: s.tipLine }, '• Log payments when they land in your bank'),
        createElement(Text, { style: s.tipLine }, '• Edit AI drafts before approving'),
        createElement(Text, { style: s.tipLine }, '• Review check-ins (orange "Needs Review" badge tells you when)'),
      ),

      createElement(View, { style: s.tipBox },
        createElement(Text, { style: s.tipHead }, '↗ Outside the platform'),
        createElement(Text, { style: s.tipLine }, '• Initial Instagram message from interested client'),
        createElement(Text, { style: s.tipLine }, '• Payment collection (bank / PayPal / Stripe)'),
        createElement(Text, { style: s.tipLine }, '• Sharing plan PDFs (WhatsApp / DM / email)'),
        createElement(Text, { style: s.tipLine }, '• Sending check-in reminders to your client'),
      ),

      // Closing panel
      createElement(View, { style: s.closeBox, wrap: false },
        createElement(Text, { style: s.closeLogo }, 'hercoach · Jess'),
        createElement(View, { style: s.closeRule }),
        createElement(Text, { style: s.closeTag }, 'Less restriction. More you.'),
        createElement(Text, { style: s.closeCred },
          'Registered Dietitian  ·  HCPC Registered  ·  BDA Member  ·  England & Wales'),
        createElement(View, { style: s.closeRule }),
        createElement(Text, { style: s.closeDisc },
          'This is your private coach workflow reference. Print it, pin it, or keep it on your desktop. ' +
          'The platform evolves with you — features can be added as you grow. ' +
          'Save this PDF as your map.'),
      ),
    ),
  )
}

// ───────── Run ─────────
const outDir = 'C:/Users/jessw/Downloads'
const outFile = `${outDir}/hercoach-jess-workflow-guide.pdf`

if (!existsSync(dirname(outFile))) {
  mkdirSync(dirname(outFile), { recursive: true })
}

renderToFile(Doc(), outFile).then(() => {
  console.log(`✅ Workflow PDF written to: ${outFile}`)
}).catch((err) => {
  console.error('❌ PDF generation failed:', err)
  process.exit(1)
})
