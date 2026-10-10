import { createClient } from '@supabase/supabase-js'
import type { TableName } from '../types'
import type { Api, Draft, Row } from './types'

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key)

  const check = <T,>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message)
    return res.data
  }

  return {
    mode: 'supabase',

    async getCoach() {
      const { data } = await sb.auth.getSession()
      const email = data.session?.user.email
      return email ? { email } : null
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        cb(session?.user.email ? { email: session.user.email } : null)
      })
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    },
    async signUp(email, password) {
      const { data, error } = await sb.auth.signUp({ email, password })
      if (error) throw new Error(error.message)
      if (!data.session) throw new Error('Compte créé ! Confirme ton adresse via l’email reçu, puis connecte-toi.')
    },
    async signOut() {
      await sb.auth.signOut()
    },

    async list<K extends TableName>(table: K) {
      const order = table === 'assignments' ? 'date' : 'created_at'
      return check(await sb.from(table).select('*').order(order, { ascending: true })) as Row<K>[]
    },
    async save<K extends TableName>(table: K, row: Draft<K>) {
      const { id, ...rest } = row as Draft<K> & { id?: string }
      const values: Record<string, unknown> = { ...rest }
      if (table === 'sessions') values.updated_at = new Date().toISOString()
      if (table === 'feedback') values.updated_at = new Date().toISOString()
      const query = id
        ? sb.from(table).update(values).eq('id', id)
        : sb.from(table).insert(values)
      return check(await query.select().single()) as Row<K>
    },
    async saveMany<K extends TableName>(table: K, rows: Draft<K>[]) {
      if (rows.length === 0) return []
      return check(await sb.from(table).insert(rows).select()) as Row<K>[]
    },
    async remove(table, id) {
      check(await sb.from(table).delete().eq('id', id))
    },

    async portal(token) {
      const { data, error } = await sb.rpc('athlete_portal', { p_token: token })
      if (error) throw new Error('invalid_token')
      return data
    },
    async submitFeedback(token, assignmentId, input) {
      check(
        await sb.rpc('athlete_submit_feedback', {
          p_token: token,
          p_assignment_id: assignmentId,
          p_completed: input.completed,
          p_rpe: input.rpe,
          p_fatigue: input.fatigue,
          p_mood: input.mood,
          p_pain: input.pain,
          p_comment: input.comment,
        }),
      )
    },
  }
}
