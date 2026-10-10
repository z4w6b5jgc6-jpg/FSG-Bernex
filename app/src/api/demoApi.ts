// Mode démo : toutes les données restent dans le navigateur (localStorage).
// Permet d'essayer l'application sans configurer Supabase.
import { DEFAULT_EXERCISES } from '../data/defaults'
import type { Coach, PortalData, TableName, Tables } from '../types'
import { addDays, athletesFor, emptyItem, todayISO, uid } from '../lib/utils'
import type { Api, Draft, Row } from './types'

const KEY = 'athle-demo-db-v1'
const AUTH_KEY = 'athle-demo-coach'

type Db = { [K in TableName]: Tables[K][] }

function seed(): Db {
  const today = todayISO()
  const u14 = { id: uid(), name: 'U14', color: '#2563eb' }
  const u16 = { id: uid(), name: 'U16', color: '#db2777' }
  const mk = (first: string, last: string, group: string, year: number, events: string) => ({
    id: uid(), group_id: group, first_name: first, last_name: last, birth_year: year,
    events, notes: '', access_token: uid(), active: true,
  })
  const athletes = [
    mk('Léa', 'Martin', u14.id, 2013, '60 m, longueur'),
    mk('Noah', 'Rossier', u14.id, 2013, '1000 m'),
    mk('Inès', 'Favre', u16.id, 2011, '80 m haies, hauteur'),
    mk('Luca', 'Bianchi', u16.id, 2011, 'poids, disque'),
  ]
  const item = (name: string, f: Partial<ReturnType<typeof emptyItem>>) => ({ ...emptyItem(name), ...f })
  const vitesse = {
    id: uid(), title: 'Vitesse – départs et accélérations', objective: 'Améliorer la mise en action et la réaction au signal.',
    focus: 'Vitesse', duration_min: 90, updated_at: new Date().toISOString(),
    blocks: [
      { id: uid(), title: 'Échauffement', items: [
        item('Footing léger', { duration: '10 min' }),
        item('Montées de genoux', { sets: '2', distance: '20 m' }),
        item('Skipping', { sets: '2', distance: '20 m' }),
      ] },
      { id: uid(), title: 'Corps de séance', items: [
        item('Départs en position', { sets: '2', reps: '4', distance: '20 m', recovery: '1\'30', intensity: '100%', notes: 'Départ 3 appuis, au clap.' }),
        item('Sprint lancé', { reps: '4', distance: '30 m', recovery: '3\'', intensity: '95%' }),
      ] },
      { id: uid(), title: 'Retour au calme', items: [item('Étirements', { duration: '10 min' })] },
    ],
  }
  const endurance = {
    id: uid(), title: 'Endurance – fractionné court', objective: 'Développer la VMA.',
    focus: 'Endurance', duration_min: 75, updated_at: new Date().toISOString(),
    blocks: [
      { id: uid(), title: 'Échauffement', items: [item('Footing léger', { duration: '15 min' })] },
      { id: uid(), title: 'Corps de séance', items: [
        item('Fractionné court', { sets: '2', reps: '8', duration: '30"/30"', recovery: '3\' entre séries', intensity: '100% VMA' }),
      ] },
      { id: uid(), title: 'Retour au calme', items: [item('Retour au calme', { duration: '10 min' })] },
    ],
  }
  const a1 = { id: uid(), session_id: vitesse.id, date: addDays(today, -2), time: '18:00', location: 'Stade du Bois-des-Frères', group_id: u14.id, athlete_ids: [], note: '' }
  const a2 = { id: uid(), session_id: endurance.id, date: today, time: '18:00', location: 'Stade', group_id: u16.id, athlete_ids: [], note: 'Prendre des baskets de route.' }
  const a3 = { id: uid(), session_id: vitesse.id, date: addDays(today, 3), time: '18:00', location: 'Stade', group_id: u16.id, athlete_ids: [athletes[0].id], note: '' }
  const now = new Date().toISOString()
  return {
    groups: [u14, u16],
    athletes,
    exercises: DEFAULT_EXERCISES.map((e) => ({ id: uid(), ...e })),
    sessions: [vitesse, endurance],
    assignments: [a1, a2, a3],
    feedback: [
      { id: uid(), assignment_id: a1.id, athlete_id: athletes[0].id, completed: true, rpe: 7, fatigue: 2, mood: 5, pain: '', comment: 'Super séance, les départs au clap c’était cool !', coach_reply: '', updated_at: now },
      { id: uid(), assignment_id: a1.id, athlete_id: athletes[1].id, completed: true, rpe: 8, fatigue: 4, mood: 3, pain: 'Un peu mal au mollet droit', comment: 'Dur à la fin.', coach_reply: '', updated_at: now },
    ],
  }
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch {
    /* ignore */
  }
  const db = seed()
  persist(db)
  return db
}

function persist(db: Db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* ignore */
  }
}

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 50))

export function createDemoApi(): Api {
  let db = load()
  const listeners = new Set<(c: Coach | null) => void>()
  const currentCoach = (): Coach | null => {
    try {
      const email = localStorage.getItem(AUTH_KEY)
      return email ? { email } : null
    } catch {
      return null
    }
  }
  const setCoach = (email: string | null) => {
    try {
      if (email) localStorage.setItem(AUTH_KEY, email)
      else localStorage.removeItem(AUTH_KEY)
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l(currentCoach()))
  }
  return {
    mode: 'demo',
    async getCoach() {
      return currentCoach()
    },
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signIn(email) {
      setCoach(email || 'coach@demo.ch')
    },
    async signUp(email) {
      setCoach(email || 'coach@demo.ch')
    },
    async signOut() {
      setCoach(null)
    },

    async list<K extends TableName>(table: K) {
      db = load()
      return delay(db[table] as Row<K>[])
    },
    async save<K extends TableName>(table: K, row: Draft<K>) {
      db = load()
      const rows = db[table] as Row<K>[]
      const extra: Record<string, unknown> = {}
      if (table === 'sessions' || table === 'feedback') extra.updated_at = new Date().toISOString()
      let saved: Row<K>
      if (row.id) {
        const i = rows.findIndex((r) => (r as { id: string }).id === row.id)
        if (i < 0) throw new Error('Introuvable')
        saved = { ...rows[i], ...row, ...extra }
        rows[i] = saved
      } else {
        saved = { ...defaults(table), ...row, ...extra, id: uid() } as unknown as Row<K>
        rows.push(saved)
      }
      persist(db)
      return delay(saved)
    },
    async saveMany<K extends TableName>(table: K, rows: Draft<K>[]) {
      const out: Row<K>[] = []
      for (const r of rows) out.push(await this.save(table, r))
      return out
    },
    async remove(table, id) {
      db = load()
      ;(db[table] as { id: string }[]) = (db[table] as { id: string }[]).filter((r) => r.id !== id)
      if (table === 'sessions') db.assignments = db.assignments.filter((a) => a.session_id !== id)
      if (table === 'groups') {
        db.assignments = db.assignments.filter((a) => a.group_id !== id)
        db.athletes = db.athletes.map((a) => (a.group_id === id ? { ...a, group_id: null } : a))
      }
      const assignmentIds = new Set(db.assignments.map((a) => a.id))
      const athleteIds = new Set(db.athletes.map((a) => a.id))
      db.feedback = db.feedback.filter((f) => assignmentIds.has(f.assignment_id) && athleteIds.has(f.athlete_id))
      persist(db)
    },

    async portal(token) {
      db = load()
      const athlete = db.athletes.find((a) => a.access_token === token && a.active)
      if (!athlete) throw new Error('invalid_token')
      const minDate = addDays(todayISO(), -60)
      const data: PortalData = {
        athlete: {
          id: athlete.id, first_name: athlete.first_name, last_name: athlete.last_name,
          group_name: db.groups.find((g) => g.id === athlete.group_id)?.name ?? null,
        },
        assignments: db.assignments
          .filter((a) => a.date >= minDate && athletesFor(a, [athlete]).length > 0)
          .sort((a, b) => b.date.localeCompare(a.date))
          .flatMap((a) => {
            const session = db.sessions.find((s) => s.id === a.session_id)
            if (!session) return []
            const fb = db.feedback.find((f) => f.assignment_id === a.id && f.athlete_id === athlete.id)
            return [{ id: a.id, date: a.date, time: a.time, location: a.location, note: a.note, session, feedback: fb ?? null }]
          }),
      }
      return delay(data)
    },
    async submitFeedback(token, assignmentId, input) {
      db = load()
      const athlete = db.athletes.find((a) => a.access_token === token && a.active)
      if (!athlete) throw new Error('invalid_token')
      const existing = db.feedback.find((f) => f.assignment_id === assignmentId && f.athlete_id === athlete.id)
      await this.save('feedback', { ...(existing ?? { assignment_id: assignmentId, athlete_id: athlete.id }), ...input })
    },
  }
}

function defaults(table: TableName): Record<string, unknown> {
  switch (table) {
    case 'groups': return { color: '#2563eb' }
    case 'athletes': return { group_id: null, last_name: '', birth_year: null, events: '', notes: '', access_token: uid(), active: true }
    case 'exercises': return { category: 'Autre', description: '' }
    case 'sessions': return { objective: '', focus: '', duration_min: null, blocks: [] }
    case 'assignments': return { time: '', location: '', group_id: null, athlete_ids: [], note: '' }
    case 'feedback': return { completed: true, rpe: null, fatigue: null, mood: null, pain: '', comment: '', coach_reply: '' }
  }
}
