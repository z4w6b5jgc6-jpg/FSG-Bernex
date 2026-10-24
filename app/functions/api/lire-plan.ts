// Cloudflare Pages Function : POST /api/lire-plan — lit un plan d'entraînement écrit librement (Excel, Word, texte)
// et le rend en séances structurées. Les noms d'athlètes sont masqués par l'app avant l'envoi ; rien n'est enregistré.
import { MODEL, cut, groupContext, isCoach, json, type Env } from '../../server/ai'

const SYSTEM = (groupe: string, today: string) => `Tu lis des plans d'entraînement d'athlétisme écrits par des entraîneurs, dans n'importe quelle forme (tableau, liste, texte libre), et tu les recopies en séances structurées.
${groupContext(groupe)}
Aujourd'hui : ${today}. Une date sans année est la prochaine à venir (saison de septembre à août).
Réponds UNIQUEMENT en JSON valide :
{"seances":[{"date":"AAAA-MM-JJ ou vide","titre":"titre court","objectif":"cycle, phase ou thème","pour":"groupe ou sous-groupe concerné si le plan en distingue, sinon vide","blocs":[{"titre":"Échauffement, Éducatifs, Vitesse…","exercices":[{"nom":"","series":"","reps":"","distance":"","duree":"","recup":"","intensite":"","consignes":""}]}],"remarques":"notes de l'entraîneur","cibles":[{"distance":100,"base":"VMA","pct":0.95}]}]}
Règles :
- Recopie fidèlement, n'invente rien, ne complète pas : un champ inconnu reste vide.
- Une séance par date (ou par jour de semaine / numéro de séance s'il n'y a pas de date) ; si le plan donne des contenus différents par groupe le même jour, une séance par groupe avec "pour".
- « 4 x 60 m » → series "4", distance "60 m" ; « x 3 » → reps "3" ; « r 2' » ou « récup 2 min » → recup "2'" ; « à 90 % » → intensite "90 %".
- "cibles" : seulement les répétitions chronométrées écrites avec un pourcentage : « 200 m à 95 % VMA » → {"distance":200,"base":"VMA","pct":0.95} ; « % RVA » → base "RVA" ; « % du record » → base "REC" ; intermittent « 15"/15" à 105 % VMA » → {"distance":15,"base":"INT","pct":1.05}. Au plus 3 par séance, sinon [].
- [athlète] remplace un nom masqué : garde-le tel quel.`

/** Premier objet JSON de la réponse, même entouré de texte */
function parse(raw: string): { seances?: unknown[] } | null {
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  try { return JSON.parse(raw.slice(a, b + 1)) } catch { return null }
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    if (!env.AI) return json({ error: 'L’IA n’est pas activée sur ce site (liaison « AI » manquante dans Cloudflare).' }, 503)
    if (!(await isCoach(request, env))) return json({ error: 'Réservé aux entraîneurs connectés.' }, 401)
    const body = (await request.json()) as { texte?: string; groupe?: string; aujourdhui?: string }
    const texte = cut(body.texte, 9000).trim()
    if (!texte) return json({ error: 'Le plan est vide.' }, 400)
    const today = /^\d{4}-\d{2}-\d{2}$/.test(body.aujourdhui ?? '') ? body.aujourdhui! : new Date().toISOString().slice(0, 10)
    const out = await env.AI.run(MODEL, {
      messages: [{ role: 'system', content: SYSTEM(cut(body.groupe, 600), today) }, { role: 'user', content: texte }],
      max_tokens: 4000, temperature: 0.1,
    })
    const raw = typeof out.response === 'string' ? out.response : JSON.stringify(out.response ?? '')
    const data = parse(raw)
    if (!data || !Array.isArray(data.seances)) return json({ error: 'L’IA n’a pas réussi à lire ce passage du plan.' }, 502)
    return json({ seances: data.seances.slice(0, 60) })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}
