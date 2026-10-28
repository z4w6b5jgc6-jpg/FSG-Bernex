import {ExerciseResults} from '../components/AthleteMonitoring'
import { useState } from 'react'
import { BackLink } from '../components/BackLink'
import { Avatar } from '../components/Avatar'
import { DayNav } from '../components/DayNav'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { AssignmentForm } from '../components/AssignmentForm'
import { FeedbackCard, FeedbackScores } from '../components/FeedbackCard'
import { SessionView } from '../components/SessionView'
import { TargetTable } from '../components/TargetTable'
import { Thread } from '../components/Thread'
import { TrainingDesk } from '../components/TrainingDesk'
import { SessionNoteCard } from '../components/SessionNoteCard'
import { isReleased, releaseAt, releaseText } from '../lib/release'
import { Empty, GroupBadge, RECOVERY_TEXT } from '../components/ui'
import { athletesFor, formatDate, fullName, nativeShare, todayISO, whatsappUrl } from '../lib/utils'

export function AssignmentDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { assignments, sessions, groups, athletes, feedback, messages, remove, loading } = useData()
  const [editing, setEditing] = useState(false)
  const [writeTo, setWriteTo] = useState('')
  const [tab, setTab] = useState<'seance' | 'athletes' | 'retours' | null>(null)
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
    `Séance du ${formatDate(a.date)}${a.time ? ` à ${a.time}` : ''}${a.location ? ` – ${a.location}` : ''}`,
    s && `${s.title}`,
    a.note && `ℹ️ ${a.note}`,
  ].filter(Boolean).join('\n')
  const announcement = `${head}\n\nLe détail est dans l’app (ton lien perso). Après la séance, pense à donner ton ressenti`

  const del = async () => {
    if (!confirm('Supprimer cette planification et les retours associés ?')) return
    await remove('assignments', a.id)
    nav('/planning')
  }

  const released = isReleased(a)
  const at = releaseAt(a)
  const view = tab ?? (a.date < todayISO() ? 'retours' : 'seance')
  const answered = targets.filter((t) => fbs.some((f) => f.athlete_id === t.id)).length

  return (
    <div className="plan-detail">
      <BackLink to="/planning" label="Planning" />
      <DayNav items={sameDay} current={a.id} path={(id) => `/planning/${id}`} />
      <header className="plan-head">
        <h1>{s?.title ?? 'Séance supprimée'}</h1>
        <p className="muted">{formatDate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })}{a.time && ` · ${a.time}`}{a.location && ` · ${a.location}`}</p>
        <div className="row gap wrap">
          {g && <GroupBadge name={g.name} color={g.color} />}
          <span className="status grey">{targets.length} athlètes</span>
          <span className={`status ${released ? 'green' : 'grey'}`}>{released ? 'Visible' : `Visible ${at ? releaseText(at) : ''}`}</span>
        </div>
        <div className="row gap wrap actions">
          <a className="btn small whatsapp" href={whatsappUrl(announcement)} target="_blank" rel="noreferrer">WhatsApp</a>
          {typeof navigator.share === 'function' && <button className="btn small" onClick={() => nativeShare(announcement)}>Partager</button>}
          <button className="btn small" onClick={() => setEditing(true)}>Modifier</button>
          {s && <Link className="btn small" to={`/seances/${s.id}`}>Éditer le contenu</Link>}
        </div>
      </header>
      {a.note && <div className="alert info">{a.note}</div>}

      <div className="tabs plan-tabs" role="tablist">
        <button role="tab" aria-selected={view === 'seance'} className={view === 'seance' ? 'active' : ''} onClick={() => setTab('seance')}>Séance</button>
        <button role="tab" aria-selected={view === 'athletes'} className={view === 'athletes' ? 'active' : ''} onClick={() => setTab('athletes')}>Athlètes</button>
        <button role="tab" aria-selected={view === 'retours'} className={view === 'retours' ? 'active' : ''} onClick={() => setTab('retours')}>Retours {past && `${answered}/${targets.length}`}</button>
      </div>

      {view === 'seance' && <>
        {s && <div className="card"><SessionView session={s} /></div>}
        {!!s?.targets?.length && (
          <section>
            <h2 className="section-title">Temps à réaliser</h2>
            <TargetTable targets={s.targets} athletes={targets} />
          </section>
        )}
        {s && <SessionNoteCard key={s.id} sessionId={s.id} />}
      </>}

      {view === 'athletes' && <>
        {s && <TrainingDesk assignment={a} session={s} />}
        <ExerciseResults assignmentId={a.id} />
      </>}

      {view === 'retours' && <section>
        {avgRpe && <p className="small">Effort moyen <b>{avgRpe}/10</b></p>}
        {fbs.some((f) => f.recovery_fit != null) && (
          <p className="small">Récupérations : {[1, 2, 3].map((v) => ({ v, n: fbs.filter((f) => f.recovery_fit === v).length })).filter((x) => x.n)
            .map((x) => `${x.n} ${RECOVERY_TEXT[x.v].toLowerCase()}`).join(' · ')}</p>
        )}
        {!past && fbs.length === 0 ? (
          <Empty>Les retours arrivent à partir du jour de la séance.</Empty>
        ) : (
          <>
            <div className="rows">
              {targets.map((t) => {
                const f = fbs.find((x) => x.athlete_id === t.id)
                return (
                  <div key={t.id} className="row-item">
                    <Avatar a={t} size="sm" />
                    <span className="row-main"><Link to={`/athletes/${t.id}`}>{t.first_name} {t.last_name}</Link></span>
                    {f ? <FeedbackScores fb={f} /> : <span className="status grey">En attente</span>}
                  </div>
                )
              })}
            </div>
            <div className="list">
              {fbs.filter((f) => f.comment || f.pain || messages.some((m) => m.assignment_id === a.id && m.athlete_id === f.athlete_id)).map((f) => (
                <FeedbackCard key={f.id} fb={f} athlete={athletes.find((x) => x.id === f.athlete_id)} />
              ))}
            </div>
          </>
        )}
        {targets.filter((t) => !fbs.some((f) => f.athlete_id === t.id) && (t.id === writeTo || messages.some((m) => m.assignment_id === a.id && m.athlete_id === t.id))).map((t) => (
          <div key={t.id} className="card">
            <Link to={`/athletes/${t.id}`}><strong>{fullName(t)}</strong></Link>
            <Thread assignmentId={a.id} athleteId={t.id} coach athleteName={t.first_name} />
          </div>
        ))}
        {targets.length > 0 && (
          <select value="" onChange={(e) => setWriteTo(e.target.value)} aria-label="Écrire à un athlète">
            <option value="">Écrire à un athlète de la séance…</option>
            {targets.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}
          </select>
        )}
      </section>}

      <div className="row end actions"><button className="btn small danger ghost" onClick={del}>Supprimer la planification</button></div>
      {editing && <AssignmentForm initial={a} onClose={() => setEditing(false)} />}
    </div>
  )
}
