import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { FeedbackCard } from '../components/FeedbackCard'
import { Empty, GroupBadge } from '../components/ui'
import { addDays, athletesFor, formatDate, formatShort, todayISO } from '../lib/utils'

export function Dashboard() {
  const { assignments, sessions, groups, athletes, feedback, loading } = useData()
  const today = todayISO()
  const upcoming = assignments
    .filter((a) => a.date >= today && a.date <= addDays(today, 7))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const recent = [...feedback].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8)
  const alerts = feedback.filter(
    (f) => f.updated_at >= addDays(today, -7) && (f.pain || (f.fatigue ?? 0) >= 4 || (f.rpe ?? 0) >= 9),
  )
  const pastWeek = assignments.filter((a) => a.date < today && a.date >= addDays(today, -7))
  const expected = pastWeek.reduce((n, a) => n + athletesFor(a, athletes).length, 0)
  const received = pastWeek.reduce((n, a) => n + feedback.filter((f) => f.assignment_id === a.id).length, 0)
  const unanswered = feedback.filter((f) => !f.coach_reply && f.comment).length

  const sessionOf = (id: string) => sessions.find((s) => s.id === id)
  const athleteOf = (id: string) => athletes.find((a) => a.id === id)

  return (
    <div>
      <h1>Bonjour 👋</h1>
      <p className="muted">{formatDate(today)}</p>

      <div className="stats">
        <div className="stat"><b>{athletes.filter((a) => a.active).length}</b><span>athlètes</span></div>
        <div className="stat"><b>{upcoming.length}</b><span>séances (7 j)</span></div>
        <div className="stat"><b>{expected ? Math.round((received / expected) * 100) : 0}%</b><span>retours (7 j)</span></div>
        <div className="stat"><b>{unanswered}</b><span>sans réponse</span></div>
      </div>

      {alerts.length > 0 && (
        <section>
          <h2>⚠️ À surveiller</h2>
          <div className="card">
            <ul className="plain">
              {alerts.map((f) => {
                const a = athleteOf(f.athlete_id)
                return (
                  <li key={f.id}>
                    <Link to={`/athletes/${f.athlete_id}`}><strong>{a ? a.first_name + ' ' + a.last_name : '?'}</strong></Link>
                    {' — '}
                    {[f.pain && `douleur : ${f.pain}`, (f.fatigue ?? 0) >= 4 && 'très fatigué·e', (f.rpe ?? 0) >= 9 && `effort ${f.rpe}/10`]
                      .filter(Boolean).join(', ')}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      <section>
        <div className="row between">
          <h2>Prochaines séances</h2>
          <Link className="btn small" to="/planning">Planning →</Link>
        </div>
        {upcoming.length === 0 ? (
          <Empty>Aucune séance prévue cette semaine. <Link to="/planning">Planifier une séance</Link></Empty>
        ) : (
          <div className="list">
            {upcoming.map((a) => {
              const g = groups.find((x) => x.id === a.group_id)
              return (
                <Link key={a.id} to={`/planning/${a.id}`} className="card link-card">
                  <div className="row between">
                    <strong>{sessionOf(a.session_id)?.title ?? 'Séance supprimée'}</strong>
                    <span className="muted small">{a.date === today ? "Aujourd'hui" : formatShort(a.date)} {a.time}</span>
                  </div>
                  <div className="row gap small">
                    {g && <GroupBadge name={g.name} color={g.color} />}
                    {a.athlete_ids.length > 0 && <span className="muted">+ {a.athlete_ids.length} athlète(s)</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2>Derniers retours</h2>
        {loading && recent.length === 0 ? <p className="muted">Chargement…</p> : recent.length === 0 ? (
          <Empty>Pas encore de retour. Les athlètes peuvent donner leur ressenti depuis leur lien personnel.</Empty>
        ) : (
          <div className="list">
            {recent.map((f) => {
              const as = assignments.find((a) => a.id === f.assignment_id)
              return (
                <FeedbackCard key={f.id} fb={f} athlete={athleteOf(f.athlete_id)}
                  subtitle={as && <Link to={`/planning/${as.id}`}>{sessionOf(as.session_id)?.title} · {formatShort(as.date)}</Link>} />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
