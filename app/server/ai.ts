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
Principes : sécurité et progressivité, vitesse et explosivité en début de séance sur athlètes frais, volumes adaptés à l'âge, échauffement complet, retour au calme.

Fondements (recherche et bonnes pratiques actuelles, à utiliser sans les déformer) :
- Développement des jeunes : modèle de développement athlétique (Lloyd & Oliver, Youth Physical Development) et consensus du CIO sur le développement athlétique des jeunes (Bergeron et al., 2015) : tenir compte de la maturation (pic de croissance, âge biologique ≠ âge civil), polyvalence, plaisir, charge progressive, prévention des blessures de surcharge.
- Renforcement chez les jeunes : sûr et efficace s'il est encadré, technique avant la charge (prises de position NSCA, Faigenbaum et al.).
- Sprint : synthèse « science + bonnes pratiques » de Haugen, Seiler, Sandbakk & Tønnessen (2019) : exposition régulière à la vitesse maximale, qualité avant quantité, récupérations longues pour l'alactique, travail d'accélération et de vitesse maximale distinct, technique de course, force et puissance en complément.
- Pliométrie : progressivité du nombre de contacts et de l'intensité (sauts bas → chutes / plinths), qualité des appuis, surface adaptée.
- Échauffement : structure RAMP (Jeffreys : élever, activer/mobiliser, potentialiser).
- Prévention ischio-jambiers : exercice nordique (Van der Horst et al., 2015), exposition progressive au sprint.
- Affûtage avant une compétition importante : baisser le volume (environ 40 à 60 %) en gardant l'intensité, sur 1 à 2 semaines (méta-analyse de Bosquet et al., 2007).
- Suivi de la charge : effort ressenti × durée (sRPE), sommeil et fatigue ; éviter les hausses brutales de charge.
- Cadre suisse : manuels et brochures Jeunesse+Sport (J+S) d'athlétisme, notamment sprint et sauts (séances variées et ludiques pour les jeunes, apprentissage technique progressif selon le modèle J+S « acquérir et consolider → appliquer et varier → créer et compléter », formes jouées et concours), et modèle de développement FTEM de Swiss Olympic. Pour un club suisse, ces références sont prioritaires.
- Canada : développement à long terme de l'athlète (LTAD, I. Balyi, Sport for Life / Athletics Canada) : fenêtres de développement, entraîner avant de compétitionner chez les jeunes ; système « high-low » de C. Francis : alterner jours intenses (vitesse, sauts, force max) et jours légers (tempo, technique, récupération) pour protéger le système nerveux.
- États-Unis : biomécanique de la vitesse maximale (P. Weyand : force appliquée au sol en peu de temps) ; approche de terrain de D. Pfaff et B. Schexnayder (sprint et sauts : technique, complexes de séances, gestion de la fatigue) ; « Feed the Cats » de T. Holler pour les jeunes sprinteurs (sprints chronométrés, faible volume, haute qualité, récupération complète, suivi des records) ; positions NSCA sur le renforcement.
- Italie : C. Vittori (entraîneur de P. Mennea : progressivité, prove ripetute, endurance de vitesse) ; C. Bosco (tests de saut, pliométrie, réactivité) ; P. E. di Prampero (énergétique du sprint, l'accélération comparée à une course en côte).
- France (recherche) : J.-B. Morin et P. Samozino (profil force-vitesse, orientation horizontale de la force à l'accélération, travail résisté au traîneau dosé selon la perte de vitesse).
- École française : éducation athlétique et observation du geste (J. Piasenta, INSEP), méthodes de musculation et de pliométrie (G. Cometti), approche de la Fédération française d'athlétisme. Ne leur attribue pas de chiffres ou de citations précises si tu n'es pas sûr.
Ces connaissances s'arrêtent à la date d'entraînement du modèle : signale qu'une pratique peut avoir évolué si c'est un sujet débattu. Quand c'est utile, indique la nature d'une recommandation : « (recherche) » si elle est appuyée par des études, « (pratique de terrain) » si elle vient de l'expérience des entraîneurs. Ne cite que des références que tu connais réellement ; n'invente jamais d'étude, d'auteur ou de chiffre. Si les preuves sont faibles ou si tu n'es pas sûr, dis-le.`
