import { usePaces } from '../lib/usePaces'
import { computeTarget, targetLabel } from '../lib/targets'
import type { Athlete, Target } from '../types'
import { fullName } from '../lib/utils'

/** Tableau athlète × cibles : temps à réaliser (« à l'effort » s'il manque une donnée) */
export function TargetTable({ targets, athletes, big = false }: { targets: Target[]; athletes: Athlete[]; big?: boolean }) {
  const paces = usePaces()
  if (!targets.length) return <p className="muted small">Pas de répétition chronométrée.</p>
  if (!athletes.length) return <p className="muted small">Aucun athlète dans ce sous-groupe (à choisir sur la fiche de l’athlète).</p>
  return (
    <div className="table-scroll">
      <table className={`table targets ${big ? 'big' : ''}`}>
        <thead>
          <tr><th>Athlète</th>{targets.map((t) => <th key={t.ordre}>{targetLabel(t)}</th>)}</tr>
        </thead>
        <tbody>
          {athletes.map((a) => (
            <tr key={a.id}>
              <td>{big ? a.first_name + (a.last_name ? ` ${a.last_name[0]}.` : '') : fullName(a)}</td>
              {targets.map((t) => {
                const r = computeTarget(t, paces(a.id))
                return <td key={t.ordre} className={r.value == null ? 'muted effort' : 'time'}>{r.text}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mes temps à réaliser (vue athlète, lecture seule) */
export function MyTargets({ targets, athleteId }: { targets: Target[]; athleteId: string }) {
  const paces = usePaces()
  if (!targets.length) return null
  const p = paces(athleteId)
  return (
    <div className="card my-targets">
      <h3>⏱️ Mes temps à réaliser</h3>
      <ul className="plain rows">
        {targets.map((t) => {
          const r = computeTarget(t, p)
          return (
            <li key={t.ordre} className="row between">
              <span>{targetLabel(t)}</span>
              <b className={r.value == null ? 'muted' : 'target-time'}>{r.text}</b>
            </li>
          )
        })}
      </ul>
      {targets.some((t) => computeTarget(t, p).value == null) && (
        <p className="tiny muted">« À l’effort » : il manque un test (VMA, 30 m lancé) ou un record pour calculer ton temps.</p>
      )}
    </div>
  )
}
