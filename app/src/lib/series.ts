import type { Assignment, Athlete, Session } from '../types'
import { athletesFor, parseISODate } from './utils'

export const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** « Longueur S03 – Vitesse » → « Longueur » ; « Lundi S01 · Sprint / Sauts / Haies » → « Lundi · Sprint / Sauts / Haies » */
export function seriesName(title: string): string {
  const m = title.match(/^(.*?)\s+S\d{1,2}\b(.*)$/)
  if (!m) return title
  const audience = m[2].match(/·\s*(.+)$/)?.[1]
  return audience ? `${m[1]} · ${audience}` : m[1]
}

/** Série : séances à venir du même nom (sans numéro), le même jour de la semaine */
export interface Series { key: string; name: string; day: number; list: Assignment[] }

export function buildSeries(assignments: Assignment[], sessions: Session[], from: string): Series[] {
  const map = new Map<string, Series>()
  for (const a of assignments.filter((x) => x.date >= from).sort((x, y) => x.date.localeCompare(y.date))) {
    const title = sessions.find((s) => s.id === a.session_id)?.title
    if (!title) continue
    const name = seriesName(title), day = parseISODate(a.date).getDay()
    const key = `${day}|${name}`
    if (!map.has(key)) map.set(key, { key, name, day, list: [] })
    map.get(key)!.list.push(a)
  }
  return [...map.values()].sort((x, y) => ((x.day + 6) % 7) - ((y.day + 6) % 7) || x.name.localeCompare(y.name))
}

export const seriesLabel = (s: Series) => `${s.name} (${DAYS[s.day]})`

/** Nombre de séances de la série où l'athlète est prévu */
export const countIn = (s: Series, id: string, athletes: Athlete[]) => s.list.filter((a) => athletesFor(a, athletes).some((x) => x.id === id)).length

/** Planifications à modifier pour ajouter / retirer l'athlète de toutes les séances de la série */
export function seriesChanges(s: Series, athleteId: string, add: boolean, athletes: Athlete[]): Pick<Assignment, 'id' | 'group_id' | 'athlete_ids'>[] {
  return s.list.flatMap((x) => {
    const ids = athletesFor(x, athletes).map((t) => t.id)
    if (ids.includes(athleteId) === add) return []
    // planifiée « pour le groupe » : devient la liste des athlètes du groupe, plus (ou moins) cet athlète
    return [{ id: x.id, group_id: null, athlete_ids: add ? [...ids, athleteId] : ids.filter((i) => i !== athleteId) }]
  })
}
