import { useState } from 'react'
import { api } from '../api'
import type { AiAdvice, AiSuggestion, Session, SessionItem } from '../types'
import { errorMessage } from '../lib/utils'
import { Modal } from './ui'

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
const LABELS: Record<string, string> = { sets: 'Séries', reps: 'Répét.', distance: 'Distance', duration: 'Durée', recovery: 'Récup', intensity: 'Intensité', notes: 'Consignes' }

/** Exercice visé par une suggestion (nom exact ou très proche) */
function target(s: Session, sug: AiSuggestion): { bid: string; it: SessionItem } | null {
  if (!sug.champ || !sug.exercice) return null
  const want = norm(sug.exercice)
  for (const b of s.blocks) {
    if (sug.bloc && norm(b.title) !== norm(sug.bloc) && s.blocks.some((x) => norm(x.title) === norm(sug.bloc))) continue
    const it = b.items.find((x) => norm(x.name) === want) ?? b.items.find((x) => want.length > 5 && (norm(x.name).includes(want) || want.includes(norm(x.name))))
    if (it) return { bid: b.id, it }
  }
  return null
}

/** Bouton « Améliorer cette séance » et propositions de l'IA, appliquées une par une */
export function AiAdvicePanel({ session, onApply }: { session: Session; onApply: (bid: string, iid: string, patch: Partial<SessionItem>) => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [advice, setAdvice] = useState<AiAdvice | null>(null)
  const [done, setDone] = useState<Set<number>>(new Set())

  const run = async () => {
    setOpen(true); setBusy(true); setErr(null); setAdvice(null); setDone(new Set())
    try {
      setAdvice(await api.improveSession(session))
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className="btn ai-btn" onClick={run} disabled={!session.blocks.some((b) => b.items.length)}>✨ Améliorer cette séance</button>
      {open && (
        <Modal title="✨ Suggestions pour la séance" onClose={() => setOpen(false)}>
          <p className="tiny muted">🔒 Seul le contenu de la séance (exercices, séries, distances, récupérations) est envoyé à l’IA de Cloudflare — aucun nom ni donnée d’athlète. Ce sont des propositions : à toi de juger.</p>
          {busy && <p className="muted">L’IA lit la séance… (quelques secondes)</p>}
          {err && <div className="alert warn">{err}</div>}
          {advice && (
            <div className="form">
              {advice.resume && <div className="card ai-resume">{advice.resume}</div>}
              {advice.suggestions.length === 0 && <p className="muted">Pas de suggestion particulière.</p>}
              {advice.suggestions.map((s, i) => {
                const t = target(session, s)
                return (
                  <div key={i} className={`card ai-sug ${done.has(i) ? 'done' : ''}`}>
                    {(s.bloc || s.exercice) && <div className="tiny muted">{[s.bloc, s.exercice].filter(Boolean).join(' › ')}</div>}
                    <div><b>{s.proposition}</b></div>
                    {s.pourquoi && <div className="small muted">{s.pourquoi}</div>}
                    {t && s.valeur && (
                      <div className="row between wrap">
                        <span className="small">{LABELS[s.champ]} : {t.it[s.champ as keyof SessionItem] || '—'} → <b>{s.valeur}</b></span>
                        <button className="btn small primary" disabled={done.has(i)} onClick={() => { onApply(t.bid, t.it.id, { [s.champ]: s.valeur }); setDone(new Set(done).add(i)) }}>
                          {done.has(i) ? '✓ Appliqué' : 'Appliquer'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              <p className="tiny muted">Les changements appliqués sont dans la séance : pense à <b>Enregistrer</b>.</p>
              <button className="btn" onClick={run} disabled={busy}>↻ Nouvelles suggestions</button>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
