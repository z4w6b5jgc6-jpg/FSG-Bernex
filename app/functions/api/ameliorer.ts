// Cloudflare Pages Function : POST /api/ameliorer — suggestions structurées pour une séance.
import { COACH_CONTEXT, FIELDS, MODEL, cleanSession, cut, isCoach, json, type Env, type SessionBody } from '../../server/ai'

const SYSTEM = `Tu es un entraîneur d'athlétisme expérimenté (sprint, sauts, demi-fond) qui aide un collègue à améliorer une séance.
${COACH_CONTEXT}
Réponds UNIQUEMENT en JSON valide, en français, sous cette forme :
{"resume": "2 phrases maximum sur la séance", "suggestions": [{"bloc": "titre du bloc concerné", "exercice": "nom exact de l'exercice concerné ou vide", "champ": "sets|reps|distance|duration|recovery|intensity|notes ou vide", "valeur": "nouvelle valeur courte si champ renseigné", "proposition": "ce que tu proposes", "pourquoi": "justification courte"}]}
Au plus 6 suggestions, concrètes et utiles. Ne propose pas de changement inutile. Si la séance est bonne, dis-le et propose peu de choses.`

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    if (!env.AI) return json({ error: 'L’IA n’est pas activée sur ce site (liaison « AI » manquante dans Cloudflare).' }, 503)
    if (!(await isCoach(request, env))) return json({ error: 'Réservé aux entraîneurs connectés.' }, 401)
    const seance = cleanSession((await request.json()) as SessionBody)
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
