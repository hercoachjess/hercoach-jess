export interface Client {
  id: string
  created_at: string
  full_name: string
  email: string
  phone: string
  status: 'active' | 'paused' | 'archived'
  date_of_birth: string | null
  sex: string | null
  height_cm: number | null
  starting_weight_kg: number | null
  current_weight_kg: number | null
  goal: string | null
  primary_goal_kcal: number | null
  protein_target_g: number | null
  fat_target_g: number | null
  carbs_target_g: number | null
  hr_resting: number | null
  hr_max: number | null
  hr_zone2_low: number | null
  hr_zone2_high: number | null
  checkin_day: string | null
  coach_notes: string | null
  pinned_note: string | null
  food_dislikes_override: string | null
  exercise_dislikes: string | null
}

export interface OnboardingSubmission {
  id: string
  client_id: string
  created_at: string
  payload: OnboardingPayload
  signed_name: string
  signed_date: string
}

export interface OnboardingPayload {
  basics: {
    first_name: string
    age: string
    current_weight_kg: string
    height_cm: string
    goal_weight_kg: string
    city: string
    email: string
    phone: string
    gp_surgery: string
  }
  goals: {
    primary_goal: string
    timeline: string
    why: string
    previous: string
  }
  lifestyle: {
    activity: string
    experience: string
    training_days_per_week: string
    session_length: string
    training_location: string
    job: string
  }
  food_preferences: {
    diet_type: string
    meals_per_day: string
    cooking_confidence: string
    meal_prep: string
    foods_loved: string
    foods_disliked: string
    allergies: string
    supplements: string
    eating_pattern: string
  }
  health_screening: {
    injuries: string
    conditions: string[]
    medications: string
    pregnancy: string
    mental_health: string
    food_relationship: string
    ed_history: string[]
    mh_notes: string
    sleep: string
    stress_level: string
    water_intake: string
    alcohol: string
    other_health: string
  }
  acknowledgements: {
    scope: boolean
    referral: boolean
    health: boolean
    liability: boolean
    payment: boolean
    cancellation: boolean
    data: boolean
    age: boolean
  }
}

export interface CheckinSubmission {
  id: string
  client_id: string
  created_at: string
  week_number: number | null
  payload: CheckinPayload
  body_measurements?: BodyMeasurements
  photos?: string[]
}

export interface BodyMeasurements {
  waist_cm?: number | null
  hips_cm?: number | null
  chest_cm?: number | null
  thigh_cm?: number | null
  arm_cm?: number | null
}

// Categorical check-in answers (the form uses pills/icons/selects rather than 1–10 sliders)
export interface CheckinPayload {
  name: string
  email: string
  weight_kg: number | null
  clothes_fit: string
  body_feel: string                // Amazing | Good | Okay | Not great | Rough week
  nutrition_adherence: string      // Nailed it | Mostly on track | About 50/50 | Struggled | Off the rails
  threw_off: string
  hunger: string
  cravings: string
  training_sessions: string        // None | 1 session | 2 | 3 | 4 | Did extra
  training_feel: string
  prs: string
  discomfort: string
  sleep_quality: string
  stress_level: string
  energy: string
  water_intake: string
  biggest_win: string
  hardest_part: string
  mood: string                     // Amazing | Positive | Neutral | Low | Struggling
  questions_for_jess: string
}

export interface MealPlan {
  id: string
  client_id: string
  created_at: string
  updated_at: string
  status: 'draft' | 'saved' | 'archived'
  targets: MacroTargets
  meals: Meal[]
  food_facts: FoodFact[]
  coach_notes: string | null
  is_current: boolean
}

export interface FoodFact {
  food: string
  fact: string
  source: string
}

export interface MacroTargets {
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export interface Meal {
  name: string
  time: string
  items: string[]
  alternatives?: MealAlternative[]
}

export interface MealAlternative {
  label: string
  items: string[]
}

export interface TrainingPlan {
  id: string
  client_id: string
  created_at: string
  updated_at: string
  status: 'draft' | 'saved' | 'archived'
  level: 'beginner' | 'intermediate' | 'advanced'
  days_per_week: number
  intensity: 'light' | 'moderate' | 'high'
  training_style: string | null
  programme_length_weeks: 1 | 4 | 8 | 12
  weekly_progression: WeeklyProgression[]
  sessions: TrainingSession[]
  coach_notes: string | null
  is_current: boolean
}

export interface WeeklyProgression {
  week: number
  focus: string
  modifications: string
  intensity_target?: string
}

export interface TrainingSession {
  day: string
  focus: string
  exercises: Exercise[]
}

export interface Exercise {
  name: string
  sets: number
  reps: string
  notes?: string
}

export interface PlanHistory {
  id: string
  client_id: string
  created_at: string
  version: string
  note: string
  meal_plan_snapshot: MealPlan | null
  training_plan_snapshot: TrainingPlan | null
  pdf_url: string | null
  is_current: boolean
}

export interface Payment {
  id: string
  client_id: string
  created_at: string
  amount_gbp: number
  due_date: string
  paid_date: string | null
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  payment_method: string | null
  notes: string | null
}

// Lead capture — the public "coaching enquiries" form fills these rows.
// Each enquiry is tracked through new → contacted → converted/closed.
export interface Enquiry {
  id: string
  created_at: string
  first_name: string
  last_name: string | null
  email: string
  phone: string | null
  goal: string | null
  about: string | null
  hear_from: string | null
  best_contact: string | null
  status: 'new' | 'contacted' | 'converted' | 'closed'
  contacted_at: string | null
  coach_notes: string | null
  client_id: string | null
}

export interface DashboardStats {
  active_clients: number
  checkins_to_review: number
  missed_checkins: number
  overdue_payments: number
}

export interface ClientListRow extends Client {
  latest_checkin?: CheckinSubmission | null
  week_number?: number
  payment_status?: 'paid' | 'pending' | 'overdue' | null
}
