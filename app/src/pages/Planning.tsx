import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { validDate } from '../lib/season'
import { useData } from '../lib/data'
import { AssignmentForm } from '../components/AssignmentForm'
import { phaseTone, weekOf } from '../lib/macro'
import { findDuplicates } from '../lib/duplicates'
import type { Assignment } from '../types'
import { addDays, athletesFor, formatDate, startOfWeek, todayISO } from '../lib/utils'

/** Planning : la semaine en tableau (un jour = une section, une séance = une ligne), filtre par groupe */
export function Planning() {
  const { me, assignments, sessions, groups, athletes, feedback, competitions } = useData()
  const [params, setParams] = useSearchParams()
  const [groupId, setGroupId] = useState('')
  const [week, setWeek] = useState(startOfWeek(validDate(params.get('date') ?? '') ? params.get('date')! : todayISO()))
  const [form, setForm] = useState<Partial<Assignment> | null>(
    params.get('seance') ? { athlete_ids: [], session_id: params.get('seance')!, date: validDate(params.get('date') ?? '') ? params.get('date')! : todayISO() } : null,
  )
  const today = todayISO()
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const active = athletes.filter((a) => a.active)
  const shown = assignments.filter((a) => !groupId || a.group_id === groupId || athletesFor(a, athletes).some((p) => p.group_id === groupId))
  const dups = useMemo(() => findDuplicates(assignments, sessions, athletes, feedback).length, [assignments, sessions, athletes, feedback])
  const closeForm = () => { setForm(null); if (params.has('seance')) setParams({}, { replace: true }) }
  const planOn = (date: string) => setForm({ date, group_id: groupId || null, athlete_ids: [] })

  return (
    <div>
      <div className="row between">
        <h1>Planning</h1>
        <button className="btn primary" onClick={() => planOn(today >= week && today <= addDays(week, 6) ? today : week)}>+ Planifier</button>
      </div>
      <div className="week-nav">
        <button className="btn small" aria-label="Semaine précédente" onClick={() => setWeek(addDays(week, -7))}>‹</button>
        <button className="week-label" onClick={() => setWeek(startOfWeek(today))} title="Revenir à cette semaine">
          {formatDate(week, { day: 'numeric', month: 'short' })} – {formatDate(addDays(week, 6), { day: 'numeric', month: 'short' })}
        </button>
        <button className="btn small" aria-label="Semaine suivante" onClick={() => setWeek(addDays(week, 7))}>›</button>
      </div>
      {(() => {
        const w = weekOf(me?.settings?.macro, addDays(week, 3))
        return w && w.monday >= addDays(week, -6) ? (
          <Link to="/saison" className="week-phase">
            <span className={`status ${phaseTone(w.phase)}`}>S{w.week}</span>
            <span className="row-main">{w.phase}{(w.mondayNote || w.wednesdayNote) && <small>{[w.mondayNote && `Lun. : ${w.mondayNote}`, w.wednesdayNote && `Mer. : ${w.wednesdayNote}`].filter(Boolean).join(' · ')}</small>}</span>
            <span className="charge-cell"><b>{w.charge ?? '—'}</b><i style={{ width: `${w.charge ?? 0}%` }} className={phaseTone(w.phase)} /></span>
          </Link>
        ) : null
      })()}
      {groups.length > 1 && (
        <div className="chips-wrap planning-filter">
          <button className={`mini-chip ${!groupId ? 'on' : ''}`} onClick={() => setGroupId('')}>Tous</button>
          {groups.map((g) => <button key={g.id} className={`mini-chip ${groupId === g.id ? 'on' : ''}`} onClick={() => setGroupId(g.id)}>{g.name}</button>)}
        </div>
      )}

      {days.map((d) => {
        const items = shown.filter((a) => a.date === d).sort((a, b) => a.time.localeCompare(b.time))
        const comps = competitions.filter((c) => c.date <= d && (c.end_date || c.date) >= d)
        if (!items.length && !comps.length) return (
          <div key={d} className={`day-empty ${d === today ? 'is-today' : ''}`}>
            <span>{formatDate(d, { weekday: 'short', day: 'numeric' })}</span>
            <button className="link small" onClick={() => planOn(d)}>+ Planifier</button>
          </div>
        )
        return (
          <section key={d} className="day-group">
            <h2 className={`section-title ${d === today ? 'is-today' : ''}`}>{d === today ? 'Aujourd’hui' : formatDate(d, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
            <div className="rows">
              {comps.map((c) => (
                <Link key={c.id} to="/competitions" className="row-item">
                  <span className="status red">Compét.</span>
                  <span className="row-main">{c.name}<small>{c.location}</small></span>
                  <span className="chev" aria-hidden>›</span>
                </Link>
              ))}
              {items.map((a) => {
                const list = athletesFor(a, active)
                const got = feedback.filter((f) => f.assignment_id === a.id).length
                const g = groups.find((x) => x.id === a.group_id)
                return (
                  <Link key={a.id} to={`/planning/${a.id}`} className="row-item">
                    <span className="time-chip">{a.time || '—'}</span>
                    <span className="row-main">{sessions.find((s) => s.id === a.session_id)?.title ?? 'Séance supprimée'}<small>{[g?.name, a.location].filter(Boolean).join(' · ')}</small></span>
                    {d <= today
                      ? <span className={`status ${got >= list.length && list.length ? 'green' : got ? 'orange' : 'grey'}`}>{got}/{list.length}</span>
                      : <span className="status grey">{list.length}</span>}
                    <span className="chev" aria-hidden>›</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}

      <div className="rows planning-tools">
        <Link to="/planning/doublons" className="row-item"><span className="row-main">Vérifier les doublons<small>Même jour, mêmes athlètes</small></span>{dups > 0 && <span className="status red">{dups}</span>}<span className="chev" aria-hidden>›</span></Link>
        <Link to="/planning/athletes" className="row-item"><span className="row-main">Qui fait quoi<small>Ajouter ou retirer un athlète d’une série</small></span><span className="chev" aria-hidden>›</span></Link>
        <Link to="/seances/import" className="row-item"><span className="row-main">Importer un plan Excel / Word</span><span className="chev" aria-hidden>›</span></Link>
        <Link to="/planning/export" className="row-item"><span className="row-main">Exporter en Excel</span><span className="chev" aria-hidden>›</span></Link>
      </div>
      {form && <AssignmentForm initial={form} onClose={closeForm} />}
    </div>
  )
}
