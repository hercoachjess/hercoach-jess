/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Renders realistic SAMPLE client plan PDFs so we can eyeball what a client
 * actually receives — no database or secrets needed. Throwaway review tool.
 *
 *   npx tsx scripts/sample-plan-pdfs.tsx
 *
 * Writes three PDFs to scripts/_samples/.
 */
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import ClientPlanDocument from '../lib/pdf/ClientPlanDocument'
import type { Client, MealPlan, TrainingPlan } from '../types'

// ── Sample client — trains early, so "Your Week" places the session before breakfast ──
const client: Client = {
  id: 'sample-1',
  created_at: '2026-06-01T09:00:00Z',
  full_name: 'Sophie Turner',
  email: 'sophie@example.com',
  phone: '07700 900123',
  status: 'active',
  date_of_birth: '1992-04-18', // ~34 → drives personalised HR zones
  sex: 'female',
  height_cm: 166,
  starting_weight_kg: 74,
  current_weight_kg: 71,
  goal: 'Lose fat, build strength, feel confident and energised',
  primary_goal_kcal: 1800,
  protein_target_g: 130,
  fat_target_g: 60,
  carbs_target_g: 190,
  hr_resting: 62,
  hr_max: null,
  hr_zone2_low: null,
  hr_zone2_high: null,
  checkin_day: 'Monday',
  coach_notes: null,
  pinned_note: null,
  food_dislikes_override: null,
  exercise_dislikes: null,
  routine_type: 'fixed',
  routine_notes: 'Up at 6, gym 6:30am before work most days. Breakfast ~8, lunch 1pm at desk, dinner around 7.',
}

const mealPlan: MealPlan = {
  id: 'mp-1', client_id: 'sample-1',
  created_at: '2026-06-01T09:00:00Z', updated_at: '2026-06-01T09:00:00Z',
  status: 'saved', is_current: true, coach_notes: null,
  targets: { kcal: 1800, protein_g: 130, fat_g: 60, carbs_g: 190 },
  food_facts: [
    { food: 'Greek yoghurt', fact: 'High in protein and calcium, supports muscle repair and bone health.', source: 'BDA' },
    { food: 'Oats', fact: 'Beta-glucan fibre helps keep you full and supports healthy cholesterol.', source: 'NHS' },
  ],
  meals: [
    {
      name: 'Breakfast', time: '8am',
      items: [
        { food: 'Porridge oats', brand: 'Quaker', quantity: 50, unit: 'g', kcal: 190, protein_g: 7, fat_g: 4, carbs_g: 32 },
        { food: 'Semi-skimmed milk', quantity: 200, unit: 'ml', kcal: 100, protein_g: 7, fat_g: 3, carbs_g: 10 },
        { food: 'Blueberries', quantity: 80, unit: 'g', kcal: 45, protein_g: 1, fat_g: 0, carbs_g: 10 },
        { food: 'Whey protein', brand: 'MyProtein', quantity: 1, unit: 'scoop', kcal: 105, protein_g: 21, fat_g: 2, carbs_g: 2 },
      ],
      prep_notes: 'Make overnight oats the night before so it is grab-and-go after the gym.',
    },
    {
      name: 'Lunch', time: '1pm',
      items: [
        { food: 'Chicken breast', quantity: 150, unit: 'g', kcal: 245, protein_g: 46, fat_g: 5, carbs_g: 0 },
        { food: 'Cooked basmati rice', quantity: 180, unit: 'g', kcal: 235, protein_g: 5, fat_g: 1, carbs_g: 52 },
        { food: 'Mixed salad + olive oil', quantity: 1, unit: 'item', kcal: 120, protein_g: 2, fat_g: 11, carbs_g: 4 },
      ],
      alternatives: [
        { label: 'Veggie swap', items: [
          { food: 'Tofu, firm', quantity: 150, unit: 'g', kcal: 180, protein_g: 20, fat_g: 10, carbs_g: 3 },
          { food: 'Cooked basmati rice', quantity: 180, unit: 'g', kcal: 235, protein_g: 5, fat_g: 1, carbs_g: 52 },
        ] },
      ],
    },
    {
      name: 'Dinner', time: '7pm',
      items: [
        { food: 'Lean beef mince, 5%', quantity: 150, unit: 'g', kcal: 220, protein_g: 32, fat_g: 8, carbs_g: 0 },
        { food: 'Wholewheat pasta', quantity: 70, unit: 'g', kcal: 245, protein_g: 10, fat_g: 2, carbs_g: 50 },
        { food: 'Tomato & veg sauce', quantity: 1, unit: 'item', kcal: 90, protein_g: 3, fat_g: 3, carbs_g: 12 },
      ],
    },
  ],
}

const trainingPlan: TrainingPlan = {
  id: 'tp-1', client_id: 'sample-1',
  created_at: '2026-06-01T09:00:00Z', updated_at: '2026-06-01T09:00:00Z',
  status: 'saved', is_current: true, coach_notes: null,
  level: 'intermediate', days_per_week: 4, intensity: 'moderate',
  training_style: 'Upper/lower split', programme_length_weeks: 8,
  weekly_progression: [
    { week: 1, focus: 'Technique & baseline', modifications: 'Leave 2–3 reps in reserve, nail form.', intensity_target: 'RPE 6–7' },
    { week: 2, focus: 'Add load', modifications: 'Small weight increases where all reps hit.', intensity_target: 'RPE 7' },
  ],
  sessions: [
    { day: 'Monday', focus: 'Lower body — strength', exercises: [
      { name: 'Goblet squat', sets: 4, reps: '8–10', notes: 'Controlled 3-sec descent.' },
      { name: 'Romanian deadlift', sets: 3, reps: '10–12', notes: 'Feel the hamstrings.' },
      { name: 'Walking lunges', sets: 3, reps: '12 each leg' },
      { name: 'Leg press', sets: 3, reps: '12–15' },
    ] },
    { day: 'Tuesday', focus: 'Upper body — push/pull', exercises: [
      { name: 'Dumbbell bench press', sets: 4, reps: '8–10' },
      { name: 'Lat pulldown', sets: 3, reps: '10–12' },
      { name: 'Seated shoulder press', sets: 3, reps: '10–12' },
      { name: 'Cable row', sets: 3, reps: '12' },
    ] },
    { day: 'Wednesday', focus: 'Rest & recovery', exercises: [] },
    { day: 'Thursday', focus: 'Lower body — glutes', exercises: [
      { name: 'Hip thrust', sets: 4, reps: '10–12' },
      { name: 'Bulgarian split squat', sets: 3, reps: '10 each leg' },
      { name: 'Leg curl', sets: 3, reps: '12–15' },
    ] },
    { day: 'Friday', focus: 'Upper body + core', exercises: [
      { name: 'Incline dumbbell press', sets: 3, reps: '10–12' },
      { name: 'Assisted pull-up', sets: 3, reps: '6–8' },
      { name: 'Plank', sets: 3, reps: '45 sec' },
    ] },
    { day: 'Saturday', focus: 'Rest & recovery', exercises: [] },
    { day: 'Sunday', focus: 'Rest & recovery', exercises: [] },
  ],
}

const outDir = `${__dirname}/_samples`
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

async function render(name: string, element: any) {
  const buf = await renderToBuffer(element)
  const path = `${outDir}/${name}.pdf`
  writeFileSync(path, buf)
  console.log(`✅ ${path} (${(buf.length / 1024).toFixed(0)} KB)`)
}

async function main() {
  await render(
    '1-full-plan',
    createElement(ClientPlanDocument as any, {
      client, mealPlan, trainingPlan, version: 'v1', includeNumbers: true,
    }),
  )
  await render(
    '2-meal-only',
    createElement(ClientPlanDocument as any, {
      client, mealPlan, trainingPlan: null, version: 'v1', includeNumbers: true,
    }),
  )
  await render(
    '3-training-only',
    createElement(ClientPlanDocument as any, {
      client, mealPlan: null, trainingPlan, version: 'v1', includeNumbers: true,
    }),
  )
  console.log('\nDone.')
}

main().catch((e) => { console.error(e); process.exit(1) })
