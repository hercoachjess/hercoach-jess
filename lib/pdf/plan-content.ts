// ─────────────────────────────────────────────────────────────────────────
// Shared PDF plan content + per-export customisation.
//
// Single source of truth for every editable / toggleable block that ends up
// in the client plan PDF. Both the export modal (to seed the editable fields
// Jess sees before generating) and ClientPlanDocument (to render) import from
// here so the preview and the output can never drift apart.
//
// Everything here is *default* content. Nothing is clinical prescription; it
// is general wellness programming that a Registered Dietitian reviews and
// amends per client before it goes out. The defaults follow current UK
// evidence-based guidance (BDA, NHS, ACSM/UK CMO physical-activity guidance).
// ─────────────────────────────────────────────────────────────────────────

export interface YogaRow {
  pose: string
  dur: string
  benefit: string
}

export interface SnackItem {
  name: string
  detail: string
}

/**
 * Full set of per-export choices. Every `include*` flag toggles a section /
 * sub-section on the PDF; every `*Lines` / text field is the editable content
 * for that section. A complete object is built by buildDefaultCustomisation()
 * and handed to the modal; the modal returns the (possibly edited) object to
 * the PDF route unchanged.
 */
export interface PdfCustomisation {
  // ── Cover & overview ──
  includeWelcome: boolean
  includeClientStats: boolean
  clientStatsOverride: string
  includeMacroChips: boolean
  /** Daily step target, shown on the macro chip strip + cardio section. */
  stepGoal: string

  // ── Training ──
  includeTraining: boolean
  includeWarmup: boolean
  warmupLines: string[]
  includeWeeklyStructure: boolean
  includeProgressiveOverload: boolean
  progressiveOverloadLines: string[]
  includeCooldown: boolean
  cooldownLines: string[]
  includeWeeklyProgression: boolean
  weeklyProgressionOverride: string

  // ── Yoga & active recovery ──
  includeYoga: boolean
  yogaIntro: string
  yogaApproachLines: string[]
  yogaRows: YogaRow[]
  yogaTip: string

  // ── Cardio & daily movement ──
  includeCardio: boolean
  cardioLines: string[]
  stepsLines: string[]
  includeHRZones: boolean

  // ── Nutrition ──
  includeNutrition: boolean
  includeSnacks: boolean
  snacks: SnackItem[]
  includeHydration: boolean
  hydrationLines: string[]
  proteinLines: string[]
  includeFoodFacts: boolean

  // ── General guidance ──
  includeGeneralGuidance: boolean
  sleepLines: string[]
  stressLines: string[]
  includeTrainingDayNutrition: boolean
  trainingDayNutritionLines: string[]
  includeNoteFromJess: boolean
  noteFromJessLines: string[]
  includeClosing: boolean
}

// ── Static default content ──────────────────────────────────────────────

export const DEFAULT_STEP_GOAL = '10,000'

export const DEFAULT_WARMUP_LINES = [
  '5 minutes incline treadmill walk, gradient 6–8, easy comfortable pace (Zone 1)',
  'Dynamic leg swings, 10 forward/back + 10 side to side each leg',
  'Hip circles, 10 each direction, hands on hips',
  'Resistance band glute activation, clamshells x15 each side',
  'Resistance band shoulder pull-aparts, x15, controlled',
  'Arm circles and shoulder rolls, 30 seconds each',
  'Bodyweight squats, 10 slow reps to open hips and prepare knees',
]

export const DEFAULT_PROGRESSIVE_OVERLOAD_LINES = [
  'When you complete ALL reps across ALL sets with good form, increase weight by 1–2.5 kg the following week.',
  'Write down your weights every session. Without tracking, progression is guesswork.',
  "If you can't complete the minimum reps, reduce weight slightly and build back up.",
  'Form always comes first. Controlled and slow beats heavy and sloppy.',
]

export const DEFAULT_COOLDOWN_LINES = [
  'Standing quad stretch, 30 seconds each leg',
  'Seated hamstring stretch, 30 seconds each leg, sit tall and hinge forward',
  'Hip flexor lunge stretch, 30 seconds each side',
  'Doorframe or band chest stretch, 30 seconds, open the chest',
  "Child's pose, 45 seconds, lower back release",
  '5 slow deep breaths, bring your heart rate back to Zone 1 before leaving the gym',
]

export const DEFAULT_YOGA_INTRO =
  'This session is your dedicated recovery and mobility day. Gentle, intentional, and just as important as resistance training. Yoga supports flexibility, recovery and mental wellbeing, all of which help you keep training consistently toward your goal. No gym required, do this at home on a yoga mat.'

export const DEFAULT_YOGA_APPROACH_LINES = [
  'Move slowly and intentionally, this is recovery, not a workout',
  'Never force a stretch. Work to the edge of comfort, not pain.',
  'Focus on your breathing throughout, inhale through the nose, exhale slowly through the mouth',
  'Play calm music or a guided yoga audio if it helps you stay present',
  'Duration: 35–45 minutes total',
]

export const DEFAULT_YOGA_ROWS: YogaRow[] = [
  { pose: "Child's Pose",            dur: '90 sec',    benefit: 'Releases lower back, hips, and shoulders. Starting position, breathe deeply.' },
  { pose: 'Cat-Cow Flow',            dur: '10 rounds', benefit: 'Mobilises the spine. Inhale as you arch (cow), exhale as you round (cat). Slow.' },
  { pose: 'Downward Facing Dog',     dur: '60 sec',    benefit: 'Full body stretch, hamstrings, calves, shoulders. Pedal the heels gently.' },
  { pose: 'Low Lunge (each side)',   dur: '60s each',  benefit: 'Opens hip flexors, essential after lower body sessions. Keep back knee soft.' },
  { pose: 'Pigeon Pose (each side)', dur: '90s each',  benefit: 'Deep glute and hip opener. One of the most important poses for gym-goers.' },
  { pose: 'Seated Forward Fold',     dur: '60 sec',    benefit: "Hamstring lengthening. Sit tall, hinge from the hips, don't round the back." },
  { pose: 'Supine Spinal Twist',     dur: '60s each',  benefit: 'Releases the lower back and thoracic spine. Keep both shoulders on the mat.' },
  { pose: 'Legs Up the Wall',        dur: '3 min',     benefit: 'Promotes circulation, reduces swelling in legs, deeply calming.' },
  { pose: 'Savasana',                dur: '5 min',     benefit: 'Full rest. Lie still, close your eyes. Let the nervous system reset completely.' },
]

export const DEFAULT_YOGA_TIP =
  "If you're new to yoga, search 'Yoga with Adriene, 30 minute recovery flow' on YouTube. Free, beginner-friendly, and guided. Alternatively, the Alo Moves or Down Dog apps offer excellent guided sessions."

export const DEFAULT_CARDIO_LINES = [
  '20–25 minutes incline treadmill walk or cross trainer',
  'Perform on rest or mid-week, not the same day as weights',
  'Target Zone 2: 113–132 bpm throughout',
  'Treadmill: gradient 6–10, comfortable walking pace',
  'Cross trainer: moderate resistance, steady consistent rhythm',
  'You should be able to hold a conversation but feel it',
]

export function defaultStepsLines(stepGoal: string): string[] {
  return [
    `${stepGoal} steps = approximately 7 km of movement per day`,
    'A 10-minute walk after each meal adds 3,000 steps easily',
    'Use your phone health app or fitness watch to monitor',
    'Steps from your gym sessions count toward the total',
    'Aim for 8,000 minimum on high-fatigue or rest days',
    'Walking is one of the most underrated tools for body composition',
  ]
}

export function defaultSnacks(includeNumbers: boolean): SnackItem[] {
  return includeNumbers
    ? [
        { name: 'Fruit',           detail: '1 piece\n~70 kcal' },
        { name: 'Protein yoghurt', detail: '150g Fage/Arla\n~130 kcal' },
        { name: 'Rice cakes',      detail: '2 Kallo cakes\n~70 kcal' },
        { name: 'Popcorn',         detail: '20g bag\n~90 kcal' },
        { name: 'Dark chocolate',  detail: '10g (85%+)\n~60 kcal' },
      ]
    : [
        { name: 'Fruit',           detail: '1 piece' },
        { name: 'Protein yoghurt', detail: '150g pot\nFage or Arla' },
        { name: 'Rice cakes',      detail: '2 Kallo cakes' },
        { name: 'Popcorn',         detail: '1 small bag\n(20g)' },
        { name: 'Dark chocolate',  detail: '2 squares\n(85%+)' },
      ]
}

export const DEFAULT_HYDRATION_LINES = [
  '2 to 2.5 litres of water per day as a minimum',
  'Add 500ml extra on each training day',
  'Herbal teas and sparkling water count toward your total',
  'Limit caffeine after 2pm to protect sleep quality',
  'Signs of good hydration: pale yellow urine throughout the day',
  'A 1 litre water bottle refilled twice is the easiest method',
]

export function defaultProteinLines(includeNumbers: boolean, proteinTargetG?: number | null): string[] {
  return includeNumbers
    ? [
        `Target: ${proteinTargetG ?? '—'}g protein per day`,
        'Protein preserves and builds muscle while in a calorie deficit',
        'Spread across 3–4 meals for best absorption',
        'Each meal should contain a palm-sized protein source',
        'Chicken, eggs, Greek yoghurt and lean mince are your easiest wins',
        'If hitting targets is difficult, a protein shake can help',
      ]
    : [
        'Include a protein source at every meal, chicken, eggs, yoghurt, lean mince, tofu',
        'Fill half your plate with vegetables and salad where you can',
        'Include a carbohydrate, rice, pasta, potato, oats, bread, to fuel training',
        'A small amount of healthy fat each day, olive oil, hummus, peanut butter',
        'Eat slowly, without distractions, and stop when comfortably full',
        'Following the portions in this plan takes care of the balance for you',
      ]
}

export function defaultSleepLines(isTrainingOnly: boolean): string[] {
  return isTrainingOnly
    ? [
        'Aim for 7–9 hours every night, this is when your body adapts to training',
        'A consistent bedtime routine makes the biggest difference',
        'Limit screen use 30 minutes before bed',
        'Poor sleep will stall training progress and slow recovery',
        'Flag consistently poor sleep in your weekly check-in',
      ]
    : [
        'Aim for 7–9 hours every night, this is when your body adapts',
        'Poor sleep raises ghrelin (hunger hormone) the next day',
        'A consistent bedtime routine makes the biggest difference',
        'Limit screen use 30 minutes before bed',
        'Poor sleep will stall progress even if nutrition is perfect',
        'Flag consistently poor sleep in your weekly check-in',
      ]
}

export function defaultStressLines(isTrainingOnly: boolean): string[] {
  return isTrainingOnly
    ? [
        'Elevated stress raises cortisol, this actively slows progress',
        'Progress is never perfectly linear, trust the process',
        'A bad day or week does not undo your training progress',
        'Focus on the next session, not the last one',
        'Slow, sustainable change is the strategy. Patience is everything.',
        "Use your weekly check-in honestly, it's where results are made",
      ]
    : [
        'Elevated stress raises cortisol, this actively slows progress',
        'Progress is never perfectly linear, trust the process',
        'A bad day or week does not undo your progress',
        'Focus on the next meal, not the last one',
        'Slow, sustainable change is the strategy. Patience is everything.',
        "Use your weekly check-in honestly, it's where results are made",
      ]
}

export const DEFAULT_TRAINING_DAY_NUTRITION_LINES = [
  'Pre-workout (60–90 mins before): small carbohydrate snack, banana, 2 rice cakes, or your breakfast',
  'Do not train completely fasted, performance drops and recovery is slower',
  'Post-workout (within 60 minutes): protein-rich meal, your lunch option or a protein yoghurt with fruit',
  "On lower body days, you may feel hungrier, this is normal. Have your snack and don't skip it.",
]

export function defaultNoteFromJessLines(
  isTrainingOnly: boolean,
  includeNumbers: boolean,
  kcalTarget?: number | null,
  proteinTargetG?: number | null,
): string[] {
  if (isTrainingOnly) {
    return [
      'This programme has been built specifically for you, your training experience, your goals, and any limitations you shared. It is evidence-based, appropriately progressive, and designed to feel sustainable rather than punishing.',
      'Consistency beats intensity. Turning up week after week is how the adaptations happen. Focus on quality of movement and steady progress rather than pushing every session to failure.',
      "Submit your check-in every week without fail. That is where I can help you most. If something isn't working, tell me. If you have a question, ask me.",
      "You have everything you need. Let's do this.",
    ]
  }
  if (includeNumbers) {
    return [
      'This plan has been built specifically for you, your measurements, your goals, your food preferences, and your lifestyle. It is evidence-based, nutritionally balanced, and designed to create steady, sustainable progress without feeling restrictive.',
      `At ${kcalTarget ?? '~1,800'} kcal with ${proteinTargetG ?? '120–135'}g protein, you are eating enough to fuel your training, protect your muscle, and progress gradually. Slow and steady is the approach that lasts.`,
      "Submit your check-in every week without fail. That is where I can help you most. If something isn't working, tell me. If you have a question, ask me.",
      "You have everything you need. Let's do this.",
    ]
  }
  return [
    'This plan has been built specifically for you, your goals, your food preferences, and your lifestyle. It is evidence-based, nutritionally balanced, and designed to feel sustainable and enjoyable, never restrictive.',
    "You don't need to count or track anything. The meals and portions here have been carefully chosen to support your goal, simply follow the plan and trust it. Eat the meals, enjoy your food, and let the process do the work.",
    "Submit your check-in every week without fail. That is where I can help you most. If something isn't working, tell me. If you have a question, ask me.",
    "You have everything you need. Let's do this.",
  ]
}

// ── Default customisation builder ────────────────────────────────────────

export interface BuildDefaultOpts {
  scope: 'meal' | 'training' | 'full'
  isTrainingOnly: boolean
  includeNumbers: boolean
  statsLine?: string
  weeklyProgressionText?: string
  proteinTargetG?: number | null
  kcalTarget?: number | null
}

/**
 * Build a complete customisation with every section switched ON and seeded
 * with the evidence-based default content. The modal shows this to Jess; the
 * PDF falls back to this when no customisation is supplied (e.g. the Plan
 * History save flow), so behaviour is unchanged for callers that don't opt in.
 */
export function buildDefaultCustomisation(opts: BuildDefaultOpts): PdfCustomisation {
  const stepGoal = DEFAULT_STEP_GOAL
  return {
    includeWelcome: true,
    includeClientStats: true,
    clientStatsOverride: opts.statsLine ?? '',
    includeMacroChips: true,
    stepGoal,

    includeTraining: true,
    includeWarmup: true,
    warmupLines: [...DEFAULT_WARMUP_LINES],
    includeWeeklyStructure: true,
    includeProgressiveOverload: true,
    progressiveOverloadLines: [...DEFAULT_PROGRESSIVE_OVERLOAD_LINES],
    includeCooldown: true,
    cooldownLines: [...DEFAULT_COOLDOWN_LINES],
    includeWeeklyProgression: true,
    weeklyProgressionOverride: opts.weeklyProgressionText ?? '',

    includeYoga: true,
    yogaIntro: DEFAULT_YOGA_INTRO,
    yogaApproachLines: [...DEFAULT_YOGA_APPROACH_LINES],
    yogaRows: DEFAULT_YOGA_ROWS.map((r) => ({ ...r })),
    yogaTip: DEFAULT_YOGA_TIP,

    includeCardio: true,
    cardioLines: [...DEFAULT_CARDIO_LINES],
    stepsLines: defaultStepsLines(stepGoal),
    includeHRZones: true,

    includeNutrition: true,
    includeSnacks: true,
    snacks: defaultSnacks(opts.includeNumbers),
    includeHydration: true,
    hydrationLines: [...DEFAULT_HYDRATION_LINES],
    proteinLines: defaultProteinLines(opts.includeNumbers, opts.proteinTargetG),
    includeFoodFacts: true,

    includeGeneralGuidance: true,
    sleepLines: defaultSleepLines(opts.isTrainingOnly),
    stressLines: defaultStressLines(opts.isTrainingOnly),
    includeTrainingDayNutrition: !opts.isTrainingOnly,
    trainingDayNutritionLines: [...DEFAULT_TRAINING_DAY_NUTRITION_LINES],
    includeNoteFromJess: true,
    noteFromJessLines: defaultNoteFromJessLines(
      opts.isTrainingOnly,
      opts.includeNumbers,
      opts.kcalTarget,
      opts.proteinTargetG,
    ),
    includeClosing: true,
  }
}
