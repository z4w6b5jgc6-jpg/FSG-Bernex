import type { ClubInfo, JoinProfile, Me, TableName, Tables } from '../types'

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

  // Données (filtrées selon le rôle par la base)
  list<K extends TableName>(table: K): Promise<Row<K>[]>
  save<K extends TableName>(table: K, row: Draft<K>): Promise<Row<K>>
  saveMany<K extends TableName>(table: K, rows: Draft<K>[]): Promise<Row<K>[]>
  remove(table: TableName, id: string): Promise<void>
}
