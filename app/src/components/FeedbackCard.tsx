import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Athlete, Feedback } from '../types'
import { useData } from '../lib/data'
import { errorMessage, fullName } from '../lib/utils'
import { FATIGUE_LABELS, FATIGUE_TEXT, MOOD_LABELS, MOOD_TEXT, RPE_LABELS, rpeClass } from './ui'

export function FeedbackScores({ fb }: { fb: Pick<Feedback, 'completed' | 'rpe' | 'fatigue' | 'mood'> }) {
  return (
    <div className="scores">
      {!fb.completed && <span className="pill danger">Séance non faite</span>}
      {fb.rpe != null && <span className={`pill ${rpeClass(fb.rpe)}`} title={RPE_LABELS[fb.rpe]}>Effort {fb.rpe}/10</span>}
      {fb.fatigue != null && <span className={`pill ${fb.fatigue >= 4 ? 'warn' : ''}`}>{FATIGUE_LABELS[fb.fatigue]} {FATIGUE_TEXT[fb.fatigue]}</span>}
      {fb.mood != null && <span className="pill">{MOOD_LABELS[fb.mood]} {MOOD_TEXT[fb.mood]}</span>}
    </div>
  )
}

export function FeedbackCard({ fb, athlete, subtitle }: { fb: Feedback; athlete?: Athlete; subtitle?: ReactNode }) {
  const { save } = useData()
  const [reply, setReply] = useState(fb.coach_reply)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  const sendReply = async () => {
    setBusy(true)
    try {
      await save('feedback', { id: fb.id, coach_reply: reply })
      setEditing(false)
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card feedback-card">
      <div className="row between">
        <div>
          {athlete ? <Link to={`/athletes/${athlete.id}`}><strong>{fullName(athlete)}</strong></Link> : <strong>Athlète supprimé</strong>}
          {subtitle && <div className="muted small">{subtitle}</div>}
        </div>
        <span className="muted small">{new Date(fb.updated_at).toLocaleDateString('fr-CH')}</span>
      </div>
      <FeedbackScores fb={fb} />
      {fb.pain && <div className="alert warn small">🩹 Douleur : {fb.pain}</div>}
      {fb.comment && <p className="comment">« {fb.comment} »</p>}
      {editing ? (
        <div className="reply-form">
          <textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Réponse visible par l’athlète…" />
          <div className="row gap">
            <button className="btn primary small" onClick={sendReply} disabled={busy}>Envoyer</button>
            <button className="btn ghost small" onClick={() => { setEditing(false); setReply(fb.coach_reply) }}>Annuler</button>
          </div>
        </div>
      ) : fb.coach_reply ? (
        <div className="reply">
          <strong>Ta réponse :</strong> {fb.coach_reply}{' '}
          <button className="link" onClick={() => setEditing(true)}>modifier</button>
        </div>
      ) : (
        <button className="btn ghost small" onClick={() => setEditing(true)}>💬 Répondre</button>
      )}
    </div>
  )
}
