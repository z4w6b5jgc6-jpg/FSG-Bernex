import {healthConsent} from '../lib/confidentiality'
// Mode démo : toutes les données restent dans le navigateur (localStorage).
// Simule les comptes (entraîneur / athlètes) et les règles d'accès de la base.
import { isReleased, releaseRule } from '../lib/release'
import { DEFAULT_EXERCISES, DEFAULT_TESTS } from '../data/defaults'
import type { Me, TableName, Tables } from '../types'
import { athletesFor, todayISO, uid } from '../lib/utils'
import type { Api, Draft, Row } from './types'

const KEY = 'athle-demo-db-v5'
const AUTH_KEY = 'athle-demo-user'
const COACH_ID = 'demo-coach'

interface DemoUser { email: string; id: string; coach: boolean }
type Db = { [K in TableName]: Tables[K][] } & {
  club: { coach_id: string; name: string; invite_code: string; training_info?: string; settings?: import('../lib/settings').ClubSettings }
  users: DemoUser[]
  coaches?: string[]
  coachInvites?: string[]
}

function seed(): Db {
  // Export sans fiches d’athlètes ni données individuelles préchargées.
  return {
    club: { coach_id: COACH_ID, name: 'Bernex — développement', invite_code: '' },
    users: [],
    import_history: [],
    exercise_logs: [],
    evidence_library: [],
    attendance: [],
    session_adjustments: [],
    availability: [],
    privacy_acceptances: [],
    groups: [],
    athletes: [],
    athlete_notes: [],
    exercises: DEFAULT_EXERCISES.map((e) => ({ id: uid(), ...e })),
    sessions: [],
    assignments: [],
    feedback: [],
    tips: [],
    records: [],
    wellness: [],
    tests: DEFAULT_TESTS.map((t) => ({ id: uid(), ...t })),
    test_results: [],
    test_reports: [],
    competitions: [],
    messages: [],
    session_notes: [],
  }
}

const norm = (t: string | null | undefined) =>
  (t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = JSON.parse(raw) as Db
      db.competitions ??= [] // données démo enregistrées avant l'ajout des compétitions
      db.messages ??= []
      db.session_notes ??= []
      db.import_history ??=[];
      db.exercise_logs ??=[]; db.evidence_library ??=[];
      db.attendance ??= []; db.session_adjustments ??= []; db.availability ??= []; db.privacy_acceptances ??= []
      for (const c of db.competitions) c.entries ??= {}
      return db
    }
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
      sessions: (s) => mine.some((a) => a.session_id === s.id && isReleased(a, releaseRule(db.club.settings?.release ?? 'hour'))),
      assignments: (a) => mine.includes(a),
      feedback: (f) => f.athlete_id === me.id,
      tips: (t) => t.published,
      tests: () => true,
      test_results: (x) => x.athlete_id === me.id,
      test_reports: (x) => x.athlete_id === me.id,
      competitions: (c) => c.athlete_ids.length === 0 || c.athlete_ids.includes(me.id),
      records: (x) => x.athlete_id === me.id,
      wellness: (x) => x.athlete_id === me.id,
      messages: (x) => x.athlete_id === me.id,
      session_notes: () => false,
      evidence_library: () => false,
      import_history: () => false,
      exercise_logs: (x) => x.athlete_id === me.id,
      attendance: (x) => x.athlete_id === me.id,
      availability: (x) => x.athlete_id === me.id,
      privacy_acceptances: (x) => x.athlete_id === me.id,
      session_adjustments: (x) => x.athlete_id === me.id && mine.some((a) => a.id === x.assignment_id && isReleased(a, releaseRule(db.club.settings?.release ?? 'hour'))),
    }
    return rows.filter(filters[table] as (x: Row<K>) => boolean)
  }

  return {
    mode: 'demo',
    async research() { throw new Error('La recherche en direct nécessite le service documentaire du déploiement Cloudflare. Les références initiales restent consultables ci-dessous.') },

    async getMe() {
      db = load()
      const u = currentUser()
      const r = role()
      if (!u || !r) return null
      const a = myAthlete()
      return {
        email: u.email, role: r, athlete_id: a?.id, club_name: db.club.name, training_info: db.club.training_info ?? '', settings: r === 'coach' ? db.club.settings ?? {} : { release: db.club.settings?.release, privacy: db.club.settings?.privacy },
        invite_code: r === 'coach' ? db.club.invite_code : undefined, is_owner: r === 'coach' ? true : undefined,
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
      return { name: db.club.name, groups: db.groups.map(({ id, name, color }) => ({ id, name, color })), privacy:db.club.settings?.privacy }
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
      for (const c of db.competitions) {
        c.athlete_ids = c.athlete_ids.map((x) => (x === fromId ? intoId : x))
        if (c.entries?.[fromId] !== undefined) { c.entries[intoId] = c.entries[fromId]; delete c.entries[fromId] }
      }
      Object.assign(into, {
        user_id: from.user_id, linked_at: new Date().toISOString(), signup_reviewed: true, active: true,
        group_id: into.group_id ?? from.group_id, birth_year: into.birth_year ?? from.birth_year,
        events: into.events || from.events, phone: into.phone || from.phone, email: into.email || from.email,
        avatar: from.avatar, color: from.color, goals: from.goals, favorite_tips: from.favorite_tips,
      })
      db.athletes = db.athletes.filter((a) => a.id !== fromId)
      persist(db)
    },
    async chat(messages, s) {
      if(!s)throw new Error('Choisis une séance.')
      return delay(JSON.stringify({resume:'Démonstration uniquement, sans appel IA. Ta demande : '+(messages.at(-1)?.content??''),suggestions:[]}))
    },
    async readPlan() {
      throw new Error('La lecture intelligente n’est pas disponible en démo.')
    },
    async improveSession(_s) {
      return delay({resume:'Démonstration du parcours : aucun modèle IA n’est appelé et aucun dosage n’est généré.',suggestions:[]})
    },
    async saveTrainingInfo(text) {
      db = load()
      db.club.training_info = text
      persist(db)
    },
    async saveSettings(s) {
      db = load()
      db.club.settings = s
      persist(db)
    },
    async listCoaches() {
      db = load()
      return delay((db.coaches ?? []).map((email) => ({ email, linked: db.users.some((u) => u.email === email) })))
    },
    async addCoach(email) {
      db = load()
      const e = email.trim().toLowerCase()
      if ((db.coaches ?? []).includes(e)) throw new Error('Cet entraîneur est déjà ajouté.')
      db.coaches = [...(db.coaches ?? []), e]
      persist(db)
    },
    async removeCoach(email) {
      db = load()
      db.coaches = (db.coaches ?? []).filter((x) => x !== email)
      persist(db)
    },
    async createCoachInvite(token) {
      db = load()
      db.coachInvites = [...(db.coachInvites ?? []), token]
      persist(db)
    },
    async coachInviteInfo(token) {
      db = load()
      return (db.coachInvites ?? []).includes(token) ? { name: db.club.name } : null
    },
    async acceptCoachInvite(token) {
      db = load()
      const u = currentUser()
      if (!u) throw new Error('Non connecté')
      if (!(db.coachInvites ?? []).includes(token)) throw new Error('Ce lien d’invitation n’est plus valable (déjà utilisé ou expiré). Demande un nouveau lien.')
      if (myAthlete()) throw new Error('Ce compte est déjà un compte athlète.')
      db.coachInvites = (db.coachInvites ?? []).filter((t) => t !== token)
      if (!(db.coaches ?? []).includes(u.email)) db.coaches = [...(db.coaches ?? []), u.email]
      u.coach = true
      u.id = COACH_ID
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
      if(role()!=='coach'&&!['athletes','feedback','records','wellness','test_results','messages','availability','exercise_logs','privacy_acceptances'].includes(table))throw new Error('Accès refusé')
      if(table==='privacy_acceptances'&&(role()==='coach'||row.id))throw new Error('Le choix de l’athlète doit être ajouté comme un nouvel événement.')
      const healthRow=row as {athlete_id?:string;pain?:string;fatigue?:number|null;mood?:number|null}
      if((table==='wellness'||table==='feedback'&&!!(healthRow.pain||healthRow.fatigue!=null||healthRow.mood!=null))&&!healthConsent(healthRow.athlete_id??'',db.privacy_acceptances,db.club.settings?.privacy))throw new Error('Suivi de santé facultatif non activé.')
      if (role() !== 'coach' && ['attendance', 'session_adjustments'].includes(table)) throw new Error('Réservé aux coachs')
      if (role() !== 'coach' && ['privacy_acceptances', 'availability'].includes(table) && (row as { athlete_id?: string }).athlete_id !== myAthlete()?.id) throw new Error('Accès refusé')
      const extra: Record<string, unknown> = {}
      if (['attendance', 'session_adjustments', 'sessions', 'feedback', 'tips'].includes(table)) extra.updated_at = new Date().toISOString()
      // messages : l'expéditeur est fixé comme dans la base
      if (table === 'messages' && !row.id) { extra.from_coach = role() === 'coach'; extra.author = role() === 'coach' ? 'Coach' : '' }
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
        if (['privacy_acceptances', 'import_history', 'evidence_library', 'athlete_notes', 'athletes'].includes(table)) created.created_at = new Date().toISOString()
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
      return this.removeMany(table, [id])
    },
    // Notifications : pas disponibles en démo
    async retentionPreview(){return {wellness:0,feedback_health:0,messages:0,exercise_logs:0,athlete_notes:0}},
    async purgeRetention(){throw new Error('La purge de démonstration ne supprime aucune donnée.')},
    async pushKey() { return null },
    async savePush() {},
    async removePush() {},
    async notify() {},
    async removeMany(table, list) {
      const ids = new Set(list)
      db = load()
      if(role()!=='coach'&&(!['availability','exercise_logs','feedback','records','wellness','test_results'].includes(table)||list.some(id=>!visible(table).some(r=>r.id===id))))throw new Error('Accès refusé')
      ;(db[table] as { id: string }[]) = (db[table] as { id: string }[]).filter((r) => !ids.has(r.id))
      if (table === 'sessions') db.assignments = db.assignments.filter((a) => !ids.has(a.session_id))
      if (table === 'groups') {
        db.assignments = db.assignments.filter((a) => !a.group_id || !ids.has(a.group_id))
        db.athletes = db.athletes.map((a) => (a.group_id && ids.has(a.group_id) ? { ...a, group_id: null } : a))
      }
      const assignmentIds = new Set(db.assignments.map((a) => a.id))
      const athleteIds = new Set(db.athletes.map((a) => a.id))
      db.attendance=db.attendance.filter(x=>assignmentIds.has(x.assignment_id)&&athleteIds.has(x.athlete_id))
      db.session_adjustments=db.session_adjustments.filter(x=>assignmentIds.has(x.assignment_id)&&athleteIds.has(x.athlete_id))
      db.exercise_logs=db.exercise_logs.filter(x=>assignmentIds.has(x.assignment_id)&&athleteIds.has(x.athlete_id))
      db.availability=db.availability.filter(x=>athleteIds.has(x.athlete_id))
      db.privacy_acceptances=db.privacy_acceptances.filter(x=>athleteIds.has(x.athlete_id))
      db.feedback = db.feedback.filter((f) => assignmentIds.has(f.assignment_id) && athleteIds.has(f.athlete_id))
      db.records = db.records.filter((x) => athleteIds.has(x.athlete_id))
      db.wellness = db.wellness.filter((x) => athleteIds.has(x.athlete_id))
      db.athlete_notes = db.athlete_notes.filter((x) => athleteIds.has(x.athlete_id))
      const testIds = new Set(db.tests.map((t) => t.id))
      db.test_results = db.test_results.filter((x) => athleteIds.has(x.athlete_id) && testIds.has(x.test_id))
      db.test_reports = db.test_reports.filter((x) => athleteIds.has(x.athlete_id))
      db.messages = (db.messages ?? []).filter((x) => assignmentIds.has(x.assignment_id) && athleteIds.has(x.athlete_id))
      const sessionIds = new Set(db.sessions.map((x) => x.id))
      db.session_notes = (db.session_notes ?? []).filter((x) => sessionIds.has(x.session_id))
      persist(db)
    },
  }
}

function defaults(table: TableName): Record<string, unknown> {
  switch (table) {
    case 'groups': return { color: '#2563eb' }
    case 'exercise_logs': return { sets: [] }
    case 'import_history': return { filename:'',source_text:'',imported_count:0,updated_count:0 }
    case 'evidence_library': return { paper: {}, review_note: '', reviewed: false }
    case 'attendance': return { status: 'present' }
    case 'session_adjustments': return { content: {}, rationale: '', source_ids: [] }
    case 'availability': return { status: 'away', note: '' }
    case 'privacy_acceptances': return { health_consent: false, representative: '' }
    case 'athletes': return { user_id: null, group_id: null, last_name: '', birth_year: null, events: '', phone: '', avatar: '', color: '#e85d04', goals: '', favorite_tips: [], active: true, email: '', linked_at: null, signup_reviewed: true, subgroup: '' }
    case 'athlete_notes': return {}
    case 'exercises': return { category: 'Autre', description: '' }
    case 'sessions': return { objective: '', focus: '', duration_min: null, blocks: [], plan: {}, targets: [] }
    case 'assignments': return { time: '', location: '', group_id: null, athlete_ids: [], note: '' }
    case 'feedback': return { completed: true, rpe: null, fatigue: null, mood: null, recovery_fit: null, pain: '', comment: '', coach_reply: '' }
    case 'tips': return { category: 'Hygiène de vie', emoji: '', summary: '', body: '', published: true }
    case 'records': return { competition: '', date: todayISO() }
    case 'competitions': return { end_date: null, location: '', level: 'B', program_url: '', registration_url: '', results_url: '', registration_deadline: null, notes: '', athlete_ids: [], entries: {} }
    case 'tests': return { unit: '', higher_is_better: true, category: 'Autre', description: '' }
    case 'test_results': return { notes: '', trials: [], date: todayISO() }
    case 'test_reports': return { title: 'Bilan des tests', strengths: '', priority: '', training: '', message: '', date: todayISO() }
    case 'session_notes': return { text: '' }
    case 'messages': return { author: '', read_at: null, created_at: new Date().toISOString() }
    case 'wellness': return { sleep_hours: null, sleep_quality: null, energy: null, soreness: null, stress: null, note: '', date: todayISO() }
  }
}
