import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData, useMyAthlete } from '../../lib/data'
import { WellnessCheckin } from '../../components/WellnessCheckin'
import { Icon } from '../../components/Icon'
import { InstallPrompt } from '../../components/InstallPrompt'
import { myAssignments } from '../../lib/athlete'
import { addDays, formatDate, todayISO, itemSummary } from '../../lib/utils'
import { validDate } from '../../lib/season'
import { weekMonday } from '../../lib/weeklyReview'
import { isReleased, releaseAt, releaseText } from '../../lib/release'
import { unreadByAthlete } from '../../lib/messages'

/** Accueil athlète : la prochaine séance, ce qu'il reste à faire, ta semaine — dans cet ordre */
export function AthleteHome() {
  const athlete = useMyAthlete(), { assignments, sessions, session_adjustments, feedback, messages, records, wellness, loading } = useData()
  const [now, setNow] = useState(Date.now)
  const [checkin, setCheckin] = useState(false)
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(id) }, [])
  if (!athlete) return <p className="muted">{loading ? 'Chargement…' : 'Profil introuvable.'}</p>
  const today = todayISO(), week = weekMonday(today)
  const mine = myAssignments(assignments, athlete).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const own = feedback.filter((f) => f.athlete_id === athlete.id)
  const next = mine.find((a) => a.date >= today && !own.some((f) => f.assignment_id === a.id))
  const unread = unreadByAthlete(messages.filter((m) => m.athlete_id === athlete.id)).length
  const common = next && sessions.find((s) => s.id === next.session_id)
  const variant = next && session_adjustments.find((v) => v.assignment_id === next.id && v.athlete_id === athlete.id)
  const released = !!next && isReleased(next, undefined, now)
  const program = released && common ? { ...common, ...variant?.content } : undefined
  const preview = program?.blocks.filter((b) => !/^remarques?$/i.test(b.title.trim())).flatMap((b) => b.items).slice(0, 3) ?? []
  const pending = mine.filter((a) => a.date < today && a.date >= addDays(today, -14) && !own.some((f) => f.assignment_id === a.id)).slice(-3)
  const checkedIn = wellness.some((w) => w.athlete_id === athlete.id && w.date === today)
  const reply = [...own].filter((f) => f.coach_reply?.trim() && mine.some((a) => a.id === f.assignment_id && a.date <= today)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
  const mark = [...records].filter((r) => r.athlete_id === athlete.id && validDate(r.date) && r.date <= today && r.kind !== 'muscu').sort((a, b) => b.date.localeCompare(a.date))[0]
  const at = next && !released ? releaseAt(next) : null

  return (
    <div className="today">
      <InstallPrompt who="athlete" />
      <header className="today-head row between">
        <div><p className="eyebrow">{formatDate(today)}</p><h1>Salut {athlete.first_name}</h1></div>
        <Link className="athlete-message-link" to="/messages" aria-label={`Messages${unread ? ' · ' + unread + ' non lu(s)' : ''}`}><Icon name="message" />{unread > 0 && <span>{unread}</span>}</Link>
      </header>

      {next ? (
        <Link to={`/seances/${next.id}`} className="session-hero">
          <span className={`status ${next.date === today ? 'green' : 'grey'}`}>{next.date === today ? 'Aujourd’hui' : formatDate(next.date, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
          <h2>{program?.title ?? 'Entraînement'}</h2>
          <p>{[next.time, next.location].filter(Boolean).join(' · ')}</p>
          {preview.length > 0 && <ul className="hero-preview">{preview.map((i) => <li key={i.id}><b>{i.name}</b>{itemSummary(i) && <small>{itemSummary(i)}</small>}</li>)}</ul>}
          {variant && released && <p className="tiny">Programme adapté pour toi par ton coach.</p>}
          {!released && <p className="tiny">Programme visible {at ? releaseText(at) : 'bientôt'}.</p>}
          <span className="hero-go">{released ? 'Ouvrir' : 'Voir'} <Icon name="arrowUpRight" size={16} /></span>
        </Link>
      ) : (
        <div className="card muted">Pas de séance prévue pour l’instant.</div>
      )}

      <section>
        <h2 className="section-title">À faire</h2>
        <div className="rows">
          <button type="button" className="row-item" onClick={() => setCheckin(!checkin)} aria-expanded={checkin}>
            <span className="row-icon"><Icon name="activity" size={20} /></span>
            <span className="row-main">Comment je me sens<small>Sommeil, énergie, courbatures · 30 secondes</small></span>
            <span className={`status ${checkedIn ? 'green' : 'orange'}`}>{checkedIn ? 'Fait' : 'À faire'}</span>
          </button>
          {checkin && <div className="row-item checkin-open"><WellnessCheckin athleteId={athlete.id} /></div>}
          {pending.map((a) => (
            <Link key={a.id} className="row-item" to={`/seances/${a.id}`}>
              <span className="row-icon"><Icon name="message" size={20} /></span>
              <span className="row-main">Mon retour de séance<small>{formatDate(a.date, { weekday: 'long', day: 'numeric', month: 'short' })}</small></span>
              <span className="status orange">À faire</span><span className="chev" aria-hidden>›</span>
            </Link>
          ))}
        </div>
      </section>

      {reply && <Link className="card youth-coach-reply" to={`/seances/${reply.assignment_id}`}><span className="eyebrow">Le mot de ton coach</span><p>{reply.coach_reply}</p></Link>}

      <section>
        <h2 className="section-title">Ma semaine</h2>
        <div className="week-strip">{Array.from({ length: 7 }, (_, i) => {
          const date = addDays(week, i), planned = mine.filter((a) => a.date === date)
          const done = planned.some((a) => own.some((f) => f.assignment_id === a.id && f.completed))
          return <div key={date} className={`${date === today ? 'is-today' : ''} ${done ? 'is-done' : planned.length ? 'is-planned' : ''}`}><small>{formatDate(date, { weekday: 'narrow' })}</small><b>{Number(date.slice(-2))}</b><i /></div>
        })}</div>
      </section>

      <div className="rows">
        {mark && <Link className="row-item" to="/progres"><span className="row-icon"><Icon name="trophy" size={20} /></span><span className="row-main">{mark.event}<small>Dernière perf · {formatDate(mark.date, { day: 'numeric', month: 'short' })}</small></span><b>{mark.mark}</b><span className="chev" aria-hidden>›</span></Link>}
        <Link className="row-item" to="/competitions"><span className="row-icon"><Icon name="medal" size={20} /></span><span className="row-main">Mes compétitions</span><span className="chev" aria-hidden>›</span></Link>
        <Link className="row-item" to="/conseils"><span className="row-icon"><Icon name="bulb" size={20} /></span><span className="row-main">Conseils</span><span className="chev" aria-hidden>›</span></Link>
      </div>
    </div>
  )
}
