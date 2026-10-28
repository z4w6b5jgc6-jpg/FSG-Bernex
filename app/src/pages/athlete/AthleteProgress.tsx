import {LoadChart,ExerciseResults,PerformanceHighlights} from '../../components/AthleteMonitoring'
import { Icon } from '../../components/Icon'
import { useData, useMyAthlete } from '../../lib/data'
import { EffortBars, SleepBars } from '../../components/Charts'
import { ProfileTiles } from '../../components/ProfileTiles'
import { ReportCard } from '../../components/TestInsights'
import { checkinStreak, computeBadges, feedbackStreak, myAssignments } from '../../lib/athlete'
import { todayISO } from '../../lib/utils'

export function AthleteProgress() {
  const me = useMyAthlete()
  const { assignments, feedback, records, wellness, test_reports } = useData()
  if (!me) return null

  const today = todayISO()
  const mine = myAssignments(assignments, me)
  const past = mine.filter((a) => a.date <= today)
  const done = feedback.filter((f) => f.completed).length
  const streak = feedbackStreak(mine, feedback)
  const rpes = feedback.map((f) => f.rpe).filter((v): v is number => v != null)
  const avg = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : '–'
  const badges = computeBadges({ athlete: me, done, feedbackCount: feedback.length, streak, records, wellness })

  return (
    <div>
      <h1>Mes progrès</h1>
      <PerformanceHighlights athleteId={me.id}/>
      <LoadChart athleteId={me.id} />
      <ExerciseResults athleteId={me.id} />
      <ProfileTiles athlete={me} coach={false} />

      {test_reports.length > 0 && (
        <section>
          <h2>Le bilan de ton coach</h2>
          <div className="list">
            {[...test_reports].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 2).map((r) => <ReportCard key={r.id} report={r} />)}
          </div>
        </section>
      )}

      <details className="section-fold">
        <summary>Mon suivi</summary>
        <div className="stats">
          <div className="stat"><b>{done}</b><span>séances faites</span></div>
          <div className="stat"><b>{streak}</b><span>série en cours</span></div>
          <div className="stat"><b>{past.length ? Math.round((feedback.length / past.length) * 100) : 0}%</b><span>retours donnés</span></div>
          <div className="stat"><b>{checkinStreak(wellness)}</b><span>jours de check-in</span></div>
        </div>
        <div className="card"><EffortBars assignments={mine} feedback={feedback} /><p className="muted small">Effort moyen : {avg}/10</p></div>
        <div className="card"><SleepBars wellness={wellness} /></div>
      </details>

      <details className="section-fold">
        <summary>Mes badges <span className="muted small">({badges.filter((b) => b.earned).length}/{badges.length})</span></summary>
        <div className="badges">
          {badges.map((b) => (
            <div key={b.id} className={`badge-card ${b.earned ? '' : 'locked'}`}>
              <span><Icon name="medal" size={24} /></span>
              <strong>{b.title}</strong>
              <small>{b.desc}</small>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
