import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useData } from '../lib/data'
import { buildSeries, countIn, DAYS, seriesChanges, seriesLabel, type Series } from '../lib/series'
import { planOf } from '../lib/targets'
import type { Athlete } from '../types'
import { errorMessage, formatDate, fullName, todayISO } from '../lib/utils'

/** Fiche athlète : ses séries de séances à venir, à cocher pour l'ajouter ou le retirer d'un coup */
export function AthleteSeriesCard({ athlete }: { athlete: Athlete }) {
  const { assignments, sessions, athletes, save } = useData()
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState<string | null>(null)
  // arrivée depuis « Confirmer et choisir ses séances » : on descend jusqu'ici
  const { hash } = useLocation()
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { if (hash === '#seances') ref.current?.scrollIntoView({ block: 'start' }) }, [hash])
  // séries hors plan du lundi (celui-ci suit le sous-groupe, choisi plus bas)
  const series = useMemo(() => buildSeries(assignments, sessions, todayISO())
    .filter((s) => !planOf(sessions.find((x) => x.id === s.list[0].session_id)!)), [assignments, sessions])

  const toggle = async (s: Series, add: boolean) => {
    const n = add ? s.list.length - countIn(s, athlete.id, athletes) : countIn(s, athlete.id, athletes)
    if (!confirm(`${add ? 'Ajouter' : 'Retirer'} ${fullName(athlete)} ${add ? 'aux' : 'des'} ${n} prochaine(s) séance(s) « ${seriesLabel(s)} » ?`)) return
    setBusy(s.key)
    setErr(null)
    try {
      await Promise.all(seriesChanges(s, athlete.id, add, athletes).map((x) => save('assignments', x)))
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy('')
    }
  }

  return (
    <section id="seances" ref={ref}>
      <h2>Ses séances</h2>
      <div className="card form">
        {!athlete.active && <div className="alert warn small">Fiche inactive : réactive-la pour qu’il reçoive des séances.</div>}
        {series.length === 0 ? <p className="small muted">Aucune autre série de séances à venir.</p> : (
          <ul className="plain rows">
            {series.map((s) => {
              const k = countIn(s, athlete.id, athletes)
              return (
                <li key={s.key} className="row between wrap">
                  <span>
                    <b>{s.name}</b>
                    <span className="tiny muted"> · {DAYS[s.day]} · {s.list.length} séance(s) dès le {formatDate(s.list[0].date, { day: 'numeric', month: 'short' })}</span>
                    {k > 0 && k < s.list.length && <span className="tiny muted"> · inscrit à {k}/{s.list.length}</span>}
                  </span>
                  {k === s.list.length
                    ? <button className="btn small ghost" disabled={!!busy} onClick={() => toggle(s, false)}>{busy === s.key ? '…' : '✓ Inscrit · retirer'}</button>
                    : <button className="btn small primary" disabled={!!busy || !athlete.active} onClick={() => toggle(s, true)}>{busy === s.key ? '…' : '+ Ajouter'}</button>}
                </li>
              )
            })}
          </ul>
        )}
        {err && <div className="alert warn small">{err}</div>}
      </div>
    </section>
  )
}
