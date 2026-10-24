import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { subgroupChanges } from '../lib/mondaySync'
import { computeTarget, planOf, planSessions, RECORD_DISTANCES, SUBGROUPS, targetLabel } from '../lib/targets'
import type { Athlete } from '../types'
import { errorMessage, formatDate, todayISO } from '../lib/utils'
import { usePaces } from '../lib/usePaces'

const kmh = (v: number | null) => (v == null ? '—' : `${(v * 3.6).toFixed(1)} km/h`)

/** Fiche athlète : sous-groupe du lundi, allures de référence et temps cibles des prochains lundis */
export function MondayAthleteCard({ athlete }: { athlete: Athlete }) {
  const { sessions, assignments, save } = useData()
  const paces = usePaces()(athlete.id)
  const [err, setErr] = useState<string | null>(null)
  const sg = athlete.subgroup ?? ''
  const next = planSessions(sessions).filter((s) => planOf(s)!.subgroup === sg && planOf(s)!.date >= todayISO() && s.targets?.length).slice(0, 3)
  const missingRecords = RECORD_DISTANCES.filter((d) => !paces.records[d])

  const change = async (v: string) => {
    setErr(null)
    try {
      await save('athletes', { id: athlete.id, subgroup: v })
      // il reçoit les prochaines séances de son nouveau sous-groupe
      await Promise.all(subgroupChanges(athlete.id, v, sessions, assignments).map((a) => save('assignments', a)))
    } catch (e) {
      setErr(errorMessage(e))
    }
  }

  return (
    <section>
      <div className="row between"><h2>⏱️ Séances du lundi</h2><Link to="/lundi" className="small">Séance du jour →</Link></div>
      <div className="card form">
        <label className="field">
          <span>Sous-groupe du lundi</span>
          <select value={sg} onChange={(e) => change(e.target.value)}>
            <option value="">— Aucun —</option>
            {Object.entries(SUBGROUPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        {err && <div className="alert warn small">{err}</div>}
        <div className="paces-ref">
          <div><span className="tiny muted">VMA</span><b>{paces.vmaKmh ? `${paces.vmaKmh} km/h` : '—'}</b></div>
          <div><span className="tiny muted">VMS{paces.vmsFrom && ` (${paces.vmsFrom})`}</span><b>{kmh(paces.vms)}</b></div>
          <div><span className="tiny muted">RVA</span><b>{kmh(paces.rva)}</b></div>
          <div><span className="tiny muted">Réf. sprint</span><b>{paces.ref ? `${paces.ref.d} m en ${paces.ref.t.toFixed(2)} s` : '—'}</b></div>
        </div>
        <p className="tiny muted">
          VMA = dernier test VMA ; VMS = 30 m lancé (sinon 20 m lancé) ; RVA = VMS − VMA. Les records se saisissent plus bas (« + Perf », épreuve « 80 m », « 600 m »…).
          {missingRecords.length > 0 && ` Pas encore de record sur ${missingRecords.join(', ')} m.`}
        </p>
        {next.length > 0 && (
          <div>
            <b className="small">Prochains lundis</b>
            <ul className="plain rows">
              {next.map((s) => (
                <li key={s.id}>
                  <span className="small">{formatDate(planOf(s)!.date, { weekday: 'short', day: 'numeric', month: 'short' })} · </span>
                  {s.targets!.map((t) => <span key={t.ordre} className="small">{targetLabel(t)} : <b>{computeTarget(t, paces).text}</b>{'  '}</span>)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
