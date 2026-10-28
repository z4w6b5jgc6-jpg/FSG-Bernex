import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { FirstSteps } from '../components/FirstSteps'
import { Icon } from '../components/Icon'
import { InstallPrompt } from '../components/InstallPrompt'
import { useData } from '../lib/data'
import { feedbackToAnswer, unreadByCoach } from '../lib/messages'
import type { Assignment, Athlete } from '../types'
import { addDays, athletesFor, formatDate, todayISO } from '../lib/utils'

type Tone = 'green' | 'orange' | 'red' | 'grey' | 'blue'
interface Flag { label: string; tone: Tone }

/** Signaux des derniers jours : douleur, fatigue, courbatures, stress (déclarés par l'athlète) */
function flagsOf(a: Athlete, since: string, feedback: ReturnType<typeof useData>['feedback'], wellness: ReturnType<typeof useData>['wellness']): Flag[] {
  const out: Flag[] = []
  const fb = feedback.filter((f) => f.athlete_id === a.id && f.updated_at.slice(0, 10) >= since)
  if (fb.some((f) => f.pain?.trim())) out.push({ label: 'Douleur', tone: 'red' })
  if (fb.some((f) => (f.fatigue ?? 0) >= 5)) out.push({ label: 'Épuisé·e', tone: 'orange' })
  const w = wellness.filter((x) => x.athlete_id === a.id && x.date >= since).sort((x, y) => y.date.localeCompare(x.date))[0]
  if (w) {
    if ((w.soreness ?? 0) >= 4) out.push({ label: 'Courbatures', tone: 'orange' })
    if ((w.energy ?? 5) <= 2) out.push({ label: 'Fatigue', tone: 'orange' })
    if ((w.stress ?? 0) >= 4) out.push({ label: 'Stress', tone: 'blue' })
  }
  return out
}

/** Accueil coach : la séance du jour, les athlètes à suivre, les messages, la semaine — rien d'autre */
export function Dashboard() {
  const { me, assignments, sessions, athletes, feedback, wellness, messages, attendance, loading } = useData()
  const today = todayISO()
  const active = athletes.filter((a) => a.active)
  const title = (a: Assignment) => sessions.find((s) => s.id === a.session_id)?.title ?? 'Séance'
  const byTime = (x: Assignment, y: Assignment) => (x.date + x.time).localeCompare(y.date + y.time)
  const todays = assignments.filter((a) => a.date === today).sort(byTime)
  const next = todays.length ? [] : assignments.filter((a) => a.date > today).sort(byTime).slice(0, 1)
  const week = assignments.filter((a) => a.date > today && a.date <= addDays(today, 7)).sort(byTime)

  const since = addDays(today, -3)
  const toWatch = active.map((a) => ({ a, flags: flagsOf(a, since, feedback, wellness) })).filter((x) => x.flags.length)
  const unread = unreadByCoach(messages).length + feedbackToAnswer(feedback, messages).length
  const pending = athletes.filter((a) => a.user_id && !a.signup_reviewed).length
  const lastWeek = assignments.filter((a) => a.date < today && a.date >= addDays(today, -7))
  const missing = lastWeek.reduce((n, a) => n + athletesFor(a, active).filter((x) => x.user_id && !feedback.some((f) => f.assignment_id === a.id && f.athlete_id === x.id)).length, 0)

  return (
    <div className="today">
      <InstallPrompt who="coach" />
      <header className="today-head">
        <p className="eyebrow">{formatDate(today)}</p>
        <h1>Aujourd’hui</h1>
      </header>
      <FirstSteps />

      {[...todays, ...next].map((a) => {
        const list = athletesFor(a, active)
        const present = attendance.filter((x) => x.assignment_id === a.id && x.status === 'present').length
        const fbs = feedback.filter((f) => f.assignment_id === a.id).length
        return (
          <Link key={a.id} to={`/planning/${a.id}`} className="session-hero">
            <span className={`status ${a.date === today ? 'green' : 'grey'}`}>{a.date === today ? 'Aujourd’hui' : formatDate(a.date, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            <h2>{title(a)}</h2>
            <p>{[a.time, a.location].filter(Boolean).join(' · ')}</p>
            <div className="hero-stats">
              <span><b>{list.length}</b> athlètes</span>
              {a.date === today && <span><b>{present}</b> présents</span>}
              <span><b>{fbs}</b> retours</span>
            </div>
            <span className="hero-go">Ouvrir <Icon name="arrowUpRight" size={16} /></span>
          </Link>
        )
      })}
      {!loading && !todays.length && !next.length && <div className="card muted">Aucune séance planifiée. <Link to="/planning">Planifier</Link></div>}

      <section>
        <h2 className="section-title">À suivre <span className="count">{toWatch.length}</span></h2>
        <div className="rows">
          {toWatch.length === 0 && <div className="row-item muted"><Icon name="check" size={18} /> Rien à signaler ces 3 derniers jours</div>}
          {toWatch.slice(0, 6).map(({ a, flags }) => (
            <Link key={a.id} to={`/athletes/${a.id}`} className="row-item">
              <Avatar a={a} size="sm" />
              <span className="row-main">{a.first_name} {a.last_name}
                <span className="row-tags">{flags.map((f) => <span key={f.label} className={`status ${f.tone}`}>{f.label}</span>)}</span>
              </span>
              <span className="chev" aria-hidden>›</span>
            </Link>
          ))}
          {pending > 0 && <Link to="/athletes" className="row-item"><span className="row-main">Nouvelles inscriptions</span><span className="status blue">{pending}</span><span className="chev" aria-hidden>›</span></Link>}
          {unread > 0 && <Link to="/messages" className="row-item"><span className="row-main">Messages à lire</span><span className="status red">{unread}</span><span className="chev" aria-hidden>›</span></Link>}
          {missing > 0 && <Link to="/messages" className="row-item"><span className="row-main">Retours manquants (7 j)</span><span className="status grey">{missing}</span><span className="chev" aria-hidden>›</span></Link>}
        </div>
      </section>

      {week.length > 0 && (
        <section>
          <h2 className="section-title">Cette semaine</h2>
          <div className="rows">
            {week.slice(0, 8).map((a) => (
              <Link key={a.id} to={`/planning/${a.id}`} className="row-item">
                <span className="day-chip"><b>{formatDate(a.date, { day: 'numeric' })}</b><small>{formatDate(a.date, { weekday: 'short' })}</small></span>
                <span className="row-main">{title(a)}<small>{[a.time, a.location].filter(Boolean).join(' · ')}</small></span>
                <span className="status grey">{athletesFor(a, active).length}</span>
                <span className="chev" aria-hidden>›</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {me && <p className="tiny muted center">{me.club_name}</p>}
    </div>
  )
}
