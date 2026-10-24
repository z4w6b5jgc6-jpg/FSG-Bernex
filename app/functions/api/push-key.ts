// Cloudflare Pages Function : GET /api/push-key — clé publique pour s'abonner aux notifications (null si non configuré)
import { json, pushReady, type PushEnv } from '../../server/push'

export const onRequestGet = async ({ env }: { env: PushEnv }) => json({ key: pushReady(env) ? env.VAPID_PUBLIC_KEY : null })
