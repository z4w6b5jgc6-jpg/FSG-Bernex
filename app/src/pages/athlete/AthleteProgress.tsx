import { Icon } from '../../components/Icon'
import { useState } from 'react'
import { useData, useMyAthlete } from '../../lib/data'
import { EffortBars, SleepBars } from '../../components/Charts'
import { Empty } from '../../components/ui'
import { RecordForm } from '../../components/RecordForm'
import { TestResults } from '../../components/TestResults'
import { ReportCard } from '../../components/TestInsights'
import { VmaPaces } from '../../components/VmaPaces'
import { SprintEquivalence } from '../../components/SprintEquivalence'
import { checkinStreak, computeBadges, feedbackStreak, myAssignments } from '../../lib/athlete'
import type { PersonalRecord } from '../../types'
import { formatDate, todayISO } from '../../lib/utils'

export function AthleteProgress() {
  const me = useMyAthlete()
  const { assignments, feedback, records, wellness, tests, test_results, test_reports, remove } = useData()
  const [edit, setEdit] = useState<Partial<PersonalRecord> | null>(null)
  if (!me) return null

  const today = todayISO()
  const mine = myAssignments(assignments, me)
  const past = mine.filter((a) => a.date <= today)
  const done = feedback.filter((f) => f.completed).length
  const streak = feedbackStreak(mine, feedback)
  const rpes = feedback.map((f) => f.rpe).filter((v): v is number => v != null)
  const avg = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : '–'
  const badges = computeBadges({ athlete: me, done, feedbackCount: feedback.length, streak, records, wellness })
  const byEvent = [...new Set(records.map((r) => r.event))]

  return (
    <div>
      <h1>Mes progrès</h1>
      <div className="stats">
        <div className="stat"><b>{done}</b><span>séances faites</span></div>
        <div className="stat"><b>{streak}</b><span>série en cours</span></div>
        <div className="stat"><b>{past.length ? Math.round((feedback.length / past.length) * 100) : 0}%</b><span>retours donnés</span></div>
        <div className="stat"><b>{checkinStreak(wellness)}</b><span>jours de check-in</span></div>
      </div>

      <section>
        <div className="row between">
          <h2>Mes records</h2>
          <button className="btn primary small" onClick={() => setEdit({ date: today, event: me.events.split(',')[0]?.trim() ?? '' })}>+ Record</button>
        </div>
        {records.length === 0 ? (
          <Empty>Ajoute tes meilleures perfs (chrono, distance, hauteur) pour suivre ta progression.</Empty>
        ) : (
          <div className="list">
            {byEvent.map((ev) => {
              const list = records.filter((r) => r.event === ev).sort((a, b) => b.date.localeCompare(a.date))
              return (
                <div key={ev} className="card">
                  <div className="row between"><strong>{ev}</strong><span className="record-mark">{list[0].mark}</span></div>
                  <ul className="plain rows small">
                    {list.map((r) => (
                      <li key={r.id} className="row between">
                        <button className="link left" onClick={() => setEdit(r)}>
                          <b>{r.mark}</b> <span className="muted">· {formatDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}{r.competition && ` · ${r.competition}`}</span>
                        </button>
                        <button className="btn ghost icon small danger" onClick={() => confirm('Supprimer ce record ?') && remove('records', r.id)}>✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {test_reports.length > 0 && (
        <section>
          <h2>Le bilan de ton coach</h2>
          <div className="list">
            {[...test_reports].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 2).map((r) => <ReportCard key={r.id} report={r} />)}
          </div>
        </section>
      )}

      <section>
        <h2>Mes tests</h2>
        <VmaPaces tests={tests} results={test_results} />
        <TestResults tests={tests} results={test_results} />
        <SprintEquivalence tests={tests} results={test_results} records={records} title="Mes temps probables" />
        {test_results.length > 0 && <p className="tiny muted">Saisis par ton coach · ▲ = progrès par rapport au test précédent</p>}
      </section>

      <section>
        <h2>Effort ressenti</h2>
        <div className="card"><EffortBars assignments={mine} feedback={feedback} /><p className="muted small">Effort moyen : {avg}/10</p></div>
      </section>

      <section>
        <h2>Mon sommeil</h2>
        <div className="card"><SleepBars wellness={wellness} /></div>
      </section>

      <section>
        <h2>Mes badges</h2>
        <div className="badges">
          {badges.map((b) => (
            <div key={b.id} className={`badge-card ${b.earned ? '' : 'locked'}`}>
              <span><Icon name="medal" size={24} /></span>
              <strong>{b.title}</strong>
              <small>{b.desc}</small>
            </div>
          ))}
        </div>
      </section>

      {edit && <RecordForm initial={edit} athleteId={me.id} onClose={() => setEdit(null)} />}
    </div>
  )
}
