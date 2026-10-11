import { Link } from 'react-router-dom'
import { NextCompetitions } from '../Competitions'
import { useData, useMyAthlete } from '../../lib/data'
import { WellnessCheckin } from '../../components/WellnessCheckin'
import { InstallPrompt } from '../../components/InstallPrompt'
import { allTips, computeBadges, feedbackStreak, greeting, myAssignments, tipOfTheDay } from '../../lib/athlete'
import { addDays, formatDate, todayISO } from '../../lib/utils'

export function AthleteHome() {
  const me = useMyAthlete()
  const { assignments, sessions, feedback, records, wellness, tips, groups, test_reports, loading } = useData()
  if (!me) return <p className="muted">{loading ? 'Chargement…' : 'Profil introuvable.'}</p>

  const today = todayISO()
  const mine = myAssignments(assignments, me)
  const todays = mine.filter((a) => a.date === today)
  const next = mine.filter((a) => a.date > today).sort((a, b) => a.date.localeCompare(b.date))[0]
  const todo = mine.filter((a) => a.date <= today && !feedback.some((f) => f.assignment_id === a.id))
  const streak = feedbackStreak(mine, feedback)
  const done = feedback.filter((f) => f.completed).length
  const badges = computeBadges({ athlete: me, done, feedbackCount: feedback.length, streak, records, wellness })
  const earned = badges.filter((b) => b.earned)
  const tip = tipOfTheDay(allTips(tips))
  const group = groups.find((g) => g.id === me.group_id)
  const title = (sid: string) => sessions.find((s) => s.id === sid)?.title ?? 'Séance'

  return (
    <div>
      <div className="hero">
        <div className="hero-avatar">{me.avatar}</div>
        <div>
          <h1>{greeting()} {me.first_name} !</h1>
          <div className="hero-sub">
            {group && <span>{group.name}</span>}
            {streak > 0 && <span className="streak">🔥 {streak} séance{streak > 1 ? 's' : ''} d’affilée</span>}
          </div>
        </div>
      </div>
      {me.goals ? (
        <div className="goal">🎯 <b>Mon objectif :</b> {me.goals}</div>
      ) : (
        <Link to="/profil" className="goal muted">🎯 Fixe-toi un objectif de saison →</Link>
      )}

      <InstallPrompt who="athlete" />

      {todays.map((a) => (
        <Link key={a.id} to={`/seances/${a.id}`} className="card link-card today-card">
          <div className="muted small">AUJOURD’HUI{a.time && ` · ${a.time}`}{a.location && ` · ${a.location}`}</div>
          <h2>{title(a.session_id)}</h2>
          {a.note && <div className="small">ℹ️ {a.note}</div>}
          <div className="small">{feedback.some((f) => f.assignment_id === a.id) ? '✓ Retour envoyé' : 'Voir la séance et donner mon ressenti →'}</div>
        </Link>
      ))}

      {todo.filter((a) => a.date < today).length > 0 && (
        <section>
          <h2>💬 À faire</h2>
          <div className="list">
            {todo.filter((a) => a.date < today).slice(0, 3).map((a) => (
              <Link key={a.id} to={`/seances/${a.id}`} className="card link-card row between">
                <span><b>{title(a.session_id)}</b><br /><span className="muted small">{formatDate(a.date)}</span></span>
                <span className="pill warn">Donner mon retour</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <WellnessCheckin athleteId={me.id} />
      </section>

      {(() => {
        const r = [...test_reports].sort((x, y) => y.date.localeCompare(x.date))[0]
        if (!r || r.date < addDays(today, -21)) return null
        return (
          <Link to="/progres" className="card link-card tip-card">
            <span className="tip-emoji">📝</span>
            <div><strong>Nouveau : {r.title}</strong><div className="muted small">{r.message.slice(0, 110)}{r.message.length > 110 && '…'}</div></div>
          </Link>
        )
      })()}

      {next && (
        <section>
          <h2>Prochaine séance</h2>
          <Link to={`/seances/${next.id}`} className="card link-card">
            <strong>{title(next.session_id)}</strong>
            <div className="muted small">{formatDate(next.date)}{next.time && ` · ${next.time}`}{next.location && ` · ${next.location}`}</div>
          </Link>
        </section>
      )}

      <NextCompetitions />

      {tip && (
        <section>
          <h2>💡 Le conseil du jour</h2>
          <Link to={`/conseils/${tip.id}`} className="card link-card tip-card">
            <span className="tip-emoji">{tip.emoji}</span>
            <div><strong>{tip.title}</strong><div className="muted small">{tip.summary}</div></div>
          </Link>
        </section>
      )}

      <section>
        <div className="row between">
          <h2>Mes badges</h2>
          <Link to="/progres" className="small">{earned.length}/{badges.length} →</Link>
        </div>
        <div className="badge-row">
          {badges.slice(0, 8).map((b) => (
            <div key={b.id} className={`badge-mini ${b.earned ? '' : 'locked'}`} title={`${b.title} – ${b.desc}`}>{b.emoji}</div>
          ))}
        </div>
      </section>
    </div>
  )
}
