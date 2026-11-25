import type { Assignment, Athlete, Feedback, Session } from '../types'
import { athletesFor } from './utils'
import { planOf } from './targets'

/** sure : doublon probable (mêmes athlètes, même séance ou même titre, ou lundi à temps cibles, et pas à des heures différentes).
 *  Sinon le cas est seulement « à vérifier » : par défaut, on garde tout (ex. piste le matin et muscu le soir). */
export interface DupGroup { date: string; items: Assignment[]; keep: string; sure: boolean }

const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const created = (a: Assignment) => (a as Assignment & { created_at?: string }).created_at ?? ''

/** Planifications du même jour qui visent au moins un même athlète : candidats doublons.
 *  Proposition de garde : séance à temps cibles (lundi), sinon celle qui a des retours, sinon la plus récente. */
export function findDuplicates(assignments: Assignment[], sessions: Session[], athletes: Athlete[], feedback: Feedback[]): DupGroup[] {
  const byDate = new Map<string, Assignment[]>()
  for (const a of assignments) byDate.set(a.date, [...(byDate.get(a.date) ?? []), a])
  const out: DupGroup[] = []
  for (const [date, list] of byDate) {
    if (list.length < 2) continue
    const who = new Map(list.map((a) => [a.id, new Set(athletesFor(a, athletes).map((x) => x.id))]))
    // regroupement par recouvrement d'athlètes (composantes connexes)
    const seen = new Set<string>()
    for (const a of list) {
      if (seen.has(a.id)) continue
      const group: Assignment[] = [], stack = [a]
      seen.add(a.id)
      while (stack.length) {
        const x = stack.pop()!; group.push(x)
        for (const y of list) if (!seen.has(y.id) && [...who.get(x.id)!].some((id) => who.get(y.id)!.has(id))) { seen.add(y.id); stack.push(y) }
      }
      if (group.length < 2) continue
      const score = (g: Assignment) => {
        const s = sessions.find((x) => x.id === g.session_id)
        return [s && planOf(s) ? 1 : 0, feedback.some((f) => f.assignment_id === g.id) ? 1 : 0, created(g)] as const
      }
      const best = [...group].sort((p, q) => {
        const [a1, b1, c1] = score(p), [a2, b2, c2] = score(q)
        return a2 - a1 || b2 - b1 || c2.localeCompare(c1)
      })[0]
      const sessionOf = (g: Assignment) => sessions.find((x) => x.id === g.session_id)
      const sets = group.map((g) => [...who.get(g.id)!].sort().join(','))
      const titles = new Set(group.map((g) => norm(sessionOf(g)?.title ?? g.session_id)))
      const times = new Set(group.map((g) => g.time).filter(Boolean))
      const sure = new Set(sets).size === 1 && times.size <= 1
        && (new Set(group.map((g) => g.session_id)).size === 1 || titles.size === 1 || group.some((g) => { const s = sessionOf(g); return !!s && !!planOf(s) }))
      out.push({ date, items: group.sort((p, q) => (p.time || '').localeCompare(q.time || '')), keep: best.id, sure })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
