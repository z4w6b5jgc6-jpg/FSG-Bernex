import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useData } from '../lib/data'
import { threadOf } from '../lib/messages'
import type { Feedback } from '../types'
import { errorMessage } from '../lib/utils'

const nowISO = () => new Date().toISOString()
const when = (iso: string) => new Date(iso).toLocaleString('fr-CH', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/**
 * Fil de discussion d'une séance entre un athlète et ses coachs.
 * Le retour de l'athlète (commentaire) et l'ancienne réponse du coach ouvrent le fil.
 */
export function Thread({ assignmentId, athleteId, fb, coach, athleteName }: {
  assignmentId: string; athleteId: string; fb?: Feedback; coach: boolean; athleteName?: string
}) {
  const { messages, save } = useData()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const list = threadOf(messages, assignmentId, athleteId)
  const end = useRef<HTMLDivElement>(null)

  // Messages reçus : marqués comme lus à l'ouverture du fil
  const unread = list.filter((m) => m.from_coach !== coach && !m.read_at).map((m) => m.id).join(',')
  useEffect(() => {
    if (!unread) return
    const now = nowISO()
    for (const id of unread.split(',')) save('messages', { id, read_at: now }).catch(() => {})
  }, [unread, save])

  const send = async () => {
    const body = text.trim()
    if (!body) return
    setBusy(true)
    setErr(null)
    try {
      const m = await save('messages', { assignment_id: assignmentId, athlete_id: athleteId, body })
      setText('')
      api.notify('message', m.id)
      setTimeout(() => end.current?.scrollIntoView({ block: 'nearest' }), 50)
    } catch (e) {
      setErr(/messages|schema cache/i.test(errorMessage(e)) ? 'La messagerie n’est pas encore activée : il faut mettre la base à jour (#/base).' : errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const other = coach ? athleteName ?? 'Athlète' : 'Coach'
  return (
    <div className="thread">
      {fb?.comment && (
        <div className={`bubble ${coach ? 'in' : 'out'}`}>
          <span className="bubble-meta">{coach ? other : 'Moi'} · retour de séance</span>
          {fb.comment}
        </div>
      )}
      {fb?.coach_reply && (
        <div className={`bubble ${coach ? 'out' : 'in'}`}>
          <span className="bubble-meta">{coach ? 'Toi' : 'Coach'}</span>
          {fb.coach_reply}
        </div>
      )}
      {list.map((m) => {
        const mine = m.from_coach === coach
        return (
          <div key={m.id} className={`bubble ${mine ? 'out' : 'in'}`}>
            <span className="bubble-meta">
              {m.from_coach ? (coach && mine ? `${m.author || 'Coach'} (coach)` : m.author || 'Coach') : coach ? other : 'Moi'} · {when(m.created_at)}
              {mine && m.read_at && ' · lu ✓'}
            </span>
            {m.body}
          </div>
        )
      })}
      <div ref={end} />
      <div className="thread-form">
        <textarea rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={coach ? `Écrire à ${other}…` : 'Écrire à ton coach…'} />
        <button className="btn primary" disabled={busy || !text.trim()} onClick={send}>{busy ? '…' : 'Envoyer'}</button>
      </div>
      {err && <div className="alert warn small">{err}</div>}
    </div>
  )
}
