import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { SessionView } from '../components/SessionView'
import { FeedbackScores } from '../components/FeedbackCard'
import { FATIGUE_LABELS, FATIGUE_TEXT, MOOD_LABELS, MOOD_TEXT, RPE_LABELS, Scale } from '../components/ui'
import type { FeedbackInput, PortalAssignment, PortalData } from '../types'
import { errorMessage, formatDate, todayISO } from '../lib/utils'

function usePortal(token: string) {
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try {
      setData(await api.portal(token))
      setError(null)
    } catch {
      setError('Ce lien n’est pas valide. Demande un nouveau lien à ton entraîneur.')
    }
  }, [token])
  useEffect(() => { load() }, [load])
  return { data, error, reload: load }
}

function PortalShell({ children, name }: { children: ReactNode; name?: string }) {
  return (
    <div className="portal">
      <header className="topbar"><span className="brand">🏃 {name ? `Salut ${name} !` : 'Mes entraînements'}</span></header>
      <main className="container">{children}</main>
    </div>
  )
}

export function AthletePortal() {
  const { token = '' } = useParams()
  const { data, error } = usePortal(token)
  if (error) return <PortalShell><div className="alert warn">{error}</div></PortalShell>
  if (!data) return <PortalShell><p className="muted">Chargement…</p></PortalShell>

  const today = todayISO()
  const upcoming = data.assignments.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const past = data.assignments.filter((a) => a.date < today)
  const todo = data.assignments.filter((a) => a.date <= today && !a.feedback)

  const Item = ({ a }: { a: PortalAssignment }) => (
    <Link to={`/a/${token}/s/${a.id}`} className="card link-card">
      <div className="row between">
        <strong>{a.session.title}</strong>
        {a.feedback ? <span className="pill ok">✓ Retour envoyé</span> : a.date <= today ? <span className="pill warn">💬 Donne ton retour</span> : null}
      </div>
      <div className="muted small">
        {a.date === today ? "Aujourd'hui" : formatDate(a.date)}{a.time && ` · ${a.time}`}{a.location && ` · ${a.location}`}
      </div>
    </Link>
  )

  return (
    <PortalShell name={data.athlete.first_name}>
      {data.athlete.group_name && <p className="muted">Groupe {data.athlete.group_name}</p>}
      {todo.length > 0 && (
        <div className="alert info">Tu as {todo.length} séance(s) sans retour. Ton ressenti aide ton entraîneur à adapter les entraînements 💪</div>
      )}
      <section>
        <h2>À venir</h2>
        {upcoming.length === 0 ? <p className="muted">Pas de séance prévue pour l’instant.</p> : (
          <div className="list">{upcoming.map((a) => <Item key={a.id} a={a} />)}</div>
        )}
      </section>
      <section>
        <h2>Séances passées</h2>
        {past.length === 0 ? <p className="muted">Rien pour l’instant.</p> : (
          <div className="list">{past.map((a) => <Item key={a.id} a={a} />)}</div>
        )}
      </section>
      <p className="muted small center">Astuce : ajoute cette page à ton écran d’accueil pour la retrouver facilement.</p>
    </PortalShell>
  )
}

export function AthletePortalSession() {
  const { token = '', assignmentId } = useParams()
  const { data, error, reload } = usePortal(token)
  if (error) return <PortalShell><div className="alert warn">{error}</div></PortalShell>
  if (!data) return <PortalShell><p className="muted">Chargement…</p></PortalShell>
  const a = data.assignments.find((x) => x.id === assignmentId)
  if (!a) return <PortalShell><div className="alert warn">Séance introuvable.</div><Link to={`/a/${token}`}>← Mes séances</Link></PortalShell>
  const canGiveFeedback = a.date <= todayISO()

  return (
    <PortalShell name={data.athlete.first_name}>
      <Link to={`/a/${token}`} className="muted small">← Mes séances</Link>
      <h1>{a.session.title}</h1>
      <p className="muted">{formatDate(a.date)}{a.time && ` · ${a.time}`}{a.location && ` · ${a.location}`}</p>
      {a.note && <div className="alert info">{a.note}</div>}
      <div className="card"><SessionView session={a.session} /></div>

      <section>
        <h2>Mon retour</h2>
        {a.feedback?.coach_reply && (
          <div className="reply">💬 <strong>Message de ton entraîneur :</strong> {a.feedback.coach_reply}</div>
        )}
        {canGiveFeedback ? (
          <FeedbackForm token={token} assignment={a} onSaved={reload} />
        ) : (
          <p className="muted">Tu pourras donner ton ressenti le jour de la séance.</p>
        )}
      </section>
    </PortalShell>
  )
}

function FeedbackForm({ token, assignment, onSaved }: { token: string; assignment: PortalAssignment; onSaved: () => void }) {
  const fb = assignment.feedback
  const [editing, setEditing] = useState(!fb)
  const [f, setF] = useState<FeedbackInput>({
    completed: fb?.completed ?? true, rpe: fb?.rpe ?? null, fatigue: fb?.fatigue ?? null,
    mood: fb?.mood ?? null, pain: fb?.pain ?? '', comment: fb?.comment ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (p: Partial<FeedbackInput>) => setF({ ...f, ...p })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (f.completed && f.rpe == null) return setErr('Indique la difficulté de la séance.')
    setBusy(true)
    setErr(null)
    try {
      await api.submitFeedback(token, assignment.id, f)
      setEditing(false)
      onSaved()
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
        {fb.pain && <p className="small">🩹 {fb.pain}</p>}
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
          <button type="button" className={`scale-btn wide ${f.completed ? 'active' : ''}`} onClick={() => set({ completed: true })}>Oui ✅</button>
          <button type="button" className={`scale-btn wide ${!f.completed ? 'active' : ''}`} onClick={() => set({ completed: false })}>Non ❌</button>
        </div>
      </div>
      {f.completed && (
        <div className="field">
          <span className="field-label">C’était dur ? (1 = très facile, 10 = maximal)</span>
          <Scale min={1} max={10} value={f.rpe} onChange={(rpe) => set({ rpe })} labels={RPE_LABELS} />
          {f.rpe != null && <span className="hint">{RPE_LABELS[f.rpe]}</span>}
        </div>
      )}
      <div className="field">
        <span className="field-label">Ta forme / fatigue</span>
        <Scale min={1} max={5} value={f.fatigue} onChange={(fatigue) => set({ fatigue })} labels={FATIGUE_LABELS} />
        {f.fatigue != null && <span className="hint">{FATIGUE_TEXT[f.fatigue]}</span>}
      </div>
      <div className="field">
        <span className="field-label">Ton humeur / plaisir</span>
        <Scale min={1} max={5} value={f.mood} onChange={(mood) => set({ mood })} labels={MOOD_LABELS} />
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
