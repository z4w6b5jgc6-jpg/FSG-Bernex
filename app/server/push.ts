// Notifications Web Push sans contenu (aucun texte ne quitte l'app : le téléphone affiche « Nouveau message »).
// Clés VAPID dans les secrets Cloudflare : VAPID_PUBLIC_KEY (65 octets, base64url) et VAPID_PRIVATE_KEY (« d », base64url).
import { json } from './ai'

export interface PushEnv {
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
  COACH_SUPABASE_URL?: string
  COACH_SUPABASE_ANON_KEY?: string
}

// Mêmes valeurs publiques que app/.env.production
const SUPABASE_URL = '' // Renseigner COACH_SUPABASE_URL dans l’environnement.
const SUPABASE_KEY = '' // Renseigner COACH_SUPABASE_ANON_KEY dans l’environnement.

const b64u = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))

export const pushReady = (env: PushEnv) => !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)

/** Appel d'une fonction de la base avec le jeton de l'utilisateur (ses droits à lui) */
export async function rpc<T>(req: Request, env: PushEnv, fn: string, args: unknown): Promise<T | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const res = await fetch(`${env.COACH_SUPABASE_URL || SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: env.COACH_SUPABASE_ANON_KEY || SUPABASE_KEY, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  })
  return res.ok ? ((await res.json()) as T) : null
}

/** Mes propres appareils (notification de test) */
export async function myEndpoints(req: Request, env: PushEnv): Promise<string[]> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return []
  const res = await fetch(`${env.COACH_SUPABASE_URL || SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint`, {
    headers: { apikey: env.COACH_SUPABASE_ANON_KEY || SUPABASE_KEY, authorization: `Bearer ${token}` },
  })
  return res.ok ? ((await res.json()) as { endpoint: string }[]).map((r) => r.endpoint) : []
}

async function signingKey(env: PushEnv) {
  const pub = fromB64u(env.VAPID_PUBLIC_KEY!)
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: env.VAPID_PRIVATE_KEY!, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  )
}

/** Envoie une notification vide à chaque appareil ; renvoie le nombre d'envois acceptés */
export async function sendPush(env: PushEnv, endpoints: string[], contact: string): Promise<number> {
  if (!pushReady(env) || !endpoints.length) return 0
  const key = await signingKey(env)
  const enc = new TextEncoder()
  const jwtFor = async (aud: string) => {
    const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
    const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contact })))
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`))
    return `${head}.${body}.${b64u(sig)}`
  }
  const results = await Promise.all([...new Set(endpoints)].map(async (ep) => {
    try {
      const url = new URL(ep)
      if (url.protocol !== 'https:') return false
      const res = await fetch(ep, {
        method: 'POST',
        headers: { TTL: '86400', Urgency: 'high', Authorization: `vapid t=${await jwtFor(url.origin)}, k=${env.VAPID_PUBLIC_KEY}`, 'Content-Length': '0' },
      })
      return res.ok
    } catch {
      return false
    }
  }))
  return results.filter(Boolean).length
}

export { json }
