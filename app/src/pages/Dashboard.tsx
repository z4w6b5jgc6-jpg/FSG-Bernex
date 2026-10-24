import { Link } from 'react-router-dom'
import { Tiles } from '../components/Tiles'
import { useData } from '../lib/data'
import { FeedbackCard } from '../components/FeedbackCard'
import { Empty, GroupBadge } from '../components/ui'
import { InviteCard } from '../components/InviteCard'
import { feedbackToAnswer, unreadByCoach } from '../lib/messages'
import { addDays, athletesFor, formatDate, formatShort, todayISO } from '../lib/utils'

export function Dashboard() {
  const { assignments, sessions, groups, athletes, feedback, wellness, competitions, tests, messages, me, loading } = useData()
  const today = todayISO()
  const upcoming = assignments
    .filter((a) => a.date >= today && a.date <= addDays(today, 7))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const recent = [...feedback].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8)
  const fbAlerts = feedback
    .filter((f) => f.updated_at >= addDays(today, -7) && (f.pain || (f.fatigue ?? 0) >= 4 || (f.rpe ?? 0) >= 9))
    .map((f) => ({
      id: f.id, athlete_id: f.athlete_id,
      text: [f.pain && `douleur : ${f.pain}`, (f.fatigue ?? 0) >= 4 && 'très fatigué·e après la séance', (f.rpe ?? 0) >= 9 && `effort ${f.rpe}/10`].filter(Boolean).join(', '),
    }))
  const wAlerts = wellness
    .filter((w) => w.date >= addDays(today, -2) && ((w.sleep_hours ?? 9) < 6.5 || (w.energy ?? 5) <= 1 || (w.soreness ?? 0) >= 4 || (w.stress ?? 0) >= 4))
    .map((w) => ({
      id: w.id, athlete_id: w.athlete_id,
      text: '🌙 ' + [(w.sleep_hours ?? 9) < 6.5 && `${w.sleep_hours} h de sommeil`, (w.energy ?? 5) <= 1 && 'très peu d’énergie',
        (w.soreness ?? 0) >= 4 && 'fortes courbatures', (w.stress ?? 0) >= 4 && 'stressé·e'].filter(Boolean).join(', '),
    }))
  const alerts = [...wAlerts, ...fbAlerts]
  const checkins = new Set(wellness.filter((w) => w.date === today).map((w) => w.athlete_id)).size
  const pastWeek = assignments.filter((a) => a.date < today && a.date >= addDays(today, -7))
  const expected = pastWeek.reduce((n, a) => n + athletesFor(a, athletes).length, 0)
  const received = pastWeek.reduce((n, a) => n + feedback.filter((f) => f.assignment_id === a.id).length, 0)
  const unanswered = feedbackToAnswer(feedback, messages).length
  const unread = unreadByCoach(messages).length

  const pending = athletes.filter((a) => a.user_id && !a.signup_reviewed).length
  const nextComp = competitions.filter((c) => (c.end_date || c.date) >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
  const inDays = (d: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000)
  const deadlines = competitions.filter((c) => c.registration_deadline && inDays(c.registration_deadline) >= 0 && inDays(c.registration_deadline) <= 7).length
  const rate = expected ? Math.round((received / expected) * 100) : null

  const sessionOf = (id: string) => sessions.find((s) => s.id === id)
  const athleteOf = (id: string) => athletes.find((a) => a.id === id)

  return (
    <div>
      <h1>Bonjour 👋</h1>
      <p className="muted">{me?.club_name} · {formatDate(today)}</p>

      {athletes.length === 0 && <InviteCard />}
      {pending > 0 && (
        <Link to="/athletes" className="alert warn link-card">
          🆕 {pending} nouvelle(s) inscription(s) à vérifier →
        </Link>
      )}
      <Tiles items={[
        { to: '/planning', icon: '📅', label: 'Planning', tone: 'green',
          info: (upcoming.length ? `${upcoming.length} séance(s) dans les 7 j` : 'Rien de prévu cette semaine') + (rate !== null ? ` · retours ${rate} %` : '') },
        { to: '/athletes', icon: '🏃', label: 'Athlètes', tone: 'blue', badge: pending,
          info: `${athletes.filter((a) => a.active).length} athlètes` + (checkins ? ` · ${checkins} check-in(s) aujourd’hui` : '') },
        { to: '/messages', icon: '💬', label: 'Messages', tone: 'pink', badge: unread + unanswered,
          info: unread ? `${unread} message(s) non lu(s)` : unanswered ? `${unanswered} retour(s) sans réponse` : 'Retours et discussions des athlètes' },
        { to: '/seances', icon: '📋', label: 'Séances', tone: 'violet', info: `${sessions.length} séance(s) type` },
        { to: '/lundi', icon: '⏱️', label: 'Lundi', tone: 'orange', info: 'Temps cibles par athlète, mode piste' },
        { to: '/assistant', icon: '🤖', label: 'Assistant', tone: 'blue', info: 'Météo, intention, période : demande une séance' },
        { to: '/competitions', icon: '🏆', label: 'Compétitions', tone: 'yellow', badge: deadlines,
          info: nextComp ? `${nextComp.name} · ${inDays(nextComp.date) > 0 ? `dans ${inDays(nextComp.date)} j` : 'aujourd’hui'}` : 'Aucune prévue' },
        { to: '/tests', icon: '📏', label: 'Tests', tone: 'orange', info: `${tests.length} tests · résultats et VMA` },
        { to: '/conseils', icon: '💡', label: 'Conseils', tone: 'pink', info: 'Nutrition, sommeil, récup' },
        { to: '/reglages', icon: '⚙️', label: 'Réglages', tone: 'violet', info: 'Lieux, saison, mon groupe' },
      ]} />

      {alerts.length > 0 && (
        <section>
          <h2>⚠️ À surveiller</h2>
          <div className="card">
            <ul className="plain">
              {alerts.map((al) => {
                const a = athleteOf(al.athlete_id)
                return (
                  <li key={al.id}>
                    <Link to={`/athletes/${al.athlete_id}`}><strong>{a ? `${a.avatar} ${a.first_name} ${a.last_name}` : '?'}</strong></Link> — {al.text}
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
        <h2>Derniers retours {unanswered > 0 && <span className="pill warn">{unanswered} sans réponse</span>}</h2>
        {loading && recent.length === 0 ? <p className="muted">Chargement…</p> : recent.length === 0 ? (
          <Empty>Pas encore de retour. Les athlètes donnent leur ressenti depuis l’app après chaque séance.</Empty>
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
