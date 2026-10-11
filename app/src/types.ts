export interface Group {
  id: string
  name: string
  color: string
}

export interface Athlete {
  id: string
  user_id: string | null
  group_id: string | null
  first_name: string
  last_name: string
  birth_year: number | null
  events: string
  phone: string
  avatar: string
  color: string
  goals: string
  favorite_tips: string[]
  /** email saisi par l'entraîneur : sert à relier automatiquement l'inscription */
  email: string
  linked_at: string | null
  /** false = nouvelle inscription à vérifier par l'entraîneur */
  signup_reviewed: boolean
  active: boolean
  created_at?: string
}

export interface TestDef {
  id: string
  name: string
  unit: string
  higher_is_better: boolean
  category: string
  description: string
}

export interface TestResult {
  id: string
  athlete_id: string
  test_id: string
  date: string
  /** meilleur essai */
  value: number
  /** tous les essais (vide si un seul) */
  trials: number[]
  notes: string
}

export interface TestReport {
  id: string
  athlete_id: string
  date: string
  title: string
  strengths: string
  priority: string
  training: string
  message: string
}

export interface Club {
  coach_id: string
  name: string
  invite_code: string
}

export interface AthleteNote {
  id: string
  athlete_id: string
  text: string
  created_at: string
}

export interface Tip {
  id: string
  category: string
  emoji: string
  title: string
  summary: string
  body: string
  published: boolean
  /** true pour les conseils fournis avec l'app (non modifiables) */
  builtin?: boolean
}

export interface PersonalRecord {
  id: string
  athlete_id: string
  event: string
  mark: string
  date: string
  competition: string
}

export interface Wellness {
  id: string
  athlete_id: string
  date: string
  sleep_hours: number | null
  sleep_quality: number | null
  energy: number | null
  soreness: number | null
  stress: number | null
  note: string
}

export interface Exercise {
  id: string
  name: string
  category: string
  description: string
}

export interface SessionItem {
  id: string
  name: string
  sets: string
  reps: string
  distance: string
  duration: string
  recovery: string
  intensity: string
  notes: string
}

export interface Block {
  id: string
  title: string
  items: SessionItem[]
}

export interface Session {
  id: string
  title: string
  objective: string
  focus: string
  duration_min: number | null
  blocks: Block[]
  updated_at?: string
}

export interface Assignment {
  id: string
  session_id: string
  date: string
  time: string
  location: string
  group_id: string | null
  athlete_ids: string[]
  note: string
}

export interface Feedback {
  id: string
  assignment_id: string
  athlete_id: string
  completed: boolean
  rpe: number | null
  fatigue: number | null
  mood: number | null
  pain: string
  comment: string
  coach_reply: string
  updated_at: string
}

export interface Tables {
  groups: Group
  athletes: Athlete
  athlete_notes: AthleteNote
  exercises: Exercise
  sessions: Session
  assignments: Assignment
  feedback: Feedback
  tips: Tip
  records: PersonalRecord
  wellness: Wellness
  tests: TestDef
  test_results: TestResult
  test_reports: TestReport
}

export type TableName = keyof Tables

export type Role = 'coach' | 'athlete' | 'inactive' | 'new'

export interface Me {
  email: string
  role: Role
  athlete_id?: string
  club_name?: string
  invite_code?: string
  /** entraîneur principal (créateur du club) ; false = entraîneur associé */
  is_owner?: boolean
}

/** Entraîneur associé, ajouté par email */
export interface CoachInvite {
  email: string
  /** relié à un compte (s'est déjà connecté) */
  linked: boolean
}

export interface JoinProfile {
  first_name: string
  last_name: string
  birth_year: number | null
  group_id: string | null
  events: string
  phone: string
}

export interface ClubInfo {
  name: string
  groups: { id: string; name: string; color: string }[]
}
