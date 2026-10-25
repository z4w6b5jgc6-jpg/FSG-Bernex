// Verrouillage de l'app par Face ID / Touch ID / empreinte (WebAuthn, authentificateur de l'appareil).
// C'est un verrou local : la session reste sur l'appareil, il empêche seulement d'ouvrir l'app sans le visage / le doigt du propriétaire.
const KEY = 'athle-lock'
const HIDDEN_KEY = 'athle-lock-hidden-at'
/** Durée en arrière-plan après laquelle l'app se reverrouille */
export const RELOCK_MS = 5 * 60 * 1000

const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n))

interface LockInfo { email: string; id: string }

function info(): LockInfo | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

export const lockEnabled = (email?: string) => !!email && info()?.email === email

export async function lockSupported(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export async function enableLock(email: string) {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: random(32),
      rp: { name: 'Coach Athlé' },
      user: { id: random(16), name: 'Coach Athlé', displayName: 'Coach Athlé' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000,
    },
  }) as PublicKeyCredential | null
  if (!cred) throw new Error('Activation annulée')
  localStorage.setItem(KEY, JSON.stringify({ email, id: b64(cred.rawId) }))
}

export function disableLock() {
  localStorage.removeItem(KEY)
}

/** Demande Face ID / l'empreinte ; true si reconnu */
export async function unlock(): Promise<boolean> {
  const i = info()
  if (!i) return true
  try {
    const ok = await navigator.credentials.get({
      publicKey: { challenge: random(32), allowCredentials: [{ type: 'public-key', id: unb64(i.id) }], userVerification: 'required', timeout: 60000 },
    })
    return !!ok
  } catch {
    return false
  }
}

/** « Déconnexion » : avec Face ID activé, on revient à l'écran « Se connecter avec Face ID » (la session reste) ; sinon vraie déconnexion */
export function logout(email: string | undefined, signOut: () => unknown) {
  if (lockEnabled(email)) window.dispatchEvent(new Event('athle-lock-now'))
  else signOut()
}

export function markHidden() {
  try { sessionStorage.setItem(HIDDEN_KEY, String(Date.now())) } catch { /* */ }
}
export function hiddenLongEnough(): boolean {
  try {
    const t = Number(sessionStorage.getItem(HIDDEN_KEY) || 0)
    return t > 0 && Date.now() - t > RELOCK_MS
  } catch {
    return false
  }
}
