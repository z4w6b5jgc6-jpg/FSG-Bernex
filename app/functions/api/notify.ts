// Cloudflare Pages Function : POST /api/notify { kind, id } — prévient les destinataires d'un message ou d'un retour.
// La base vérifie (avec le jeton de l'appelant) qu'il vient d'écrire ce message / ce retour et renvoie les appareils à prévenir.
import { json, myEndpoints, pushReady, rpc, sendPush, type PushEnv } from '../../server/push'

export const onRequestPost = async ({ request, env }: { request: Request; env: PushEnv }) => {
  try {
    if (!pushReady(env)) return json({ sent: 0, configured: false })
    const { kind, id } = (await request.json()) as { kind?: string; id?: string }
    const contact = new URL(request.url).origin
    if (kind === 'test') return json({ sent: await sendPush(env, await myEndpoints(request, env), contact), configured: true })
    if ((kind !== 'message' && kind !== 'feedback') || !/^[0-9a-f-]{36}$/i.test(id ?? '')) return json({ error: 'Requête invalide' }, 400)
    const targets = (await rpc<string[]>(request, env, 'push_targets', { p_kind: kind, p_id: id })) ?? []
    return json({ sent: await sendPush(env, targets, contact), configured: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}
