import type { Assignment, Session } from '../types'
import { planOf } from './targets'
import { todayISO } from './utils'

/**
 * Planifications futures du plan du lundi à modifier quand le sous-groupe d'un athlète change :
 * il reçoit les séances de son nouveau sous-groupe et quitte les autres.
 */
export function subgroupChanges(athleteId: string, subgroup: string, sessions: Session[], assignments: Assignment[]): Pick<Assignment, 'id' | 'athlete_ids'>[] {
  const today = todayISO()
  return assignments.flatMap((a) => {
    const p = a.date >= today && !a.group_id ? (() => { const s = sessions.find((x) => x.id === a.session_id); return s && planOf(s) })() : null
    if (!p) return []
    const want = p.subgroup === subgroup
    const has = a.athlete_ids.includes(athleteId)
    if (want === has) return []
    return [{ id: a.id, athlete_ids: want ? [...a.athlete_ids, athleteId] : a.athlete_ids.filter((x) => x !== athleteId) }]
  })
}
