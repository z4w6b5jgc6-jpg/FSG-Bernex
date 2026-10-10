// Mode démo : toutes les données restent dans le navigateur (localStorage).
// Simule les comptes (entraîneur / athlètes) et les règles d'accès de la base.
import { DEFAULT_EXERCISES } from '../data/defaults'
import type { Me, TableName, Tables } from '../types'
import { addDays, athletesFor, emptyItem, todayISO, uid } from '../lib/utils'
import type { Api, Draft, Row } from './types'

const KEY = 'athle-demo-db-v2'
const AUTH_KEY = 'athle-demo-user'
const COACH_ID = 'demo-coach'

interface DemoUser { email: string; id: string; coach: boolean }
type Db = { [K in TableName]: Tables[K][] } & {
  club: { coach_id: string; name: string; invite_code: string }
  users: DemoUser[]
}

function seed(): Db {
  const today = todayISO()
  const u18 = { id: uid(), name: 'U18', color: '#2563eb' }
  const actifs = { id: uid(), name: 'U20 / Actifs', color: '#db2777' }
  const users: DemoUser[] = []
  const mk = (first: string, last: string, group: string, year: number, events: string, avatar: string, color: string, goals: string) => {
    const email = `${first.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@demo.ch`
    const user = { email, id: uid(), coach: false }
    users.push(user)
    return {
      id: uid(), user_id: user.id, group_id: group, first_name: first, last_name: last, birth_year: year,
      events, phone: '', avatar, color, goals, favorite_tips: [] as string[], active: true,
    }
  }
  const athletes = [
    mk('Léa', 'Martin', u18.id, 2010, '100 m, longueur', '⚡', '#7c3aed', 'Passer sous les 13" au 100 m cette saison'),
    mk('Noah', 'Rossier', u18.id, 2009, '800 m, 1500 m', '🦊', '#ea580c', 'Qualif championnats romands'),
    mk('Inès', 'Favre', actifs.id, 2007, '100 m haies, hauteur', '🦋', '#db2777', ''),
    mk('Luca', 'Bianchi', actifs.id, 2006, 'poids, disque', '💪', '#16a34a', ''),
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
        item('Départs en position', { sets: '2', reps: '4', distance: '20 m', recovery: "1'30", intensity: '100%', notes: 'Départ 3 appuis, au clap.' }),
        item('Sprint lancé', { reps: '4', distance: '30 m', recovery: "3'", intensity: '95%' }),
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
        item('Fractionné court', { sets: '2', reps: '8', duration: '30"/30"', recovery: "3' entre séries", intensity: '100% VMA' }),
      ] },
      { id: uid(), title: 'Retour au calme', items: [item('Retour au calme', { duration: '10 min' })] },
    ],
  }
  const asg = (session: string, date: string, group: string, ids: string[] = [], note = '') =>
    ({ id: uid(), session_id: session, date, time: '18:00', location: 'Stade du Bois-des-Frères', group_id: group, athlete_ids: ids, note })
  const assignments = [
    asg(vitesse.id, addDays(today, -9), u18.id), asg(endurance.id, addDays(today, -7), u18.id),
    asg(vitesse.id, addDays(today, -4), u18.id), asg(endurance.id, addDays(today, -2), u18.id),
    asg(endurance.id, today, actifs.id, [], 'Prendre des baskets de route.'),
    asg(vitesse.id, addDays(today, 3), u18.id, [athletes[2].id]),
  ]
  const now = new Date().toISOString()
  const fb = (a: number, ath: number, rpe: number, fatigue: number, mood: number, comment = '', pain = '') => ({
    id: uid(), assignment_id: assignments[a].id, athlete_id: athletes[ath].id, completed: true, rpe, fatigue, mood,
    pain, comment, coach_reply: '', updated_at: addDays(today, -1) + 'T18:00:00.000Z',
  })
  const wellness = [6, 5, 4, 3, 2, 1].map((d, i) => ({
    id: uid(), athlete_id: athletes[0].id, date: addDays(today, -d), sleep_hours: [8, 7.5, 6, 8.5, 7, 9][i],
    sleep_quality: [4, 4, 2, 5, 3, 5][i], energy: [4, 3, 2, 5, 4, 5][i], soreness: [2, 3, 4, 2, 2, 1][i], stress: [2, 2, 4, 1, 2, 1][i], note: '',
  }))
  return {
    club: { coach_id: COACH_ID, name: 'FSG Bernex (démo)', invite_code: 'DEMO2026' },
    users,
    groups: [u18, actifs],
    athletes,
    athlete_notes: [],
    exercises: DEFAULT_EXERCISES.map((e) => ({ id: uid(), ...e })),
    sessions: [vitesse, endurance],
    assignments,
    feedback: [
      fb(0, 0, 6, 2, 4), fb(1, 0, 8, 3, 4, 'Dur mais j’ai tenu toutes les séries 💪'), fb(2, 0, 7, 2, 5, 'Super séance, les départs au clap c’était cool !'),
      fb(2, 1, 8, 4, 3, 'Dur à la fin.', 'Un peu mal au mollet droit'),
    ].map((f) => ({ ...f, updated_at: f.updated_at || now })),
    tips: [{
      id: uid(), category: 'Club', emoji: '📣', title: 'Règles du groupe', published: true,
      summary: 'Ce que j’attends de chacun à l’entraînement.',
      body: '- Arriver 10 minutes avant le début\n- Prévenir sur WhatsApp en cas d’absence\n- Donner son ressenti dans l’app après chaque séance\n\nMerci à tous 🙌',
    }],
    records: [
      { id: uid(), athlete_id: athletes[0].id, event: '100 m', mark: '13"21', date: addDays(today, -40), competition: 'Meeting de Genève' },
      { id: uid(), athlete_id: athletes[0].id, event: 'Longueur', mark: '5,12 m', date: addDays(today, -20), competition: 'Championnat cantonal' },
    ],
    wellness,
  }
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch { /* ignore */ }
  const db = seed()
  persist(db)
  return db
}

function persist(db: Db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* ignore */ }
}

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 40))

export function createDemoApi(): Api {
  let db = load()
  const listeners = new Set<() => void>()
  const currentEmail = (): string | null => {
    try { return localStorage.getItem(AUTH_KEY) } catch { return null }
  }
  const setEmail = (email: string | null) => {
    try {
      if (email) localStorage.setItem(AUTH_KEY, email)
      else localStorage.removeItem(AUTH_KEY)
    } catch { /* ignore */ }
    listeners.forEach((l) => l())
  }
  const currentUser = (): DemoUser | null => {
    const email = currentEmail()
    return email ? db.users.find((u) => u.email === email) ?? null : null
  }
  const myAthlete = () => {
    const u = currentUser()
    return u ? db.athletes.find((a) => a.user_id === u.id) ?? null : null
  }
  const role = (): Me['role'] | null => {
    const u = currentUser()
    if (!u) return null
    if (u.coach) return 'coach'
    const a = myAthlete()
    if (a) return a.active ? 'athlete' : 'inactive'
    return 'new'
  }

  /** Équivalent des règles RLS : ce que l'athlète a le droit de voir */
  function visible<K extends TableName>(table: K): Row<K>[] {
    const rows = db[table] as Row<K>[]
    const r = role()
    if (r === 'coach') return rows
    const me = r === 'athlete' ? myAthlete() : null
    if (!me) return []
    const mine = db.assignments.filter((a) => athletesFor(a, [me]).length > 0)
    const filters: { [T in TableName]: (x: Tables[T]) => boolean } = {
      groups: () => true,
      athletes: (a) => a.id === me.id,
      athlete_notes: () => false,
      exercises: () => false,
      sessions: (s) => mine.some((a) => a.session_id === s.id),
      assignments: (a) => mine.includes(a),
      feedback: (f) => f.athlete_id === me.id,
      tips: (t) => t.published,
      records: (x) => x.athlete_id === me.id,
      wellness: (x) => x.athlete_id === me.id,
    }
    return rows.filter(filters[table] as (x: Row<K>) => boolean)
  }

  return {
    mode: 'demo',

    async getMe() {
      db = load()
      const u = currentUser()
      const r = role()
      if (!u || !r) return null
      const a = myAthlete()
      return {
        email: u.email, role: r, athlete_id: a?.id, club_name: db.club.name,
        invite_code: r === 'coach' ? db.club.invite_code : undefined,
      }
    },
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signIn(email) {
      db = load()
      const e = (email || 'coach@demo.ch').trim().toLowerCase()
      // En démo : un email inconnu devient l'entraîneur du club
      if (!db.users.some((u) => u.email === e)) {
        db.users.push({ email: e, id: COACH_ID, coach: true })
        persist(db)
      }
      setEmail(e)
    },
    async signUp(email) {
      db = load()
      const e = email.trim().toLowerCase()
      if (db.users.some((u) => u.email === e)) throw new Error('Un compte existe déjà avec cet email. Connecte-toi.')
      db.users.push({ email: e, id: uid(), coach: false })
      persist(db)
      setEmail(e)
      return true
    },
    async signOut() {
      setEmail(null)
    },
    async resetPassword() {
      /* rien à faire en démo */
    },

    async createClub(name) {
      db = load()
      const u = currentUser()
      if (!u) throw new Error('Non connecté')
      u.coach = true
      u.id = COACH_ID
      db.club.name = name
      persist(db)
      listeners.forEach((l) => l())
    },
    async clubByCode(code) {
      db = load()
      if (code.trim().toUpperCase() !== db.club.invite_code) return null
      return { name: db.club.name, groups: db.groups.map(({ id, name, color }) => ({ id, name, color })) }
    },
    async joinClub(code, p) {
      db = load()
      const u = currentUser()
      if (!u) throw new Error('Non connecté')
      if (code.trim().toUpperCase() !== db.club.invite_code) throw new Error('Ce code d’invitation n’existe pas.')
      if (myAthlete()) throw new Error('Ce compte est déjà inscrit dans un club.')
      db.athletes.push({
        ...(defaults('athletes') as unknown as Tables['athletes']), id: uid(), user_id: u.id, ...p,
        group_id: db.groups.some((g) => g.id === p.group_id) ? p.group_id : null,
      })
      persist(db)
      listeners.forEach((l) => l())
    },
    async regenerateInviteCode() {
      db = load()
      db.club.invite_code = uid().slice(0, 8).toUpperCase()
      persist(db)
      return db.club.invite_code
    },

    async list<K extends TableName>(table: K) {
      db = load()
      return delay(visible(table))
    },
    async save<K extends TableName>(table: K, row: Draft<K>) {
      db = load()
      const rows = db[table] as Row<K>[]
      const extra: Record<string, unknown> = {}
      if (table === 'sessions' || table === 'feedback' || table === 'tips') extra.updated_at = new Date().toISOString()
      let saved: Row<K>
      if (row.id && rows.some((r) => (r as { id: string }).id === row.id)) {
        if (!visible(table).some((r) => (r as { id: string }).id === row.id)) throw new Error('Accès refusé')
        const i = rows.findIndex((r) => (r as { id: string }).id === row.id)
        const patch = { ...row } as Record<string, unknown>
        if (role() === 'athlete') {
          // Mêmes protections que dans la base
          if (table === 'athletes') for (const k of ['group_id', 'active', 'user_id']) delete patch[k]
          if (table === 'feedback') delete patch.coach_reply
        }
        saved = { ...rows[i], ...patch, ...extra }
        rows[i] = saved
      } else {
        const created = { ...defaults(table), ...row, ...extra, id: row.id ?? uid() } as Record<string, unknown>
        if (table === 'athlete_notes') created.created_at = new Date().toISOString()
        saved = created as unknown as Row<K>
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
      db.records = db.records.filter((x) => athleteIds.has(x.athlete_id))
      db.wellness = db.wellness.filter((x) => athleteIds.has(x.athlete_id))
      db.athlete_notes = db.athlete_notes.filter((x) => athleteIds.has(x.athlete_id))
      persist(db)
    },
  }
}

function defaults(table: TableName): Record<string, unknown> {
  switch (table) {
    case 'groups': return { color: '#2563eb' }
    case 'athletes': return { user_id: null, group_id: null, last_name: '', birth_year: null, events: '', phone: '', avatar: '🏃', color: '#e85d04', goals: '', favorite_tips: [], active: true }
    case 'athlete_notes': return {}
    case 'exercises': return { category: 'Autre', description: '' }
    case 'sessions': return { objective: '', focus: '', duration_min: null, blocks: [] }
    case 'assignments': return { time: '', location: '', group_id: null, athlete_ids: [], note: '' }
    case 'feedback': return { completed: true, rpe: null, fatigue: null, mood: null, pain: '', comment: '', coach_reply: '' }
    case 'tips': return { category: 'Hygiène de vie', emoji: '💡', summary: '', body: '', published: true }
    case 'records': return { competition: '', date: todayISO() }
    case 'wellness': return { sleep_hours: null, sleep_quality: null, energy: null, soreness: null, stress: null, note: '', date: todayISO() }
  }
}
