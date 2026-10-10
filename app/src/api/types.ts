import type { Coach, FeedbackInput, PortalData, TableName, Tables } from '../types'

export type Row<K extends TableName> = Tables[K]
export type Draft<K extends TableName> = Partial<Tables[K]> & { id?: string }

export interface Api {
  mode: 'demo' | 'supabase'
  getCoach(): Promise<Coach | null>
  onAuthChange(cb: (coach: Coach | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<void>
  signOut(): Promise<void>

  list<K extends TableName>(table: K): Promise<Row<K>[]>
  save<K extends TableName>(table: K, row: Draft<K>): Promise<Row<K>>
  saveMany<K extends TableName>(table: K, rows: Draft<K>[]): Promise<Row<K>[]>
  remove(table: TableName, id: string): Promise<void>

  portal(token: string): Promise<PortalData>
  submitFeedback(token: string, assignmentId: string, input: FeedbackInput): Promise<void>
}
