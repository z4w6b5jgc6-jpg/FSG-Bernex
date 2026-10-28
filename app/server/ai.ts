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

