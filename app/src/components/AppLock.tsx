import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api'
import { hiddenLongEnough, lockEnabled, markHidden, unlock } from '../lib/lock'
import { Logo } from './Logo'

/** Écran de verrouillage : l'app ne s'affiche qu'après Face ID / empreinte, si l'utilisateur l'a activé */
export function AppLock({ email, children }: { email: string; children: ReactNode }) {
  const [locked, setLocked] = useState(() => lockEnabled(email))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') markHidden()
      else if (lockEnabled(email) && hiddenLongEnough()) setLocked(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [email])

  const tryUnlock = async () => {
    setFailed(false)
    if (await unlock()) setLocked(false)
    else setFailed(true)
  }

  if (!locked) return <>{children}</>
  return (
    <div className="login lock-screen">
      <Logo kind="club" className="club-logo" />
      <p className="muted">L’app est verrouillée.</p>
      <button className="btn primary block" onClick={tryUnlock}>Déverrouiller (Face ID / empreinte)</button>
      {failed && <div className="alert warn small">Non reconnu. Réessaie, ou déconnecte-toi et reconnecte-toi avec ton mot de passe.</div>}
      <button className="link small center" onClick={() => api.signOut()}>Se déconnecter</button>
    </div>
  )
}
