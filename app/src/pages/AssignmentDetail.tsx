import { useState } from 'react'
import { BackLink } from '../components/BackLink'
import { DayNav } from '../components/DayNav'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { AssignmentForm } from '../components/AssignmentForm'
import { FeedbackCard, FeedbackScores } from '../components/FeedbackCard'
import { SessionView } from '../components/SessionView'
import { Empty, GroupBadge } from '../components/ui'
import { athletesFor, formatDate, fullName, nativeShare, todayISO, whatsappUrl } from '../lib/utils'

export function AssignmentDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { assignments, sessions, groups, athletes, feedback, remove, loading } = useData()
  const [editing, setEditing] = useState(false)
  const a = assignments.find((x) => x.id === id)
  if (!a) return loading ? <p className="muted">Chargement…</p> : <Empty>Planification introuvable. <Link to="/planning">Retour</Link></Empty>

  const s = sessions.find((x) => x.id === a.session_id)
  // Autres séances du même jour (groupes, sous-groupes) : libellé court = fin du titre après « · », sinon le groupe
  const titleOf = (x: typeof a) => sessions.find((y) => y.id === x.session_id)?.title ?? 'Séance'
  const sameDay = assignments.filter((x) => x.date === a.date)
    .sort((x, y) => (x.time || '').localeCompare(y.time || '') || titleOf(x).localeCompare(titleOf(y)))
    .map((x) => {
      const t = titleOf(x)
      const short = t.includes(' · ') ? t.split(' · ').slice(1).join(' · ') : groups.find((g) => g.id === x.group_id)?.name ?? t
      return { id: x.id, label: short.length > 32 ? short.slice(0, 31) + '…' : short }
    })
  const g = groups.find((x) => x.id === a.group_id)
  const targets = athletesFor(a, athletes)
  const fbs = feedback.filter((f) => f.assignment_id === a.id)
  const past = a.date <= todayISO()
  const rpes = fbs.map((f) => f.rpe).filter((v): v is number => v != null)
  const avgRpe = rpes.length ? (rpes.reduce((x, y) => x + y, 0) / rpes.length).toFixed(1) : null

  const head = [
    `🏃 Séance du ${formatDate(a.date)}${a.time ? ` à ${a.time}` : ''}${a.location ? ` – ${a.location}` : ''}`,
    s && `📋 ${s.title}`,
    a.note && `ℹ️ ${a.note}`,
  ].filter(Boolean).join('\n')
  const announcement = `${head}\n\nLe détail est dans l’app (ton lien perso). Après la séance, pense à donner ton ressenti 💬`

  const del = async () => {
    if (!confirm('Supprimer cette planification et les retours associés ?')) return
    await remove('assignments', a.id)
    nav('/planning')
  }

  return (
    <div>
      <BackLink to="/planning" label="Planning" />
      <DayNav items={sameDay} current={a.id} path={(id) => `/planning/${id}`} />
      <h1>{s?.title ?? 'Séance supprimée'}</h1>
      <p className="muted">
        {formatDate(a.date)}{a.time && ` · ${a.time}`}{a.location && ` · ${a.location}`}
      </p>
      <div className="row gap wrap">
        {g && <GroupBadge name={g.name} color={g.color} />}
        <span className="muted small">{targets.length} athlète(s)</span>
      </div>
      {a.note && <div className="alert info">{a.note}</div>}
      <div className="row gap wrap actions">
        <a className="btn whatsapp" href={whatsappUrl(announcement)} target="_blank" rel="noreferrer">📲 Annoncer sur WhatsApp</a>
        {typeof navigator.share === 'function' && <button className="btn" onClick={() => nativeShare(announcement)}>📤 Partager</button>}
        <button className="btn" onClick={() => setEditing(true)}>Modifier</button>
        {s && <Link className="btn" to={`/seances/${s.id}`}>Éditer la séance</Link>}
        <button className="btn danger ghost" onClick={del}>Supprimer</button>
      </div>

      <section>
        <h2>Retours {past && <span className="muted small">({fbs.length}/{targets.length}{avgRpe && ` · effort moyen ${avgRpe}/10`})</span>}</h2>
        {!past && fbs.length === 0 ? (
          <Empty>Les athlètes pourront donner leur retour à partir du jour de la séance.</Empty>
        ) : (
          <>
            <div className="card">
              <table className="table">
                <tbody>
                  {targets.map((t) => {
                    const f = fbs.find((x) => x.athlete_id === t.id)
                    return (
                      <tr key={t.id}>
                        <td><Link to={`/athletes/${t.id}`}>{fullName(t)}</Link></td>
                        <td>{f ? <FeedbackScores fb={f} /> : <span className="muted small">⏳ En attente</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="list">
              {fbs.filter((f) => f.comment || f.pain).map((f) => (
                <FeedbackCard key={f.id} fb={f} athlete={athletes.find((x) => x.id === f.athlete_id)} />
              ))}
            </div>
          </>
        )}
      </section>

      {s && (
        <section>
          <h2>Contenu de la séance</h2>
          <div className="card"><SessionView session={s} /></div>
        </section>
      )}

      {editing && <AssignmentForm initial={a} onClose={() => setEditing(false)} />}
    </div>
  )
}
