import { useEffect, useState } from 'react'
import { BackLink } from '../components/BackLink'
import { PushToggle } from '../components/PushToggle'
import { api } from '../api'
import { errorMessage } from '../lib/utils'

const b64u = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** Mise en route des notifications : clés générées dans ce navigateur, à coller dans Cloudflare */
export function NotificationsSetup() {
  const [ready, setReady] = useState<boolean | null>(null)
  const [keys, setKeys] = useState<{ pub: string; priv: string } | null>(null)
  const [copied, setCopied] = useState('')
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { api.pushKey().then((k) => setReady(!!k)).catch(() => setReady(false)) }, [])

  const generate = async () => {
    setErr(null)
    try {
      const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
      const pub = b64u(await crypto.subtle.exportKey('raw', kp.publicKey))
      const priv = (await crypto.subtle.exportKey('jwk', kp.privateKey)).d!
      setKeys({ pub, priv })
    } catch (e) {
      setErr(errorMessage(e))
    }
  }
  const copy = async (label: string, v: string) => {
    try { await navigator.clipboard.writeText(v); setCopied(label) } catch { setCopied('') }
  }

  return (
    <div>
      <BackLink to="/messages" label="Messages" />
      <h1>🔔 Notifications</h1>
      {ready ? (
        <div className="alert info">✓ Les notifications sont configurées sur le serveur. Chacun les active sur son appareil (toi, Michèle, les athlètes depuis leur Profil ou Messages).</div>
      ) : (
        <div className="card form">
          <p className="small">
            À faire <b>une seule fois</b>, sur l’ordinateur. Les notifications ne contiennent <b>aucun texte</b> (« Nouveau message ou retour de séance ») :
            le contenu ne passe jamais par Apple ou Google, il se lit dans l’app.
          </p>
          <ol className="small steps">
            <li>
              Clique sur <b>Créer les clés</b> (elles sont créées dans ton navigateur, personne d’autre ne les voit).
              <div><button className="btn small primary" onClick={generate}>Créer les clés</button></div>
            </li>
            {keys && (
              <>
                <li>
                  Dans <b>Cloudflare</b> → Workers & Pages → <b>entrainementu18</b> → <b>Settings</b> → <b>Variables and Secrets</b> → <b>+ Add</b>,
                  ajoute deux variables de type <b>Secret</b> (environnement Production) :
                  <div className="key-row"><code>VAPID_PUBLIC_KEY</code><input readOnly value={keys.pub} onFocus={(e) => e.target.select()} /><button className="btn small" onClick={() => copy('pub', keys.pub)}>{copied === 'pub' ? '✓ Copié' : 'Copier'}</button></div>
                  <div className="key-row"><code>VAPID_PRIVATE_KEY</code><input readOnly value={keys.priv} onFocus={(e) => e.target.select()} /><button className="btn small" onClick={() => copy('priv', keys.priv)}>{copied === 'priv' ? '✓ Copié' : 'Copier'}</button></div>
                  <span className="tiny muted">Garde la clé privée pour toi : ne l’envoie à personne, ne la colle nulle part ailleurs.</span>
                </li>
                <li>Dans <b>Deployments</b>, sur la dernière ligne : <b>…</b> → <b>Retry deployment</b> (les secrets sont pris en compte au prochain déploiement).</li>
                <li>Reviens sur cette page dans 2-3 minutes : elle doit afficher « configurées ». Active-les ensuite sur ton téléphone.</li>
              </>
            )}
          </ol>
          {err && <div className="alert warn small">{err}</div>}
        </div>
      )}
      <PushToggle coach />
    </div>
  )
}
