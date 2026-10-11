import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import { useData } from '../lib/data'
import type { CoachInvite } from '../types'
import { errorMessage, whatsappUrl } from '../lib/utils'

const appUrl = () => window.location.href.split('#')[0]

/** Entraîneurs du club : l'entraîneur principal ajoute ses collègues par email, ils ont les mêmes droits */
export function CoachesCard() {
  const { me } = useData()
  const [coaches, setCoaches] = useState<CoachInvite[] | null>(null)
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState<string | null>(null)
  const owner = me?.is_owner !== false

  const load = useCallback(() => {
    api.listCoaches().then(setCoaches).catch((e) => setErr(errorMessage(e)))
  }, [])
  useEffect(load, [load])

  const message = (to: string) =>
    `👋 Je t’ai ajouté·e comme entraîneur sur l’app du club ${me?.club_name ?? ''}.\n\n` +
    `1. Ouvre ${appUrl()}\n2. Touche « Créer un compte » avec l’adresse ${to}\n3. Confirme ton email, puis connecte-toi\n\n` +
    `Tu auras accès à tout : séances, planning, athlètes, tests.`

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setErr('Adresse email invalide.')
    if (v === me?.email.toLowerCase()) return setErr('C’est ton adresse : tu es déjà entraîneur.')
    setBusy(true)
    setErr(null)
    try {
      await api.addCoach(v)
      setEmail('')
      setAdded(v)
      load()
    } catch (e2) {
      setErr(errorMessage(e2))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (c: CoachInvite) => {
    if (!confirm(`Retirer ${c.email} des entraîneurs ? Ce compte n’aura plus accès au club.`)) return
    try {
      await api.removeCoach(c.email)
      load()
    } catch (e) {
      setErr(errorMessage(e))
    }
  }

  return (
    <details className="card form coaches">
      <summary><b>👥 Entraîneurs du club</b> <span className="muted small">{coaches ? `${coaches.length + 1}` : ''}</span></summary>
      <p className="small muted">Les entraîneurs ajoutés ici ont les mêmes accès que toi : séances, planning, athlètes, tests et retours.</p>
      <ul className="plain rows">
        <li className="row between">
          <span>{owner ? <><b>Toi</b> <span className="muted small">· {me?.email}</span></> : <span className="muted small">Entraîneur principal</span>}</span>
          <span className="tiny muted">principal</span>
        </li>
        {coaches?.map((c) => (
          <li key={c.email} className="row between">
            <span>{c.email === me?.email.toLowerCase() ? <><b>Toi</b> <span className="muted small">· {c.email}</span></> : c.email}</span>
            <span className="row gap">
              <span className="tiny muted">{c.linked ? '✅ connecté' : '⏳ pas encore connecté'}</span>
              {owner && !c.linked && <a className="btn ghost small" href={whatsappUrl(message(c.email))} target="_blank" rel="noreferrer">📲</a>}
              {owner && <button className="btn ghost icon small danger" aria-label="Retirer" onClick={() => remove(c)}>✕</button>}
            </span>
          </li>
        ))}
      </ul>
      {owner && (
        <form className="row gap" onSubmit={add}>
          <input type="email" inputMode="email" autoCapitalize="none" placeholder="email de l’autre entraîneur" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn primary" disabled={busy || !email.trim()}>Ajouter</button>
        </form>
      )}
      {added && (
        <div className="alert info small form">
          <span>✅ <b>{added}</b> est ajouté. Envoie-lui les instructions :</span>
          <a className="btn whatsapp" href={whatsappUrl(message(added))} target="_blank" rel="noreferrer" onClick={() => setAdded(null)}>📲 Envoyer par WhatsApp</a>
        </div>
      )}
      {owner && <p className="tiny muted">Il crée ensuite son compte avec <b>cette adresse</b> et arrive directement dans le club.</p>}
      {err && <div className="alert warn small">{err}</div>}
    </details>
  )
}
