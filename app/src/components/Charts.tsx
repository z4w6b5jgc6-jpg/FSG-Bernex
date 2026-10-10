import type { Assignment, Feedback, Wellness } from '../types'
import { addDays, formatShort, todayISO } from '../lib/utils'

/** Barres d'effort ressenti (RPE) des dernières séances */
export function EffortBars({ assignments, feedback }: { assignments: Assignment[]; feedback: Feedback[] }) {
  const today = todayISO()
  const recent = assignments.filter((a) => a.date <= today).sort((a, b) => a.date.localeCompare(b.date)).slice(-12)
  if (recent.length === 0) return <p className="muted small">Pas encore de séance.</p>
  return (
    <>
      <div className="bars">
        {recent.map((x) => {
          const f = feedback.find((y) => y.assignment_id === x.id)
          const v = f?.rpe ?? 0
          return (
            <div key={x.id} className="bar-col" title={`${formatShort(x.date)} : ${f ? (f.rpe ?? '–') + '/10' : 'pas de retour'}`}>
              {f?.rpe != null && <small>{f.rpe}</small>}
              <div className={`bar ${!f ? 'missing' : v >= 8 ? 'danger' : v >= 6 ? 'warn' : 'ok'}`} style={{ height: `${f ? Math.max(v, 0.5) * 9 : 90}%` }} />
              <span>{formatShort(x.date).split(' ')[1]}</span>
            </div>
          )
        })}
      </div>
      <p className="muted small">Effort ressenti sur 10 · gris = pas de retour</p>
    </>
  )
}

/** Sommeil des 14 derniers jours */
export function SleepBars({ wellness }: { wellness: Wellness[] }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(todayISO(), i - 13))
  const avgList = wellness.filter((w) => days.includes(w.date) && w.sleep_hours != null).map((w) => Number(w.sleep_hours))
  const avg = avgList.length ? (avgList.reduce((a, b) => a + b, 0) / avgList.length).toFixed(1) : null
  return (
    <>
      <div className="bars">
        {days.map((d) => {
          const w = wellness.find((x) => x.date === d)
          const h = w?.sleep_hours != null ? Number(w.sleep_hours) : null
          return (
            <div key={d} className="bar-col" title={`${formatShort(d)} : ${h != null ? h + ' h' : '—'}`}>
              {h != null && <small>{h}</small>}
              <div className={`bar ${h == null ? 'missing' : h >= 8 ? 'ok' : h >= 7 ? 'warn' : 'danger'}`} style={{ height: `${h != null ? Math.min(h, 11) * 8 : 6}%` }} />
              <span>{formatShort(d).split(' ')[1]}</span>
            </div>
          )
        })}
      </div>
      <p className="muted small">Heures de sommeil{avg && ` · moyenne ${avg} h`} · objectif 8 h et plus</p>
    </>
  )
}
