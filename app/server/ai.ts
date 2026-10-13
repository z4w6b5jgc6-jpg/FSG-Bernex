// Code commun aux fonctions IA (Cloudflare Pages Functions, dossier functions/api).
// Confidentialité : seuls les contenus d'entraînement et les questions de l'entraîneur (noms masqués côté app)
// sont envoyés au modèle ouvert de Cloudflare (Workers AI). Rien n'est enregistré.

export interface Env {
  AI: { run: (model: string, input: unknown) => Promise<{ response?: string | object }> }
  COACH_SUPABASE_URL?: string
  COACH_SUPABASE_ANON_KEY?: string
}
export interface Item { name: string; sets?: string; reps?: string; distance?: string; duration?: string; recovery?: string; intensity?: string; notes?: string }
export interface SessionBody { title?: string; objective?: string; focus?: string; duration_min?: number | null; level?: string; blocks?: { title: string; items: Item[] }[] }

export const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
// Mêmes valeurs publiques que app/.env.production (clé « publishable », visible dans le site)
const SUPABASE_URL = 'https://ledxcccbukvwmgkqijbn.supabase.co'
const SUPABASE_KEY = 'sb_publishable_SXQVsIh_e2rY6-pkvSAW_A_Oa7DuJVQ'
export const FIELDS = ['sets', 'reps', 'distance', 'duration', 'recovery', 'intensity', 'notes'] as const

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

/** Séance réduite à son contenu d'entraînement (limité en taille) */
export function cleanSession(b: SessionBody) {
  return {
    titre: cut(b.title, 120), objectif: cut(b.objective, 300), theme: cut(b.focus, 40),
    duree_min: typeof b.duration_min === 'number' ? b.duration_min : null, niveau: cut(b.level, 60) || 'U16/U18',
    blocs: (b.blocks ?? []).slice(0, 15).map((bl) => ({
      titre: cut(bl.title, 80),
      exercices: (bl.items ?? []).slice(0, 25).map((it) => Object.fromEntries([['nom', cut(it.name, 200)], ...FIELDS.map((f) => [f, cut(it[f], 120)]).filter(([, v]) => v)])),
    })),
  }
}

/** Repères partagés par les deux fonctions : contexte du groupe et types de séances (tableau « Sprint », S. Charlet) */
export const COACH_CONTEXT = `Contexte : groupe d'athlétisme U16/U18 (15 à 18 ans) du club FSG Bernex-Confignon (Genève), surtout sprint et saut en longueur, quelques lanceurs et demi-fondeurs. Entraînement collectif le mercredi 18h–20h (Evaux d'avril à octobre, salle de novembre à mars).
Repères de types de séances (tableau « Sprint » de S. Charlet, complétés par les pratiques actuelles) :
- S7 Vitesse / puissance anaérobie alactique : 30–60 m à 95–100 %, récup 1'30–3' (≈ 1 min / 10 m), 3–5' entre séries, volume 400–800 m.
- S8 Séance courte / capacité anaérobie alactique : 80–150 m à 90–95 %, récup 1–2' entre répétitions, 12–15' entre séries, volume 700–1200 m.
- Séance spécifique : 80–200 m à 95–100 %, récup complète.
- S5 Séance longue / puissance anaérobie lactique : 150–400 m à 75–85 % de la vitesse max, récup 3–8', volume 1000–1500 m.
- S6 Capacité anaérobie lactique : 500–1000 m, récup 6–8', 2–5 km.
- S1 VMA : 100–400 m à 100 % VMA, récup active 45"–1', 4–6 km ; S2 seuil : 1000–2000 m à 85 % VMA, récup 2'30–3', 8–10 km ; S3 capacité aérobie ≈ 77 % VMA ; S4 régénération 70 % VMA.
Principes : sécurité et progressivité, vitesse et explosivité en début de séance sur athlètes frais, volumes adaptés à l'âge, échauffement complet, retour au calme.`
