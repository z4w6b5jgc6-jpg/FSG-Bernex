import { createClient } from '@supabase/supabase-js'
import type { ClubInfo, Me, TableName } from '../types'
import type { Api, Draft, Row } from './types'

const ORDER: Partial<Record<TableName, string>> = { assignments: 'date', wellness: 'date', records: 'date', test_results: 'date', test_reports: 'date', competitions: 'date', session_notes: 'updated_at' }

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet email. Connecte-toi.',
  'Email not confirmed': 'Confirme d’abord ton adresse via l’email reçu.',
  invalid_code: 'Ce code d’invitation n’existe pas.',
  already_member: 'Ce compte est déjà inscrit dans un club.',
  is_coach: 'Ce compte est un compte entraîneur.',
  already_athlete: 'Ce compte est déjà un compte athlète.',
  target_has_account: 'Ce profil est déjà relié à un autre compte.',
  invalid_invite: 'Ce lien d’invitation n’est plus valable (déjà utilisé ou expiré). Demande un nouveau lien.',
  club_coaches_pkey: 'Cet entraîneur est déjà ajouté.',
  'schema cache': `La base doit être mise à jour : ouvre ${window.location.host}/#/base et suis les étapes.`,
  club_coaches_email_check: 'Adresse email invalide.',
}

function fail(message: string): never {
  const key = Object.keys(ERRORS).find((k) => message.includes(k))
  throw new Error(key ? ERRORS[key] : message)
}

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key)

  const check = <T,>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) fail(res.error.message)
    return res.data
  }

  return {
    mode: 'supabase',

    async getMe() {
      const { data } = await sb.auth.getSession()
      const email = data.session?.user.email
      if (!email) return null
      const who = check(await sb.rpc('whoami')) as Omit<Me, 'email'>
      return { email, ...who }
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') cb()
      })
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) fail(error.message)
    },
    async signUp(email, password) {
      const { data, error } = await sb.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.href.split('#')[0] },
      })
      if (error) fail(error.message)
      return !!data.session
    },
    async signOut() {
      await sb.auth.signOut()
    },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split('#')[0] })
      if (error) fail(error.message)
    },

    async createClub(name) {
      check(await sb.rpc('create_club', { p_name: name }))
    },
    async clubByCode(code) {
      return check(await sb.rpc('club_by_code', { p_code: code })) as ClubInfo | null
    },
    async joinClub(code, p) {
      check(await sb.rpc('join_club', {
        p_code: code, p_first_name: p.first_name, p_last_name: p.last_name, p_birth_year: p.birth_year,
        p_group_id: p.group_id, p_events: p.events, p_phone: p.phone,
      }))
    },
    async mergeAthletes(fromId, intoId) {
      check(await sb.rpc('merge_athletes', { p_from: fromId, p_into: intoId }))
    },
    async regenerateInviteCode() {
      return check(await sb.rpc('regenerate_invite_code')) as string
    },
    async chat(messages, s) {
      const { data } = await sb.auth.getSession()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify({
          messages,
          session: s ? { title: s.title, objective: s.objective, focus: s.focus, duration_min: s.duration_min,
            blocks: s.blocks.map((b) => ({ title: b.title, items: b.items.map(({ id: _id, ...it }) => (void _id, it)) })) } : null,
        }),
      })
      const out = await res.json().catch(() => null)
      if (!res.ok || !out) throw new Error(out?.error ?? (res.status === 404 ? 'Le service IA n’est pas encore en ligne.' : `Erreur ${res.status}`))
      return out.reply as string
    },
    async improveSession(s) {
      const { data } = await sb.auth.getSession()
      const res = await fetch('/api/ameliorer', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
        // Contenu d'entraînement uniquement : pas d'identifiants, pas d'athlètes
        body: JSON.stringify({
          title: s.title, objective: s.objective, focus: s.focus, duration_min: s.duration_min,
          blocks: s.blocks.map((b) => ({ title: b.title, items: b.items.map(({ id: _id, ...it }) => (void _id, it)) })),
        }),
      })
      const out = await res.json().catch(() => null)
      if (!res.ok || !out) throw new Error(out?.error ?? (res.status === 404 ? 'Le service IA n’est pas encore en ligne.' : `Erreur ${res.status}`))
      return out
    },
    async saveTrainingInfo(text) {
      check(await sb.rpc('set_training_info', { p_text: text }))
    },
    async listCoaches() {
      const rows = check(await sb.from('club_coaches').select('email, user_id').order('created_at')) as { email: string; user_id: string | null }[]
      return rows.map((r) => ({ email: r.email, linked: !!r.user_id }))
    },
    async addCoach(email) {
      check(await sb.from('club_coaches').insert({ email: email.trim().toLowerCase() }))
    },
    async removeCoach(email) {
      check(await sb.from('club_coaches').delete().eq('email', email))
    },
    async createCoachInvite(token) {
      check(await sb.from('coach_invites').insert({ token }))
    },
    async coachInviteInfo(token) {
      return check(await sb.rpc('coach_invite_info', { p_token: token })) as { name: string } | null
    },
    async acceptCoachInvite(token) {
      check(await sb.rpc('accept_coach_invite', { p_token: token }))
    },

    async list<K extends TableName>(table: K) {
      return check(await sb.from(table).select('*').order(ORDER[table] ?? 'created_at', { ascending: true })) as Row<K>[]
    },
    async save<K extends TableName>(table: K, row: Draft<K>) {
      const { id, ...rest } = row as Draft<K> & { id?: string }
      const values: Record<string, unknown> = { ...rest }
      if (table === 'sessions' || table === 'tips') values.updated_at = new Date().toISOString()
      const query = id ? sb.from(table).update(values).eq('id', id) : sb.from(table).insert(values)
      return check(await query.select().single()) as Row<K>
    },
    async saveMany<K extends TableName>(table: K, rows: Draft<K>[]) {
      if (rows.length === 0) return []
      return check(await sb.from(table).insert(rows).select()) as Row<K>[]
    },
    async remove(table, id) {
      check(await sb.from(table).delete().eq('id', id))
    },
    async pushKey() {
      const res = await fetch('/api/push-key').catch(() => null)
      const out = res?.ok ? await res.json().catch(() => null) : null
      return (out?.key as string | undefined) || null
    },
    async savePush(endpoint) {
      check(await sb.rpc('save_push', { p_endpoint: endpoint }))
    },
    async removePush(endpoint) {
      check(await sb.from('push_subscriptions').delete().eq('endpoint', endpoint))
    },
    async notify(kind, id) {
      const { data } = await sb.auth.getSession()
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify({ kind, id }),
      }).catch(() => null)
    },
    async removeMany(table, ids) {
      for (let i = 0; i < ids.length; i += 100) check(await sb.from(table).delete().in('id', ids.slice(i, i + 100)))
    },
  }
}
