// Cloudflare Pages Function : POST /api/chat — conversation avec l'assistant entraîneur.
// Reçoit l'historique (noms d'athlètes déjà masqués par l'app) et, si on discute d'une séance, son contenu.
import { COACH_CONTEXT, MODEL, cleanSession, cut, isCoach, json, type Env, type SessionBody } from '../../server/ai'

interface Body { messages?: { role: string; content: string }[]; session?: SessionBody | null }

const SYSTEM = `Tu es l'assistant d'un entraîneur d'athlétisme, expert en sprint, sauts, haies et demi-fond chez les jeunes.
${COACH_CONTEXT}
Réponds en français, de façon concrète et structurée (listes courtes, distances, séries, récupérations, intensités). Sois bref sauf si on te demande un détail.
Tu ne fais pas de diagnostic médical : en cas de douleur ou de blessure, conseille d'adapter et d'orienter vers un professionnel de santé.
Si une question sort de l'entraînement sportif, recentre poliment. N'invente pas de références.`

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    if (!env.AI) return json({ error: 'L’IA n’est pas activée sur ce site (liaison « AI » manquante dans Cloudflare).' }, 503)
    if (!(await isCoach(request, env))) return json({ error: 'Réservé aux entraîneurs connectés.' }, 401)
    const body = (await request.json()) as Body
    const history = (body.messages ?? [])
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content)
      .slice(-12)
      .map((m) => ({ role: m.role, content: cut(m.content, 2000) }))
    if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'Pose une question.' }, 400)
    const system = body.session
      ? `${SYSTEM}\nOn discute de cette séance (format JSON) :\n${JSON.stringify(cleanSession(body.session))}`
      : SYSTEM
    const out = await env.AI.run(MODEL, { messages: [{ role: 'system', content: system }, ...history], max_tokens: 900, temperature: 0.5 })
    const reply = typeof out.response === 'string' ? out.response : JSON.stringify(out.response ?? '')
    return json({ reply: cut(reply, 6000) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/limit|quota|neuron|4006/i.test(msg)) return json({ error: 'Quota gratuit de l’IA atteint pour aujourd’hui. Réessaie demain.' }, 429)
    return json({ error: 'L’IA n’a pas pu répondre : ' + msg.slice(0, 200) }, 502)
  }
}
