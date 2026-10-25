import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useData } from '../lib/data'
import { Field } from '../components/ui'
import { clearPendingCoach, savePendingCoach } from '../lib/pwa'
import { errorMessage } from '../lib/utils'

/** Invitation d'un entraîneur : #/entraineur/<jeton> (lien envoyé par WhatsApp, usage unique) */
export function CoachJoin() {
  const { token = '' } = useParams()
  const { me, refreshMe } = useData()
  const [club, setClub] = useState<{ name: string } | null | undefined>(undefined)
  const [hasAccount, setHasAccount] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'warn' | 'info'; text: string } | null>(null)

  useEffect(() => {
    api.coachInviteInfo(token).then(setClub).catch(() => setClub(null))
  }, [token])

  if (me?.role === 'coach' && club !== undefined && !busy) return <Navigate to="/" replace />
  const loggedIn = me?.role === 'new'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (!loggedIn) {
        if (hasAccount) {
          await api.signIn(email, password)
        } else {
          savePendingCoach(token)
          const ok = await api.signUp(email, password)
          if (!ok) {
            setMsg({ kind: 'info', text: 'Presque fini ! Ouvre l’email de confirmation qu’on vient de t’envoyer, puis connecte-toi : tu arriveras directement dans le club.' })
            return
          }
        }
      }
      await api.acceptCoachInvite(token)
      clearPendingCoach()
      await refreshMe()
    } catch (err) {
      setMsg({ kind: 'warn', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  if (club === undefined) return <div className="login"><p className="muted">Chargement…</p></div>
  if (club === null) {
    return (
      <div className="login">
        <div className="card login-card">
          <h2>Lien plus valable</h2>
          <p>Ce lien d’invitation a déjà été utilisé ou a expiré (14 jours). Demande un nouveau lien à l’entraîneur qui te l’a envoyé.</p>
          <Link className="btn block" to="/">Aller à la connexion</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="login">
      <div className="login-hero">
        <picture>
          <source srcSet="logo-club-dark.png" media="(prefers-color-scheme: dark)" />
          <img src="logo-club.png" alt="FSG Bernex-Confignon" className="club-logo" />
        </picture>
        <h1>Deviens entraîneur de <span className="nowrap">{club.name}</span></h1>
        <p className="muted">Tu auras accès aux séances, au planning, aux athlètes et à leurs retours.</p>
      </div>
      <form className="card login-card form" onSubmit={submit}>
        {loggedIn ? (
          <p className="small">Connecté avec <b>{me?.email}</b>.</p>
        ) : (
          <>
            <div className="tabs">
              <button type="button" className={!hasAccount ? 'active' : ''} onClick={() => setHasAccount(false)}>Nouveau compte</button>
              <button type="button" className={hasAccount ? 'active' : ''} onClick={() => setHasAccount(true)}>J’ai déjà un compte</button>
            </div>
            <Field label="Email"><input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required={api.mode !== 'demo'} /></Field>
            <Field label="Mot de passe" hint={hasAccount ? undefined : '6 caractères minimum'}>
              <input type="password" autoComplete={hasAccount ? 'current-password' : 'new-password'} minLength={api.mode === 'demo' ? 0 : 6}
                value={password} onChange={(e) => setPassword(e.target.value)} required={api.mode !== 'demo'} />
            </Field>
          </>
        )}
        {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? '…' : 'Rejoindre comme entraîneur'}</button>
      </form>
    </div>
  )
}
