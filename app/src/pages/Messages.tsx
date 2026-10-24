import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FeedbackScores } from '../components/FeedbackCard'
import { PushToggle } from '../components/PushToggle'
import { Thread } from '../components/Thread'
import { Empty } from '../components/ui'
import { useData, useMyAthlete } from '../lib/data'
import { feedbackToAnswer, threadKey } from '../lib/messages'
import { formatShort, fullName } from '../lib/utils'

interface Conv { key: string; assignmentId: string; athleteId: string; last: string; unread: number; toAnswer: boolean; preview: string }

/** Discussions de séance : pour le coach (tous les athlètes) ou pour l'athlète (avec ses coachs) */
export function Messages({ coach }: { coach: boolean }) {
  const { messages, feedback, assignments, sessions, athletes } = useData()
  const me = useMyAthlete()
  const [open, setOpen] = useState<string | null>(null)

  const convs = useMemo(() => {
    const map = new Map<string, Conv>()
    const get = (assignmentId: string, athleteId: string) => {
      const key = threadKey(assignmentId, athleteId)
      if (!map.has(key)) map.set(key, { key, assignmentId, athleteId, last: '', unread: 0, toAnswer: false, preview: '' })
      return map.get(key)!
    }
    for (const f of feedback.filter((x) => x.comment || x.pain)) {
      const c = get(f.assignment_id, f.athlete_id)
      if (f.updated_at > c.last) { c.last = f.updated_at; c.preview = f.pain ? `🩹 ${f.pain}` : f.comment }
    }
    for (const m of messages) {
      const c = get(m.assignment_id, m.athlete_id)
      if (m.created_at > c.last) { c.last = m.created_at; c.preview = m.body }
      if (m.from_coach !== coach && !m.read_at) c.unread++
    }
    if (coach) for (const f of feedbackToAnswer(feedback, messages)) get(f.assignment_id, f.athlete_id).toAnswer = true
    return [...map.values()]
      .filter((c) => assignments.some((a) => a.id === c.assignmentId) && (coach || c.athleteId === me?.id))
      .sort((a, b) => Number(b.unread > 0 || b.toAnswer) - Number(a.unread > 0 || a.toAnswer) || b.last.localeCompare(a.last))
      .slice(0, 60)
  }, [messages, feedback, assignments, coach, me?.id])

  const todo = convs.filter((c) => c.unread || c.toAnswer).length
  return (
    <div>
      <h1>💬 Messages {coach && todo > 0 && <span className="pill warn">{todo} à traiter</span>}</h1>
      <PushToggle coach={coach} />
      {convs.length === 0 ? (
        <Empty>{coach ? 'Pas encore de message. Les retours des athlètes avec un commentaire apparaissent ici.' : 'Pas encore de message. Tu peux écrire à ton coach depuis chaque séance.'}</Empty>
      ) : (
        <div className="list">
          {convs.map((c) => {
            const a = assignments.find((x) => x.id === c.assignmentId)!
            const s = sessions.find((x) => x.id === a.session_id)
            const ath = athletes.find((x) => x.id === c.athleteId)
            const fb = feedback.find((f) => f.assignment_id === c.assignmentId && f.athlete_id === c.athleteId)
            const isOpen = open === c.key
            return (
              <div key={c.key} className={`card conv ${c.unread || c.toAnswer ? 'conv-new' : ''}`}>
                <button className="conv-head" onClick={() => setOpen(isOpen ? null : c.key)} aria-expanded={isOpen}>
                  <span>
                    <b>{coach ? (ath ? fullName(ath) : 'Athlète') : s?.title ?? 'Séance'}</b>
                    <span className="tiny muted"> · {coach ? `${s?.title ?? 'Séance'} · ` : ''}{formatShort(a.date)}</span>
                  </span>
                  {c.unread > 0 ? <span className="pill warn">{c.unread} nouveau{c.unread > 1 ? 'x' : ''}</span> : c.toAnswer ? <span className="pill">à répondre</span> : null}
                </button>
                {!isOpen && <div className="small muted conv-preview">{c.preview}</div>}
                {isOpen && (
                  <>
                    {coach && fb && <FeedbackScores fb={fb} />}
                    {coach && fb?.pain && <div className="alert warn small">🩹 Douleur : {fb.pain}</div>}
                    <Thread assignmentId={c.assignmentId} athleteId={c.athleteId} fb={fb} coach={coach} athleteName={ath?.first_name} />
                    <Link className="tiny" to={coach ? `/planning/${a.id}` : `/seances/${a.id}`}>Voir la séance →</Link>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
