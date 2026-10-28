import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Athlete, Feedback } from '../types'
import { useData } from '../lib/data'
import { fullName } from '../lib/utils'
import { threadOf, unreadByCoach } from '../lib/messages'
import { actualLoad } from '../lib/season'
import { Thread } from './Thread'
import { FATIGUE_TEXT, MOOD_TEXT, RECOVERY_TEXT, RPE_LABELS, rpeClass } from './ui'

export function FeedbackScores({ fb }: { fb: Pick<Feedback, 'completed' | 'rpe' | 'fatigue' | 'mood' | 'recovery_fit' | 'duration_min'> }) {
  return (
    <div className="scores">
      {!fb.completed && <span className="pill danger">Séance non faite</span>}
      {fb.duration_min != null && <span className="pill">{fb.duration_min} min réalisées</span>}
      {fb.completed && actualLoad(fb) != null && <span className="pill">Charge {actualLoad(fb)} UA</span>}
      {fb.rpe != null && <span className={`pill ${rpeClass(fb.rpe)}`} title={RPE_LABELS[fb.rpe]}>Effort {fb.rpe}/10</span>}
      {fb.fatigue != null && <span className={`pill ${fb.fatigue >= 4 ? 'warn' : ''}`}>Forme : {FATIGUE_TEXT[fb.fatigue].toLowerCase()}</span>}
      {fb.mood != null && <span className="pill">Plaisir : {MOOD_TEXT[fb.mood].toLowerCase()}</span>}
      {fb.recovery_fit != null && <span className={`pill ${fb.recovery_fit !== 2 ? 'warn' : ''}`}>Récup {RECOVERY_TEXT[fb.recovery_fit].toLowerCase()}</span>}
    </div>
  )
}

export function FeedbackCard({ fb, athlete, subtitle }: { fb: Feedback; athlete?: Athlete; subtitle?: ReactNode }) {
  const { messages } = useData()
  const [open, setOpen] = useState(false)
  const n = threadOf(messages, fb.assignment_id, fb.athlete_id).length + (fb.coach_reply ? 1 : 0)
  const unread = unreadByCoach(threadOf(messages, fb.assignment_id, fb.athlete_id)).length
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
      {fb.pain && <div className="alert warn small">Douleur : {fb.pain}</div>}
      {open ? (
        <Thread assignmentId={fb.assignment_id} athleteId={fb.athlete_id} fb={fb} coach athleteName={athlete?.first_name} />
      ) : (
        <>
          {fb.comment && <p className="comment">« {fb.comment} »</p>}
          <button className="btn ghost small" onClick={() => setOpen(true)}>
            {n ? `Discussion (${n})` : 'Répondre'}{unread > 0 && <span className="pill warn">{unread} nouveau{unread > 1 ? 'x' : ''}</span>}
          </button>
        </>
      )}
    </div>
  )
}
