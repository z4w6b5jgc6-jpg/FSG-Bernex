import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'
import { errorMessage } from '../lib/utils'

/** Activer / couper les notifications sur cet appareil (texte neutre, sans contenu) */
export function PushToggle({ coach = false }: { coach?: boolean }) {
  const [state, setState] = useState<PushState | null>(null)
  const [ready, setReady] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    pushState().then(setState).catch(() => setState('unsupported'))
    api.pushKey().then((k) => setReady(!!k)).catch(() => setReady(false))
  }, [])

  const run = async (fn: () => Promise<void>, done?: string) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      setState(await pushState())
      if (done) setMsg(done)
    } catch (e) {
      setMsg(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  if (state === null || api.mode === 'demo') return null

  return (
    <div className="card form push-toggle">
      <b>Notifications sur cet appareil</b>
      <p className="tiny muted">
        {coach ? 'Tu es prévenu·e quand un athlète t’écrit ou signale une douleur ou une forte fatigue.' : 'Tu es prévenu·e quand ton coach t’écrit.'}
        {' '}La notification ne contient aucun texte : le message se lit dans l’app.
      </p>
      {ready === false ? (
        coach ? <p className="small">Pas encore configurées sur le serveur. <Link to="/notifications">Configurer (5 min)</Link></p>
          : <p className="small muted">Pas encore disponibles : ton coach doit d’abord les activer.</p>
      ) : state === 'ios-home' ? (
        <p className="small">Sur iPhone / iPad, ajoute d’abord l’app à l’écran d’accueil (Safari → Partager → « Sur l’écran d’accueil »), puis ouvre-la depuis l’icône et reviens ici.</p>
      ) : state === 'unsupported' ? (
        <p className="small muted">Ce navigateur ne permet pas les notifications.</p>
      ) : state === 'denied' ? (
        <p className="small">Notifications bloquées : autorise-les dans les réglages du navigateur ou du téléphone, puis reviens ici.</p>
      ) : state === 'on' ? (
        <div className="row gap wrap">
          <span className="ok-text small">✓ Activées</span>
          <button className="btn small" disabled={busy} onClick={() => run(() => api.notify('test'), 'Notification de test envoyée.')}>Tester</button>
          <button className="btn small ghost" disabled={busy} onClick={() => run(disablePush)}>Désactiver</button>
        </div>
      ) : (
        <button className="btn primary small" disabled={busy || !ready} onClick={() => run(enablePush, 'C’est activé !')}>Activer les notifications</button>
      )}
      {msg && <p className="small">{msg}</p>}
    </div>
  )
}
