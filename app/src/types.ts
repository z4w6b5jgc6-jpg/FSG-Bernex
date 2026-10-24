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
  /** sous-groupe des séances du lundi : 'sprint', '400-800' ou '' */
  subgroup?: string
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
  /** séance d'un plan (lundi) : textes d'origine, cycle, sous-groupe */
  plan?: SessionPlan | Record<string, never>
  /** répétitions chronométrées : temps calculé pour chaque athlète */
  targets?: Target[]
  updated_at?: string
}

export type TargetBase = 'VMA' | 'RVA' | 'REC' | 'INT'
/** Cible : distance en m (durée en s pour INT), base de calcul et pourcentage (0.85 = 85 %) */
export interface Target { ordre: number; d: number; base: TargetBase; pct: number }

export interface SessionPlan {
  name: string
  date: string
  cycle: string
  light: boolean
  objective: string
  warmup: string
  speed: string
  content: string
  cooldown: string
  remarks: string
  subgroup: string
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

/** Message d'un fil (une séance planifiée × un athlète), entre l'athlète et ses coachs */
export interface Message {
  id: string
  assignment_id: string
  athlete_id: string
  /** écrit par un coach (fixé par la base) */
  from_coach: boolean
  /** prénom du coach (vide pour l'athlète) */
  author: string
  body: string
  /** lu par le destinataire */
  read_at: string | null
  created_at: string
}

/** Compétition visée ; athlete_ids vide = tout le club */
export interface Competition {
  id: string
  name: string
  date: string
  end_date: string | null
  location: string
  /** A = objectif principal, B = importante, C = préparation */
  level: 'A' | 'B' | 'C'
  program_url: string
  registration_url: string
  results_url: string
  registration_deadline: string | null
  notes: string
  athlete_ids: string[]
  /** disciplines de chaque participant : { id athlète: "60 m, longueur" } */
  entries: Record<string, string>
}

/** Proposition de l'IA pour une séance (à valider par l'entraîneur) */
export interface AiSuggestion {
  bloc: string
  exercice: string
  /** champ de l'exercice à modifier ('' = conseil général) */
  champ: '' | 'sets' | 'reps' | 'distance' | 'duration' | 'recovery' | 'intensity' | 'notes'
  valeur: string
  proposition: string
  pourquoi: string
}
export interface AiAdvice { resume: string; suggestions: AiSuggestion[] }
export interface ChatMessage { role: 'user' | 'assistant'; content: string }

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
  competitions: Competition
  messages: Message
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
  /** organisation générale des entraînements (texte mis en forme) */
  training_info?: string
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
