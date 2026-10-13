import type { AiAdvice, ChatMessage, ClubInfo, CoachInvite, JoinProfile, Me, Session, TableName, Tables } from '../types'

export type Row<K extends TableName> = Tables[K]
export type Draft<K extends TableName> = Partial<Tables[K]> & { id?: string }

export interface Api {
  mode: 'demo' | 'supabase'

  // Comptes
  getMe(): Promise<Me | null>
  onAuthChange(cb: () => void): () => void
  signIn(email: string, password: string): Promise<void>
  /** Retourne false si l'email doit d'abord être confirmé */
  signUp(email: string, password: string): Promise<boolean>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>

  // Club
  createClub(name: string): Promise<void>
  clubByCode(code: string): Promise<ClubInfo | null>
  joinClub(code: string, profile: JoinProfile): Promise<void>
  regenerateInviteCode(): Promise<string>
  saveTrainingInfo(text: string): Promise<void>
  /** Suggestions de l'IA (contenu de la séance seulement, aucune donnée d'athlète) */
  improveSession(session: Pick<Session, 'title' | 'objective' | 'focus' | 'duration_min' | 'blocks'>): Promise<AiAdvice>
  /** Conversation avec l'assistant (noms déjà masqués), éventuellement à propos d'une séance */
  chat(messages: ChatMessage[], session?: Pick<Session, 'title' | 'objective' | 'focus' | 'duration_min' | 'blocks'> | null): Promise<string>
  /** Relie une inscription (from) au profil créé par l'entraîneur (into) et supprime le doublon */
  mergeAthletes(fromId: string, intoId: string): Promise<void>

  // Entraîneurs associés (même club, mêmes droits)
  listCoaches(): Promise<CoachInvite[]>
  addCoach(email: string): Promise<void>
  removeCoach(email: string): Promise<void>
  /** Lien d'invitation entraîneur à usage unique (le jeton est créé côté app) */
  createCoachInvite(token: string): Promise<void>
  coachInviteInfo(token: string): Promise<{ name: string } | null>
  acceptCoachInvite(token: string): Promise<void>

  // Données (filtrées selon le rôle par la base)
  list<K extends TableName>(table: K): Promise<Row<K>[]>
  save<K extends TableName>(table: K, row: Draft<K>): Promise<Row<K>>
  saveMany<K extends TableName>(table: K, rows: Draft<K>[]): Promise<Row<K>[]>
  remove(table: TableName, id: string): Promise<void>
}
