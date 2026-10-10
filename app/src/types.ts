export interface Group {
  id: string
  name: string
  color: string
}

export interface Athlete {
  id: string
  group_id: string | null
  first_name: string
  last_name: string
  birth_year: number | null
  events: string
  notes: string
  access_token: string
  active: boolean
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
  exercises: Exercise
  sessions: Session
  assignments: Assignment
  feedback: Feedback
}

export type TableName = keyof Tables

export interface FeedbackInput {
  completed: boolean
  rpe: number | null
  fatigue: number | null
  mood: number | null
  pain: string
  comment: string
}

export interface PortalAssignment {
  id: string
  date: string
  time: string
  location: string
  note: string
  session: Omit<Session, 'updated_at'>
  feedback: Omit<Feedback, 'assignment_id' | 'athlete_id'> | null
}

export interface PortalData {
  athlete: { id: string; first_name: string; last_name: string; group_name: string | null }
  assignments: PortalAssignment[]
}

export interface Coach {
  email: string
}
