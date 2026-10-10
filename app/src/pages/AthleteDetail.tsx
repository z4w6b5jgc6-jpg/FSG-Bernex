import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { AthleteLinkActions } from '../components/AthleteLinkActions'
import { FeedbackCard } from '../components/FeedbackCard'
import { Empty, GroupBadge } from '../components/ui'
import { AthleteForm } from './Athletes'
import { athletesFor, formatShort, fullName, todayISO, uid } from '../lib/utils'

export function AthleteDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { athletes, groups, assignments, sessions, feedback, save, remove, loading } = useData()
  const [editing, setEditing] = useState(false)
  const a = athletes.find((x) => x.id === id)
  if (!a) return loading ? <p className="muted">Chargement…</p> : <Empty>Athlète introuvable. <Link to="/athletes">Retour</Link></Empty>

  const g = groups.find((x) => x.id === a.group_id)
  const today = todayISO()
  const mine = assignments
    .filter((x) => x.date <= today && athletesFor(x, [a]).length > 0)
    .sort((x, y) => y.date.localeCompare(x.date))
  const fbs = feedback.filter((f) => f.athlete_id === a.id)
  const fbFor = (assignmentId: string) => fbs.find((f) => f.assignment_id === assignmentId)
  const done = fbs.filter((f) => f.completed).length
  const rpes = fbs.map((f) => f.rpe).filter((v): v is number => v != null)
  const avg = rpes.length ? (rpes.reduce((s, v) => s + v, 0) / rpes.length).toFixed(1) : '–'
  const recent = mine.slice(0, 12).reverse()

  const regenerate = async () => {
    if (!confirm('Générer un nouveau lien ? L’ancien lien ne fonctionnera plus.')) return
    await save('athletes', { id: a.id, access_token: uid() })
  }
  const del = async () => {
    if (!confirm(`Supprimer définitivement ${fullName(a)} et tous ses retours ? (Tu peux aussi simplement le/la désactiver.)`)) return
    await remove('athletes', a.id)
    nav('/athletes')
  }

  return (
    <div>
      <Link to="/athletes" className="muted small">← Athlètes</Link>
      <h1>{fullName(a)} {!a.active && <span className="pill">inactif</span>}</h1>
      <div className="row gap wrap">
        {g && <GroupBadge name={g.name} color={g.color} />}
        {a.birth_year && <span className="muted small">né·e en {a.birth_year}</span>}
        {a.events && <span className="muted small">· {a.events}</span>}
      </div>
      {a.notes && <div className="alert info small">📝 {a.notes}</div>}

      <div className="card">
        <h3>Lien personnel</h3>
        <AthleteLinkActions athlete={a} />
        <div className="row gap wrap actions">
          <button className="btn small" onClick={() => setEditing(true)}>Modifier</button>
          <button className="btn small ghost" onClick={regenerate}>Nouveau lien</button>
          <button className="btn small ghost danger" onClick={del}>Supprimer</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><b>{mine.length}</b><span>séances prévues</span></div>
        <div className="stat"><b>{done}</b><span>réalisées</span></div>
        <div className="stat"><b>{mine.length ? Math.round((fbs.length / mine.length) * 100) : 0}%</b><span>retours</span></div>
        <div className="stat"><b>{avg}</b><span>effort moyen</span></div>
      </div>

      {recent.length > 0 && (
        <section>
          <h2>Effort ressenti (dernières séances)</h2>
          <div className="card">
            <div className="bars">
              {recent.map((x) => {
                const f = fbFor(x.id)
                const v = f?.rpe ?? 0
                return (
                  <div key={x.id} className="bar-col" title={`${formatShort(x.date)} : ${f ? (f.rpe ?? '–') + '/10' : 'pas de retour'}`}>
                    <div className={`bar ${!f ? 'missing' : v >= 8 ? 'danger' : v >= 6 ? 'warn' : 'ok'}`} style={{ height: `${f ? Math.max(v, 0.5) * 10 : 100}%` }} />
                    <span>{formatShort(x.date).split(' ')[1]}</span>
                  </div>
                )
              })}
            </div>
            <p className="muted small">Barres grises = pas de retour.</p>
          </div>
        </section>
      )}

      <section>
        <h2>Historique</h2>
        {mine.length === 0 ? <Empty>Aucune séance passée.</Empty> : (
          <div className="list">
            {mine.map((x) => {
              const f = fbFor(x.id)
              const title = sessions.find((s) => s.id === x.session_id)?.title
              const subtitle = <Link to={`/planning/${x.id}`}>{title} · {formatShort(x.date)}</Link>
              return f ? (
                <FeedbackCard key={x.id} fb={f} athlete={a} subtitle={subtitle} />
              ) : (
                <div key={x.id} className="card muted">
                  {subtitle} — ⏳ pas de retour
                </div>
              )
            })}
          </div>
        )}
      </section>

      {editing && <AthleteForm initial={a} onClose={() => setEditing(false)} />}
    </div>
  )
}
