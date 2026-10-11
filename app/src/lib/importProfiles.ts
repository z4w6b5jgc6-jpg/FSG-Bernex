import type { Athlete } from '../types'
import { cellText, matchAthlete, normText, type AthleteMatch, type Cell, type SheetIn } from './importResults'

/** Une réponse au questionnaire de début de saison */
export interface ProfileIn {
  key: string
  first: string
  last: string
  /** « Nom & Prénom » dans une seule colonne : l'ordre n'est pas sûr */
  fullName: string
  birthYear: number | null
  events: string
  goals: string
  /** autres réponses (disponibilités, musculation…) → note privée de l'entraîneur */
  extra: [string, string][]
}

type Role = 'first' | 'last' | 'full' | 'birth' | 'events' | 'goals' | 'ignore' | 'extra'
function roleOf(header: string): Role {
  const h = normText(header)
  if (!h || /^(horodateur|horodatage|timestamp|date$)/.test(h)) return 'ignore'
  if (/^(nometprenom|nomprenom|prenomnom|prenometnom|athlete|nomcomplet)/.test(h)) return 'full'
  if (/^prenom/.test(h)) return 'first'
  if (/^nom/.test(h)) return 'last'
  if (/naissance/.test(h)) return 'birth'
  if (/^(disciplines?|specialites?)/.test(h)) return 'events'
  if (/^objectifs?/.test(h)) return 'goals'
  return 'extra'
}

function year(c: Cell): number | null {
  if (c instanceof Date) return c.getUTCFullYear()
  if (typeof c === 'number') return c > 1900 && c < 2100 ? c : null
  const m = cellText(c).match(/(19|20)\d{2}/)
  return m ? Number(m[0]) : null
}

const titleCase = (t: string) => t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
// « SAMUEL Adiam », « Vuille francia » → « Samuel Adiam », « Vuille Francia »
const tidy = (t: string) =>
  t.replace(/\s+/g, ' ').trim().split(' ').map((w) => (w === w.toUpperCase() || w === w.toLowerCase() ? titleCase(w) : w)).join(' ')

/** Lit la feuille qui contient des noms et des objectifs. Une personne qui a répondu deux fois : la dernière réponse compte. */
export function parseProfiles(sheets: SheetIn[]): ProfileIn[] | null {
  for (const s of sheets) {
    const h = s.rows.slice(0, 10).findIndex((r) => {
      const roles = r.map((c) => roleOf(cellText(c)))
      return roles.some((x) => x === 'full' || x === 'first') && roles.some((x) => x === 'goals' || x === 'events')
    })
    if (h < 0) continue
    const headers = s.rows[h].map((c) => cellText(c).trim())
    const roles = headers.map(roleOf)
    const byKey = new Map<string, ProfileIn>()
    for (const r of s.rows.slice(h + 1)) {
      const p: ProfileIn = { key: '', first: '', last: '', fullName: '', birthYear: null, events: '', goals: '', extra: [] }
      roles.forEach((role, i) => {
        const v = cellText(r[i])
        if (role === 'first') p.first = tidy(v)
        else if (role === 'last') p.last = tidy(v)
        else if (role === 'full') p.fullName = tidy(v)
        else if (role === 'birth') p.birthYear = year(r[i])
        else if (role === 'events') p.events = v
        else if (role === 'goals') p.goals = v.replace(/\s*\n\s*/g, ' · ').trim()
        else if (role === 'extra' && v) p.extra.push([headers[i], v])
      })
      if (p.fullName && !p.first) {
        // Formulaire « Nom & Prénom » : nom d'abord par défaut, à vérifier dans l'aperçu
        const parts = p.fullName.split(' ')
        p.first = parts.length > 1 ? parts[parts.length - 1] : parts[0]
        p.last = parts.length > 1 ? parts.slice(0, -1).join(' ') : ''
      }
      if (!p.first) continue
      const words = [p.first, p.last].join(' ').split(' ').map(normText).filter(Boolean).sort()
      p.key = words.join('|')
      byKey.set(p.key, p)
    }
    return [...byKey.values()]
  }
  return null
}

/** Fiche correspondante, en essayant les deux ordres prénom / nom. Renvoie aussi l'ordre retenu. */
export function matchProfile(p: ProfileIn, athletes: Athlete[]): { match: AthleteMatch | null; first: string; last: string } {
  const tries: [string, string][] = [[p.first, p.last]]
  if (p.fullName && p.last) {
    const parts = p.fullName.split(' ')
    for (let i = 1; i < parts.length; i++) {
      tries.push([parts.slice(0, i).join(' '), parts.slice(i).join(' ')], [parts.slice(i).join(' '), parts.slice(0, i).join(' ')])
    }
  }
  let fuzzy: { match: AthleteMatch; first: string; last: string } | null = null
  for (const [first, last] of tries) {
    const m = matchAthlete({ key: '', first, last, age: null, year: null, events: '' }, athletes)
    if (m?.exact) return { match: m, first, last }
    if (m && !fuzzy) fuzzy = { match: m, first, last }
  }
  return fuzzy ?? { match: null, first: p.first, last: p.last }
}

/** Disciplines du formulaire, en version courte : « Saut en longueur, Lancer (poids, disque, Javelot) » → « Longueur, Lancers » */
export function shortEvents(t: string): string {
  const parts = t.replace(/\(([^)]*)\)/g, (m) => m.replace(/,/g, '/')).split(/\s*,\s*/).filter(Boolean)
  const map: [RegExp, string][] = [
    [/sprint long|400/i, '400 m'], [/^sprint/i, 'Sprint'], [/longueur/i, 'Longueur'], [/triple/i, 'Triple saut'],
    [/hauteur/i, 'Hauteur'], [/perche/i, 'Perche'], [/haies/i, 'Haies'], [/demi.?fond/i, 'Demi-fond'], [/^fond/i, 'Fond'],
    [/marteau/i, 'Marteau'], [/lancer/i, 'Lancers'],
  ]
  const out = parts.map((x) => map.find(([re]) => re.test(x))?.[1] ?? x.trim())
  return [...new Set(out)].join(', ')
}
