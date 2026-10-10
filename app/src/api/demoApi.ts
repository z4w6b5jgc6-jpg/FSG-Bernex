// Mode démo : toutes les données restent dans le navigateur (localStorage).
// Simule les comptes (entraîneur / athlètes) et les règles d'accès de la base.
import { DEFAULT_EXERCISES, DEFAULT_TESTS } from '../data/defaults'
import type { Me, TableName, Tables } from '../types'
import { addDays, athletesFor, emptyItem, todayISO, uid } from '../lib/utils'
import type { Api, Draft, Row } from './types'

const KEY = 'athle-demo-db-v5'
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
      email, linked_at: new Date().toISOString() as string | null, signup_reviewed: true,
    }
  }
  // Athlètes de la liste de l'entraîneur, pas encore inscrits dans l'app
  const roster = (first: string, last: string, group: string, year: number, events: string, email = '') => ({
    id: uid(), user_id: null as string | null, group_id: group, first_name: first, last_name: last, birth_year: year,
    events, phone: '', avatar: '🏃', color: '#e85d04', goals: '', favorite_tips: [] as string[], active: true,
    email, linked_at: null as string | null, signup_reviewed: true, created_at: addDays(today, -30) + 'T12:00:00.000Z',
  })
  const athletes = [
    mk('Léa', 'Martin', u18.id, 2010, '100 m, longueur', '⚡', '#7c3aed', 'Passer sous les 13" au 100 m cette saison'),
    mk('Noah', 'Rossier', u18.id, 2009, '800 m, 1500 m', '🦊', '#ea580c', 'Qualif championnats romands'),
    mk('Inès', 'Favre', actifs.id, 2007, '100 m haies, hauteur', '🦋', '#db2777', ''),
    mk('Luca', 'Bianchi', actifs.id, 2006, 'poids, disque', '💪', '#16a34a', ''),
    roster('Emma', 'Rochat', u18.id, 2009, '400 m'),
    roster('Samuel', 'Keller', actifs.id, 2007, 'longueur, triple saut', 'samuel@demo.ch'),
  ]
  const tests = DEFAULT_TESTS.map((t) => ({ id: uid(), ...t }))
  const res = (ath: number, test: number, daysAgo: number, value: number) =>
    ({ id: uid(), athlete_id: athletes[ath].id, test_id: tests[test].id, date: addDays(today, -daysAgo), value, trials: [] as number[], notes: '' })
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
    tests,
    // Index des tests : 0 20 m lancé · 1 30 m lancé · 2 40 m arrêté · 3 monobond · 4 triple · 5 penta · 6 déca · 7 VMA
    test_results: [
      res(0, 0, 60, 2.78), res(0, 0, 10, 2.71), res(0, 1, 60, 3.95), res(0, 1, 10, 3.88), res(0, 2, 10, 5.92),
      res(0, 3, 60, 2.18), res(0, 3, 10, 2.26), res(0, 4, 10, 6.65), res(0, 5, 10, 11.9), res(0, 7, 10, 13.5),
      res(1, 0, 10, 2.95), res(1, 2, 10, 6.21), res(1, 7, 60, 15.5), res(1, 7, 10, 16.5),
      res(2, 0, 10, 2.69), res(2, 1, 10, 3.82), res(2, 3, 10, 2.31), res(2, 5, 10, 12.6), res(2, 6, 10, 25.4),
      res(3, 2, 10, 6.05), res(3, 3, 10, 2.42), res(3, 4, 10, 7.1), res(4, 0, 10, 2.88), res(4, 7, 10, 15),
      res(0, 6, 10, 23.4), res(2, 4, 10, 6.85),
    ],
    test_reports: [{
      id: uid(), athlete_id: athletes[0].id, date: addDays(today, -10), title: 'Bilan des tests',
      strengths: 'Vitesse lancée et impulsion isolée.', priority: 'Maintien des impulsions sur les bonds longs.',
      training: 'Bonds courts enchaînés, gainage dynamique, sprints lancés en petit volume.',
      message: 'Belle progression sur le 20 m lancé ! Ton prochain cap : garder la même qualité d’appui quand les bonds s’enchaînent.',
    }],
  }
}

const norm = (t: string | null | undefined) =>
  (t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

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
      tests: () => true,
      test_results: (x) => x.athlete_id === me.id,
      test_reports: (x) => x.athlete_id === me.id,
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
      const group_id = db.groups.some((g) => g.id === p.group_id) ? p.group_id : null
      // Même logique que la base : email, puis prénom + nom (+ année)
      const free = db.athletes.filter((a) => !a.user_id)
      let match = free.find((a) => a.email && a.email.trim().toLowerCase() === u.email)
      if (!match) {
        const byName = free.filter((a) => norm(a.first_name) === norm(p.first_name) && norm(a.last_name) === norm(p.last_name) &&
          (a.birth_year == null || p.birth_year == null || a.birth_year === p.birth_year))
        if (byName.length === 1) match = byName[0]
      }
      const now = new Date().toISOString()
      if (match) {
        Object.assign(match, {
          user_id: u.id, linked_at: now, signup_reviewed: false, active: true,
          group_id: match.group_id ?? group_id, birth_year: match.birth_year ?? p.birth_year,
          events: match.events || p.events, phone: match.phone || p.phone,
        })
      } else {
        db.athletes.push({
          ...(defaults('athletes') as unknown as Tables['athletes']), id: uid(), user_id: u.id, ...p, group_id,
          email: u.email, linked_at: now, signup_reviewed: false, created_at: now,
        })
      }
      persist(db)
      listeners.forEach((l) => l())
    },
    async mergeAthletes(fromId, intoId) {
      db = load()
      const from = db.athletes.find((a) => a.id === fromId)
      const into = db.athletes.find((a) => a.id === intoId)
      if (!from || !into || fromId === intoId) throw new Error('Introuvable')
      if (into.user_id) throw new Error('Ce profil est déjà relié à un autre compte.')
      db.feedback = db.feedback.filter((f) => !(f.athlete_id === fromId && db.feedback.some((g) => g.athlete_id === intoId && g.assignment_id === f.assignment_id)))
      db.wellness = db.wellness.filter((w) => !(w.athlete_id === fromId && db.wellness.some((x) => x.athlete_id === intoId && x.date === w.date)))
      for (const t of ['feedback', 'wellness', 'records', 'test_results', 'test_reports', 'athlete_notes'] as const) {
        for (const r of db[t] as { athlete_id: string }[]) if (r.athlete_id === fromId) r.athlete_id = intoId
      }
      for (const a of db.assignments) a.athlete_ids = a.athlete_ids.map((x) => (x === fromId ? intoId : x))
      Object.assign(into, {
        user_id: from.user_id, linked_at: new Date().toISOString(), signup_reviewed: true, active: true,
        group_id: into.group_id ?? from.group_id, birth_year: into.birth_year ?? from.birth_year,
        events: into.events || from.events, phone: into.phone || from.phone, email: into.email || from.email,
        avatar: from.avatar, color: from.color, goals: from.goals, favorite_tips: from.favorite_tips,
      })
      db.athletes = db.athletes.filter((a) => a.id !== fromId)
      persist(db)
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
          if (table === 'athletes') for (const k of ['group_id', 'active', 'user_id', 'email', 'signup_reviewed']) delete patch[k]
          if (table === 'feedback') delete patch.coach_reply
        } else if (table === 'athletes' && patch.user_id) {
          delete patch.user_id // l'entraîneur peut délier un compte, pas en relier un
        }
        if (table === 'athletes' && patch.user_id === null) patch.linked_at = null
        saved = { ...rows[i], ...patch, ...extra }
        rows[i] = saved
      } else {
        const created = { ...defaults(table), ...row, ...extra, id: row.id ?? uid() } as Record<string, unknown>
        if (table === 'athlete_notes' || table === 'athletes') created.created_at = new Date().toISOString()
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
      const testIds = new Set(db.tests.map((t) => t.id))
      db.test_results = db.test_results.filter((x) => athleteIds.has(x.athlete_id) && testIds.has(x.test_id))
      db.test_reports = db.test_reports.filter((x) => athleteIds.has(x.athlete_id))
      persist(db)
    },
  }
}

function defaults(table: TableName): Record<string, unknown> {
  switch (table) {
    case 'groups': return { color: '#2563eb' }
    case 'athletes': return { user_id: null, group_id: null, last_name: '', birth_year: null, events: '', phone: '', avatar: '🏃', color: '#e85d04', goals: '', favorite_tips: [], active: true, email: '', linked_at: null, signup_reviewed: true }
    case 'athlete_notes': return {}
    case 'exercises': return { category: 'Autre', description: '' }
    case 'sessions': return { objective: '', focus: '', duration_min: null, blocks: [] }
    case 'assignments': return { time: '', location: '', group_id: null, athlete_ids: [], note: '' }
    case 'feedback': return { completed: true, rpe: null, fatigue: null, mood: null, pain: '', comment: '', coach_reply: '' }
    case 'tips': return { category: 'Hygiène de vie', emoji: '💡', summary: '', body: '', published: true }
    case 'records': return { competition: '', date: todayISO() }
    case 'tests': return { unit: '', higher_is_better: true, category: 'Autre', description: '' }
    case 'test_results': return { notes: '', trials: [], date: todayISO() }
    case 'test_reports': return { title: 'Bilan des tests', strengths: '', priority: '', training: '', message: '', date: todayISO() }
    case 'wellness': return { sleep_hours: null, sleep_quality: null, energy: null, soreness: null, stress: null, note: '', date: todayISO() }
  }
}
