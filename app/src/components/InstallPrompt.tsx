import { useEffect, useState } from 'react'
import { canPromptInstall, isIOS, isStandalone, onInstallAvailabilityChange, promptInstall } from '../lib/pwa'

const DISMISS_KEY = 'athle-install-dismissed'

export function InstallPrompt({ who }: { who: 'coach' | 'athlete' }) {
  const [, force] = useState(0)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY + who) === '1' } catch { return false }
  })
  useEffect(() => onInstallAvailabilityChange(() => force((n) => n + 1)), [])

  if (isStandalone() || dismissed) return null
  const mobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent) || isIOS()
  if (!mobile && !canPromptInstall()) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY + who, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="install card">
      <img src="icon-192.png" alt="" width={44} height={44} />
      <div className="install-text">
        <strong>Installe l’app sur ton téléphone</strong>
        {canPromptInstall() ? (
          <div className="small muted">Accès en un geste depuis l’écran d’accueil, en plein écran.</div>
        ) : isIOS() ? (
          <div className="small">
            Dans <b>Safari</b>, touche <b>Partager</b> <span aria-hidden>⬆️</span> puis <b>« Sur l’écran d’accueil »</b>.
          </div>
        ) : (
          <div className="small">
            Ouvre le menu <b>⋮</b> du navigateur puis <b>« Installer l’application »</b> ou <b>« Ajouter à l’écran d’accueil »</b>.
          </div>
        )}
        <div className="row gap install-actions">
          {canPromptInstall() && <button className="btn primary small" onClick={() => promptInstall()}>📲 Installer</button>}
          <button className="btn ghost small" onClick={dismiss}>Plus tard</button>
        </div>
      </div>
    </div>
  )
}
