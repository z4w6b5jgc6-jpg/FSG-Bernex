// Cloudflare Pages Function : POST /api/ameliorer
// Propose des améliorations d'une séance avec l'IA de Cloudflare (Workers AI, modèle ouvert).
// Confidentialité : seul le contenu de la séance (exercices, distances, séries, récup…) est envoyé,
// jamais de nom ni de donnée d'athlète. Rien n'est enregistré. Réservé aux entraîneurs connectés.

interface Env {
  AI: { run: (model: string, input: unknown) => Promise<{ response?: string | object }> }
  COACH_SUPABASE_URL?: string
  COACH_SUPABASE_ANON_KEY?: string
}
interface Item { name: string; sets?: string; reps?: string; distance?: string; duration?: string; recovery?: string; intensity?: string; notes?: string }
interface Body { title?: string; objective?: string; focus?: string; duration_min?: number | null; level?: string; blocks?: { title: string; items: Item[] }[] }

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
// Mêmes valeurs publiques que app/.env.production (clé « publishable », visible dans le site)
const SUPABASE_URL = 'https://ledxcccbukvwmgkqijbn.supabase.co'
const SUPABASE_KEY = 'sb_publishable_SXQVsIh_e2rY6-pkvSAW_A_Oa7DuJVQ'
const FIELDS = ['sets', 'reps', 'distance', 'duration', 'recovery', 'intensity', 'notes'] as const

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

const cut = (v: unknown, n: number) => String(v ?? '').slice(0, n)

/** L'appelant est-il un entraîneur connecté ? (vérifié auprès de Supabase avec son propre jeton) */
async function isCoach(req: Request, env: Env): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return false
  const url = env.COACH_SUPABASE_URL || SUPABASE_URL
  const key = env.COACH_SUPABASE_ANON_KEY || SUPABASE_KEY
  const res = await fetch(`${url}/rest/v1/rpc/whoami`, {
    method: 'POST', headers: { apikey: key, authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{}',
  })
  if (!res.ok) return false
  const who = (await res.json()) as { role?: string }
  return who.role === 'coach'
}

/** Séance réduite à son contenu d'entraînement (limité en taille) */
function clean(b: Body) {
  return {
    titre: cut(b.title, 120), objectif: cut(b.objective, 300), theme: cut(b.focus, 40),
    duree_min: typeof b.duration_min === 'number' ? b.duration_min : null, niveau: cut(b.level, 60) || 'U16/U18',
    blocs: (b.blocks ?? []).slice(0, 15).map((bl) => ({
      titre: cut(bl.title, 80),
      exercices: (bl.items ?? []).slice(0, 25).map((it) => Object.fromEntries([['nom', cut(it.name, 200)], ...FIELDS.map((f) => [f, cut(it[f], 120)]).filter(([, v]) => v)])),
    })),
  }
}

const SYSTEM = `Tu es un entraîneur d'athlétisme expérimenté (sprint, sauts, demi-fond) qui aide un collègue à améliorer une séance pour des jeunes de 15 à 18 ans.
Règles : sécurité et progressivité d'abord ; vitesse et explosivité en début de séance, sur athlètes frais ; récupérations suffisantes pour la qualité (vitesse max ≈ 1 min par 10 m) ; volumes adaptés à l'âge ; tiens compte de l'objectif et de la phase du cycle.
Réponds UNIQUEMENT en JSON valide, en français, sous cette forme :
{"resume": "2 phrases maximum sur la séance", "suggestions": [{"bloc": "titre du bloc concerné", "exercice": "nom exact de l'exercice concerné ou vide", "champ": "sets|reps|distance|duration|recovery|intensity|notes ou vide", "valeur": "nouvelle valeur courte si champ renseigné", "proposition": "ce que tu proposes", "pourquoi": "justification courte"}]}
Au plus 6 suggestions, concrètes et utiles. Ne propose pas de changement inutile. Si la séance est bonne, dis-le et propose peu de choses.`

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    if (!env.AI) return json({ error: 'L’IA n’est pas activée sur ce site (liaison « AI » manquante dans Cloudflare).' }, 503)
    if (!(await isCoach(request, env))) return json({ error: 'Réservé aux entraîneurs connectés.' }, 401)
    const body = (await request.json()) as Body
    const seance = clean(body)
    if (!seance.blocs.some((b) => b.exercices.length)) return json({ error: 'La séance est vide.' }, 400)
    const out = await env.AI.run(MODEL, {
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify(seance) }],
      max_tokens: 1200, temperature: 0.3,
    })
    const raw = typeof out.response === 'string' ? out.response : JSON.stringify(out.response ?? '')
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
    let parsed: { resume?: string; suggestions?: unknown[] }
    try { parsed = JSON.parse(raw.slice(start, end + 1)) } catch { return json({ resume: raw.slice(0, 600), suggestions: [] }) }
    const suggestions = (Array.isArray(parsed.suggestions) ? parsed.suggestions : []).slice(0, 8).map((s) => {
      const o = (s ?? {}) as Record<string, unknown>
      const champ = FIELDS.includes(o.champ as (typeof FIELDS)[number]) ? (o.champ as string) : ''
      return { bloc: cut(o.bloc, 80), exercice: cut(o.exercice, 200), champ, valeur: champ ? cut(o.valeur, 120) : '', proposition: cut(o.proposition, 400), pourquoi: cut(o.pourquoi, 300) }
    })
    return json({ resume: cut(parsed.resume, 600), suggestions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/limit|quota|neuron|4006/i.test(msg)) return json({ error: 'Quota gratuit de l’IA atteint pour aujourd’hui. Réessaie demain.' }, 429)
    return json({ error: 'L’IA n’a pas pu répondre : ' + msg.slice(0, 200) }, 502)
  }
}
