import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TargetTable } from '../../components/TargetTable'
import { Empty } from '../../components/ui'
import { useData } from '../../lib/data'
import { subgroupLabel } from '../../lib/mondayPlan'
import { planOf, planSessions, SUBGROUPS } from '../../lib/targets'
import { formatDate, fullName, todayISO } from '../../lib/utils'
import { noteOf } from '../../lib/notes'

/** Séance du jour (coachs) : contenu et temps à réaliser par athlète, mode « piste » lisible dehors */
export function MondayToday() {
  const { sessions, athletes, session_notes } = useData()
  const [params, setParams] = useSearchParams()
  const plan = useMemo(() => planSessions(sessions), [sessions])
  const dates = useMemo(() => [...new Set(plan.map((s) => planOf(s)!.date))], [plan])
  const next = dates.find((d) => d >= todayISO()) ?? dates[dates.length - 1]
  const date = params.get('date') && dates.includes(params.get('date')!) ? params.get('date')! : next
  const [only, setOnly] = useState('')
  const [track, setTrack] = useState(false)

  // Mode piste : on masque la navigation, gros caractères
  useEffect(() => {
    document.body.classList.toggle('track-mode', track)
    return () => document.body.classList.remove('track-mode')
  }, [track])

  if (!dates.length) {
    return (
      <div>
        <h1>⏱️ Séances du lundi</h1>
        <Empty>Aucun plan importé. <Link to="/lundi/import">Importer le plan du lundi (fichier JSON)</Link></Empty>
      </div>
    )
  }
  const i = dates.indexOf(date)
  const today = plan.filter((s) => planOf(s)!.date === date)
  const p0 = planOf(today[0])!
  const go = (k: number) => dates[k] && setParams({ date: dates[k] }, { replace: true })
  const shown = today.filter((s) => !only || planOf(s)!.subgroup === only)
  const members = (sg: string) => athletes.filter((a) => a.active && a.subgroup === sg).sort((a, b) => fullName(a).localeCompare(fullName(b)))

  return (
    <div className={track ? 'track' : ''}>
      {!track && (
        <div className="row between wrap">
          <h1>⏱️ Séance du lundi</h1>
          <div className="row gap">
            <Link className="btn" to="/lundi/plan">📋 Plan</Link>
            <Link className="btn ghost" to="/lundi/import">📥 Importer</Link>
          </div>
        </div>
      )}
      <div className="lundi-nav">
        <button className="btn small" disabled={i <= 0} onClick={() => go(i - 1)} aria-label="Lundi précédent">←</button>
        <select value={date} onChange={(e) => go(dates.indexOf(e.target.value))} aria-label="Date de la séance">
          {dates.map((d, k) => <option key={d} value={d}>S{String(k + 1).padStart(2, '0')} · {formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}</option>)}
        </select>
        <button className="btn small" disabled={i >= dates.length - 1} onClick={() => go(i + 1)} aria-label="Lundi suivant">→</button>
        <button className={`btn small ${track ? 'primary' : ''}`} onClick={() => setTrack(!track)}>{track ? '✕ Quitter le mode piste' : '🏟️ Mode piste'}</button>
      </div>
      <p className="small">
        <b>{p0.cycle}</b> · {p0.objective}{p0.light && <span className="pill">semaine allégée</span>}
      </p>

      <div className="row gap wrap day-filter">
        {['', ...Object.keys(SUBGROUPS).filter((sg) => today.some((s) => planOf(s)!.subgroup === sg))].map((sg) => (
          <button key={sg || 'all'} className={`chip ${only === sg ? 'on' : ''}`} onClick={() => setOnly(sg)}>{sg ? subgroupLabel(sg) : 'Tous'}</button>
        ))}
      </div>

      {!track && (
        <details className="card">
          <summary><b>Contenu de la séance</b></summary>
          <div className="small form">
            {p0.warmup && <p><b>Échauffement :</b> {p0.warmup}</p>}
            {p0.speed && <p><b>Bloc vitesse :</b> {p0.speed}</p>}
            {shown.map((s) => <p key={s.id}><b>{subgroupLabel(planOf(s)!.subgroup)} :</b> {planOf(s)!.content}</p>)}
            {p0.cooldown && <p><b>Retour au calme :</b> {p0.cooldown}</p>}
            {(() => { const n = noteOf(session_notes, today[0].id)?.text || p0.remarks; return n && <p className="muted"><b>🔒 Remarques (coachs) :</b> {n}</p> })()}
          </div>
        </details>
      )}

      {shown.map((s) => {
        const p = planOf(s)!
        return (
          <section key={s.id}>
            <h2>{subgroupLabel(p.subgroup)}</h2>
            {track && <p className="track-content">{p.content}</p>}
            <TargetTable targets={s.targets ?? []} athletes={members(p.subgroup)} big={track} />
          </section>
        )
      })}
      {!track && <p className="tiny muted">VMA : dernier test VMA. VMS : 30 m lancé (sinon 20 m lancé). RVA = VMS − VMA ; + 0,5 s jusqu’à 150 m (départ arrêté). « Record » : record sur la distance, sinon estimé depuis le 80 m (ou 100 m, 60 m).</p>}
    </div>
  )
}
