import { isReleased, releaseAt, releaseText } from '../../lib/release'
import { useEffect, useState, type FormEvent } from 'react'
import { BackLink } from '../../components/BackLink'
import { TrainingInfo } from '../../components/TrainingInfo'
import { Link, useParams } from 'react-router-dom'
import { useData, useMyAthlete } from '../../lib/data'
import { WorkoutTracker } from '../../components/WorkoutTracker'
import { MyTargets } from '../../components/TargetTable'
import { Thread } from '../../components/Thread'
import { api } from '../../api'
import { feedbackWorthNotice } from '../../lib/messages'
import { FeedbackScores } from '../../components/FeedbackCard'
import { Empty, Field, FATIGUE_TEXT, MOOD_TEXT, RECOVERY_TEXT, RPE_LABELS, Scale } from '../../components/ui'
import type { Assignment, Feedback } from '../../types'
import { myAssignments } from '../../lib/athlete'
import { errorMessage, formatDate, todayISO } from '../../lib/utils'

export function AthleteSessions() {
  const me = useMyAthlete()
  const { assignments, sessions, feedback } = useData()
  if (!me) return null
  const today = todayISO()
  const mine = myAssignments(assignments, me)
  const upcoming = mine.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const past = mine.filter((a) => a.date < today).sort((a, b) => b.date.localeCompare(a.date))

  const Item = ({ a }: { a: Assignment }) => {
    const f = feedback.find((x) => x.assignment_id === a.id)
    return (
      <Link to={`/seances/${a.id}`} className="card link-card">
        <div className="row between">
          <strong>{sessions.find((s) => s.id === a.session_id)?.title ?? 'Séance'}</strong>
          {f ? <span className="pill ok">✓</span> : a.date <= today ? <span className="pill warn">Retour</span> : null}
        </div>
        <div className="muted small">
          {a.date === today ? "Aujourd'hui" : formatDate(a.date)}{a.time && ` · ${a.time}`}{a.location && ` · ${a.location}`}
        </div>
      </Link>
    )
  }

  return (
    <div>
      <h1>Mes séances</h1>
      <TrainingInfo />
      <section>
        <h2>À venir</h2>
        {upcoming.length === 0 ? <Empty>Pas de séance prévue pour l’instant.</Empty> : <div className="list">{upcoming.map((a) => <Item key={a.id} a={a} />)}</div>}
      </section>
      <section>
        <h2>Passées</h2>
        {past.length === 0 ? <p className="muted">Rien pour l’instant.</p> : <div className="list">{past.map((a) => <Item key={a.id} a={a} />)}</div>}
      </section>
    </div>
  )
}

const nowMs = () => Date.now()

export function AthleteSessionDetail() {
  const { id } = useParams()
  const me = useMyAthlete()
  const { assignments, sessions, session_adjustments, feedback, loading } = useData()
  const a = assignments.find((x) => x.id === id)
  const common = a && sessions.find((x) => x.id === a.session_id)
  const adjustment = a && me && session_adjustments.find((x) => x.assignment_id === a.id && x.athlete_id === me.id)
  const s = a && common && isReleased(a) ? { ...common, ...adjustment?.content } : undefined
  const { reload } = useData()
  // contenu pas encore visible (règle du groupe) : on recharge tout seul à l'heure prévue
  const at = a && !s ? releaseAt(a) : null
  const atMs = at ? at.getTime() : 0
  useEffect(() => {
    if (!atMs) return
    const ms = atMs - nowMs()
    if (ms > 6 * 3600e3) return
    const t = setTimeout(() => reload(), Math.max(ms, 0) + 3000)
    return () => clearTimeout(t)
  }, [atMs, reload])
  if (!me || !a) return loading ? <p className="muted">Chargement…</p> : <Empty>Séance introuvable. <Link to="/seances">Retour</Link></Empty>
  const fb = feedback.find((f) => f.assignment_id === a.id)
  // Les « Remarques » du plan sont des notes de coach (elles citent parfois d'autres athlètes) : pas affichées ici

  return (
    <div className="athlete-session-workspace">
      <BackLink to="/seances" label="Mes séances" />
      <div className="athlete-workout-heading"><p className="eyebrow">MON PROGRAMME · ATHLÉTISME</p><h1>{s?.title ?? 'Séance'}</h1>{s?.duration_min!=null&&<span className="pill">{s.duration_min} min prévues</span>}</div>
      <p className="muted">{formatDate(a.date)}{a.time && ` · ${a.time}`}{a.location && ` · ${a.location}`}</p>
      {s && a.note && <div className="alert info">{a.note}</div>}
      {s ? (
        <>
          {adjustment && <div className="alert info"><b>Ton programme a été adapté par ton coach.</b><p>{adjustment.rationale}</p></div>}
          {!!s.targets?.length && <MyTargets targets={s.targets} athleteId={me.id} />}
          <WorkoutTracker session={s} assignmentId={a.id} athleteId={me.id} />
        </>
      ) : (
        <div className="card content-locked">
          <b>Le contenu de la séance sera visible {at ? releaseText(at) : 'bientôt'}.</b>
          <p className="small muted">Ton coach le dévoile juste avant l’entraînement. En attendant, tu peux lui écrire ci-dessous.</p>
          <button className="btn small" onClick={() => reload()}>Actualiser</button>
        </div>
      )}
      <section id="workout-feedback" className="workout-feedback">
        <p className="eyebrow">APRÈS L’EFFORT</p><h2>Mon retour</h2>
        {a.date <= todayISO() ? (
          <FeedbackForm key={fb?.id ?? 'new'} athleteId={me.id} assignmentId={a.id} fb={fb} />
        ) : (
          <p className="muted">Tu pourras donner ton ressenti le jour de la séance.</p>
        )}
      </section>
      <section>
        <h2>Échanger avec ton coach</h2>
        <div className="card"><Thread assignmentId={a.id} athleteId={me.id} fb={fb} coach={false} /></div>
      </section>
    </div>
  )
}

function FeedbackForm({ athleteId, assignmentId, fb }: { athleteId: string; assignmentId: string; fb?: Feedback }) {
  const { save } = useData()
  const [editing, setEditing] = useState(!fb)
  const [f, setF] = useState({
    completed: fb?.completed ?? true, rpe: fb?.rpe ?? null, fatigue: fb?.fatigue ?? null,
    duration_min: fb?.duration_min ?? null, mood: fb?.mood ?? null, recovery_fit: fb?.recovery_fit ?? null, pain: fb?.pain ?? '', comment: fb?.comment ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (f.duration_min != null && (!Number.isFinite(f.duration_min) || f.duration_min < 0 || f.duration_min > 600)) return setErr('La durée doit être comprise entre 0 et 600 minutes.')
    if (f.completed && f.rpe == null) return setErr('Indique la difficulté de la séance.')
    setBusy(true)
    setErr(null)
    try {
      const row = { ...f, id: fb?.id, assignment_id: assignmentId, athlete_id: athleteId }
      // base pas encore mise à jour (#/base) : le retour part quand même, sans la question sur la récup
      const saved = await save('feedback', row).catch((e2) => {
        if (/recovery_fit/.test(errorMessage(e2))) { const { recovery_fit: _r, ...rest } = row; void _r; return save('feedback', rest) }
        throw e2
      })
      // le coach est prévenu s'il y a un commentaire, une douleur, une forte fatigue ou un gros effort
      if (feedbackWorthNotice(f)) api.notify('feedback', saved.id)
      setEditing(false)
    } catch (e2) {
      setErr(errorMessage(e2))
    } finally {
      setBusy(false)
    }
  }

  if (!editing && fb) {
    return (
      <div className="card">
        <p className="ok-text">✓ Merci, ton retour a bien été envoyé !</p>
        <FeedbackScores fb={fb} />
        {fb.pain && <p className="small">{fb.pain}</p>}
        {fb.comment && <p className="comment">« {fb.comment} »</p>}
        <button className="btn small" onClick={() => setEditing(true)}>Modifier mon retour</button>
      </div>
    )
  }

  return (
    <form className="card form" onSubmit={submit}>
      <div className="field">
        <span className="field-label">As-tu fait la séance ?</span>
        <div className="scale">
          <button type="button" className={`scale-btn wide ${f.completed ? 'active' : ''}`} onClick={() => set({ completed: true })}>Oui</button>
          <button type="button" className={`scale-btn wide ${!f.completed ? 'active' : ''}`} onClick={() => set({ completed: false })}>Non</button>
        </div>
      </div>
      {f.completed && <Field label="Durée réellement effectuée (minutes)" hint="Inclure l’échauffement et le retour au calme. Laisser vide si inconnue."><input type="number" min="0" max="600" value={f.duration_min??''} onChange={e=>set({duration_min:e.target.value===''?null:Number(e.target.value)})}/></Field>}
      {f.completed && (
        <div className="field">
          <span className="field-label">C’était dur ? (1 = très facile, 10 = maximal)</span>
          <Scale min={1} max={10} value={f.rpe} onChange={(rpe) => set({ rpe })} labels={RPE_LABELS} />
          {f.rpe != null && <span className="hint">{RPE_LABELS[f.rpe]}</span>}
        </div>
      )}
      <div className="field">
        <span className="field-label">Ta forme après la séance (1 = pleine forme, 5 = épuisé·e)</span>
        <Scale min={1} max={5} value={f.fatigue} onChange={(fatigue) => set({ fatigue })} labels={FATIGUE_TEXT} />
        {f.fatigue != null && <span className="hint">{FATIGUE_TEXT[f.fatigue]}</span>}
      </div>

      {f.completed && (
        <div className="field">
          <span className="field-label">Les temps de récupération étaient…</span>
          <div className="scale">
            {[1, 2, 3].map((v) => (
              <button key={v} type="button" className={`scale-btn wide ${f.recovery_fit === v ? 'active' : ''}`} onClick={() => set({ recovery_fit: f.recovery_fit === v ? null : v })}>
                {RECOVERY_TEXT[v]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="field">
        <span className="field-label">Ton plaisir (1 = pas bien, 5 = super)</span>
        <Scale min={1} max={5} value={f.mood} onChange={(mood) => set({ mood })} labels={MOOD_TEXT} />
        {f.mood != null && <span className="hint">{MOOD_TEXT[f.mood]}</span>}
      </div>
      <label className="field">
        <span className="field-label">As-tu mal quelque part ? (facultatif)</span>
        <input value={f.pain} onChange={(e) => set({ pain: e.target.value })} placeholder="Ex. un peu mal au genou gauche" />
      </label>
      <label className="field">
        <span className="field-label">Ton commentaire (facultatif)</span>
        <textarea rows={3} value={f.comment} onChange={(e) => set({ comment: e.target.value })}
          placeholder={f.completed ? 'Ce qui était bien, ce qui était difficile…' : 'Pourquoi tu n’as pas pu venir ?'} />
      </label>
      {err && <div className="alert warn">{err}</div>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer mon retour'}</button>
    </form>
  )
}
