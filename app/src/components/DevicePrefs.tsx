import { useEffect, useState } from 'react'
import { disableLock, enableLock, lockEnabled, lockSupported } from '../lib/lock'
import { setThemePref, themePref, type ThemePref } from '../lib/theme'
import { errorMessage } from '../lib/utils'

const THEMES: { v: ThemePref; label: string }[] = [
  { v: 'auto', label: 'Comme le téléphone' },
  { v: 'light', label: 'Clair' },
  { v: 'dark', label: 'Sombre' },
]

/** Réglages propres à cet appareil : thème clair / sombre et verrouillage Face ID / empreinte */
export function DevicePrefs({ email }: { email: string }) {
  const [theme, setTheme] = useState(themePref)
  const [lock, setLock] = useState(() => lockEnabled(email))
  const [supported, setSupported] = useState<boolean | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { lockSupported().then(setSupported) }, [])

  const pick = (v: ThemePref) => { setTheme(v); setThemePref(v) }
  const toggleLock = async () => {
    setErr(null)
    try {
      if (lock) disableLock()
      else await enableLock(email)
      setLock(!lock)
    } catch (e) {
      setErr(/NotAllowed|annul/i.test(String(e)) ? 'Activation annulée.' : errorMessage(e))
    }
  }

  return (
    <section className="card form">
      <h2 style={{ marginTop: 0 }}>Sur cet appareil</h2>
      <div>
        <span className="field-label small">Affichage</span>
        <div className="tabs">
          {THEMES.map((t) => <button key={t.v} type="button" className={theme === t.v ? 'active' : ''} onClick={() => pick(t.v)}>{t.label}</button>)}
        </div>
      </div>
      {supported === false ? (
        <p className="tiny muted">Verrouillage par Face ID / empreinte : non disponible sur cet appareil ou ce navigateur.</p>
      ) : supported && (
        <div className="row between gap">
          <span className="small"><b>Verrouiller avec Face ID / empreinte</b><br /><span className="tiny muted">Demandé à l’ouverture de l’app et après 5 min en arrière-plan.</span></span>
          <button type="button" className={`btn small ${lock ? '' : 'primary'}`} onClick={toggleLock}>{lock ? 'Désactiver' : 'Activer'}</button>
        </div>
      )}
      {err && <div className="alert warn small">{err}</div>}
    </section>
  )
}
