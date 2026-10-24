import { useState } from 'react'
import { useData } from '../lib/data'
import { noteOf, saveNote } from '../lib/notes'
import { errorMessage } from '../lib/utils'

/** Notes privées du coach sur une séance (remarques, athlètes à surveiller…) : jamais montrées aux athlètes */
export function SessionNoteCard({ sessionId }: { sessionId: string }) {
  const { session_notes, save } = useData()
  const saved = noteOf(session_notes, sessionId)?.text ?? ''
  const [text, setText] = useState(saved)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      await saveNote(save, session_notes, sessionId, text)
    } catch (e) {
      setErr(/session_notes|schema cache/i.test(errorMessage(e)) ? 'Il faut d’abord mettre la base à jour (#/base).' : errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card form">
      <b className="small">🔒 Remarques (visibles seulement par les coachs)</b>
      <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tests à faire, athlètes à surveiller, consignes pour Michèle…" />
      {text !== saved && <button className="btn small primary" disabled={busy} onClick={run}>{busy ? '…' : 'Enregistrer la remarque'}</button>}
      {err && <div className="alert warn small">{err}</div>}
    </div>
  )
}
