// Authentification partagée des fonctions Cloudflare.
// Le service documentaire ne reçoit aucun profil ni programme individuel.
export interface Env {
  AI?: { run: (model: string, input: unknown) => Promise<{ response?: string | object }> }
  COACH_SUPABASE_URL?: string
  COACH_SUPABASE_ANON_KEY?: string
}
// Configuration publique ; aucune clé service_role dans le navigateur.
const SUPABASE_URL = '' // Renseigner COACH_SUPABASE_URL dans l’environnement.
const SUPABASE_KEY = '' // Renseigner COACH_SUPABASE_ANON_KEY dans l’environnement.

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const cut = (v: unknown, n: number) => String(v ?? '').slice(0, n)

/** L'appelant est-il un entraîneur connecté ? (vérifié auprès de Supabase avec son propre jeton) */
export async function isCoach(req: Request, env: Env): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return false
  const res = await fetch(`${env.COACH_SUPABASE_URL || SUPABASE_URL}/rest/v1/rpc/whoami`, {
    method: 'POST',
    headers: { apikey: env.COACH_SUPABASE_ANON_KEY || SUPABASE_KEY, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) return false
  return ((await res.json()) as { role?: string }).role === 'coach'
}

/** Accès à l'IA : entraîneur connecté et quota du jour disponible (compté par la base, par entraîneur et par club).
 *  Renvoie null si l'appel est autorisé, sinon la réponse d'erreur à renvoyer. */
export async function aiAccess(req: Request, env: Env): Promise<Response | null> {
  const denied = json({ error: 'Réservé aux entraîneurs connectés.' }, 401)
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return denied
  const res = await fetch(`${env.COACH_SUPABASE_URL || SUPABASE_URL}/rest/v1/rpc/ai_take_quota`, {
    method: 'POST',
    headers: { apikey: env.COACH_SUPABASE_ANON_KEY || SUPABASE_KEY, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  })
  if (res.status === 404) return json({ error: 'La base doit être mise à jour (script 4 sur la page /#/base) avant d’utiliser l’assistant.' }, 503)
  if (!res.ok) return denied
  const quota = (await res.json()) as { ok?: boolean; reason?: string }
  if (quota.ok) return null
  if (quota.reason === 'quota') return json({ error: 'Limite quotidienne de l’assistant atteinte pour ce club. Réessaie demain.' }, 429)
  return denied
}

