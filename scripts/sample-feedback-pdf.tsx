/* eslint-disable @typescript-eslint/no-explicit-any */
/** Smoke-test + preview for the check-in feedback PDF. npx tsx scripts/sample-feedback-pdf.tsx */
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import CheckinFeedbackDocument from '../lib/pdf/CheckinFeedbackDocument'
import type { Client, CheckinSubmission } from '../types'

const client = { id: 'c1', full_name: 'Sophie Turner', email: 'sophie@example.com', goal: 'Lose fat, build strength, feel confident' } as Client

const mk = (week: number, iso: string, weight: number, extra: any = {}): CheckinSubmission => ({
  id: `ci-${week}`, client_id: 'c1', created_at: iso, week_number: week,
  payload: { name: 'Sophie', email: 'sophie@example.com', weight_kg: weight, clothes_fit: 'A bit looser', body_feel: 'Good', nutrition_adherence: 'Mostly on track', threw_off: 'A meal out Fri', hunger: 'Manageable', cravings: 'Afternoons', training_sessions: '4 sessions', training_feel: 'Strong', prs: 'Hip thrust up 5kg', discomfort: 'None', sleep_quality: 'Good', stress_level: 'Moderate', energy: 'Good', water_intake: '2L', biggest_win: 'Hit all 4 gym sessions', hardest_part: 'Weekend snacking', mood: 'Positive', questions_for_jess: 'Should I add a 5th session?', ...extra } as any,
})

const prev = mk(3, '2026-07-22T09:00:00Z', 72.1)
const current = mk(4, '2026-07-29T09:00:00Z', 71.3)

const feedback = `Hi Sophie, what a solid week — you hit all four gym sessions and your hip thrust is up 5kg, which is exactly the kind of steady strength progress we want to see. Your weight is down 0.8kg to 71.3kg, right in the healthy range for fat loss, and the fact your clothes feel looser tells me the composition change is real, not just the scale.

I can see the weekends are the sticking point, with the snacking and the meal out on Friday. That's completely normal and nothing to feel bad about — one meal out doesn't undo a great week. Let's put a simple plan in place: a protein-forward lunch on Saturdays and keeping your go-to snacks visible so the easy choice is the good one.

On adding a fifth session — I love the enthusiasm, but four quality sessions plus your steps is doing the job beautifully right now. Let's keep recovery high while your strength is climbing, and we can revisit a fifth in a few weeks if you're feeling fresh.

Keep doing exactly what you're doing. Focus this week: protect the weekends and keep logging those sessions. Proud of you.`

const outDir = `${__dirname}/_samples`
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
const el: any = createElement(CheckinFeedbackDocument as any, { client, checkin: current, previousCheckin: prev, feedback })
renderToBuffer(el).then((buf) => {
  const path = `${outDir}/checkin-feedback-preview.pdf`
  writeFileSync(path, buf)
  console.log(`✅ ${path} (${(buf.length / 1024).toFixed(0)} KB)`)
}).catch((e) => { console.error(e); process.exit(1) })
