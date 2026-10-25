import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api'
import { hiddenLongEnough, lockEnabled, markHidden, unlock } from '../lib/lock'
import { Logo } from './Logo'

/** Connexion par Face ID / empreinte : si activée sur cet appareil, l'app s'ouvre sur cet écran au lieu du mot de passe */
export function AppLock({ email, children }: { email: string; children: ReactNode }) {
  const [locked, setLocked] = useState(() => lockEnabled(email))
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') markHidden()
      else if (lockEnabled(email) && hiddenLongEnough()) setLocked(true)
    }
    const lockNow = () => setLocked(true)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('athle-lock-now', lockNow)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('athle-lock-now', lockNow)
    }
  }, [email])

  const signIn = async () => {
    setFailed(false)
    setBusy(true)
    const ok = await unlock()
    setBusy(false)
    if (ok) setLocked(false)
    else setFailed(true)
  }

  if (!locked) return <>{children}</>
  return (
    <div className="login">
      <div className="login-hero">
        <Logo kind="club" className="club-logo" />
        <div className="stripes" />
        <h1>Coach Athlé</h1>
      </div>
      <div className="card login-card">
        <p className="small muted center">{email}</p>
        <button className="btn primary block" disabled={busy} onClick={signIn}>Se connecter avec Face ID / empreinte</button>
        {failed && <div className="alert warn small">Non reconnu. Réessaie, ou utilise ton mot de passe.</div>}
        <button className="link small center" onClick={() => api.signOut()}>Utiliser mon mot de passe ou un autre compte</button>
      </div>
    </div>
  )
}
