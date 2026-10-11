import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { AssignmentForm } from '../components/AssignmentForm'
import { GroupBadge } from '../components/ui'
import type { Assignment } from '../types'
import { addDays, athletesFor, formatDate, startOfWeek, todayISO } from '../lib/utils'

export function Planning() {
  const { assignments, sessions, groups, athletes, feedback, competitions } = useData()
  const [params, setParams] = useSearchParams()
  const [week, setWeek] = useState(startOfWeek(todayISO()))
  const [form, setForm] = useState<Partial<Assignment> | null>(
    params.get('seance') ? { session_id: params.get('seance')!, date: todayISO() } : null,
  )
  const today = todayISO()
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))

  const closeForm = () => {
    setForm(null)
    if (params.has('seance')) setParams({}, { replace: true })
  }

  return (
    <div>
      <div className="row between">
        <h1>Planning</h1>
        <button className="btn primary" onClick={() => setForm({ date: today >= week && today <= addDays(week, 6) ? today : week })}>+ Planifier</button>
      </div>
      <div className="week-nav">
        <button className="btn small" onClick={() => setWeek(addDays(week, -7))}>←</button>
        <span>
          {formatDate(week, { day: 'numeric', month: 'short' })} – {formatDate(addDays(week, 6), { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button className="btn small" onClick={() => setWeek(addDays(week, 7))}>→</button>
        <button className="btn ghost small" onClick={() => setWeek(startOfWeek(today))}>Aujourd’hui</button>
      </div>

      <div className="week">
        {days.map((d) => {
          const items = assignments.filter((a) => a.date === d).sort((a, b) => a.time.localeCompare(b.time))
          return (
            <div key={d} className={`day ${d === today ? 'today' : ''}`}>
              <div className="day-head">
                <span>{formatDate(d, { weekday: 'long', day: 'numeric' })}</span>
                <button className="btn ghost icon small" title="Planifier ce jour" onClick={() => setForm({ date: d })}>+</button>
              </div>
              {competitions.filter((c) => c.date <= d && (c.end_date || c.date) >= d).map((c) => (
                <Link key={c.id} to="/competitions" className={`slot comp-slot level-${c.level}`}>
                  <strong>🏆 {c.name}</strong>
                  <div className="small muted">Niveau {c.level}{c.location && ` · ${c.location}`}</div>
                </Link>
              ))}
              {items.map((a) => {
                const s = sessions.find((x) => x.id === a.session_id)
                const g = groups.find((x) => x.id === a.group_id)
                const expected = athletesFor(a, athletes).length
                const got = feedback.filter((f) => f.assignment_id === a.id).length
                return (
                  <Link key={a.id} to={`/planning/${a.id}`} className="slot">
                    <strong>{a.time && <span className="muted">{a.time} </span>}{s?.title ?? 'Séance supprimée'}</strong>
                    <div className="row gap small">
                      {g && <GroupBadge name={g.name} color={g.color} />}
                      {a.athlete_ids.length > 0 && <span className="muted">+{a.athlete_ids.length}</span>}
                      {d <= today && <span className="muted">💬 {got}/{expected}</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>

      {form && <AssignmentForm initial={form} onClose={closeForm} />}
    </div>
  )
}
