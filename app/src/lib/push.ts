import { api } from '../api'

/** État des notifications sur cet appareil */
export type PushState = 'unsupported' | 'ios-home' | 'off' | 'on' | 'denied'

const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export async function pushState(): Promise<PushState> {
  // iPhone / iPad : seulement depuis l'app ajoutée à l'écran d'accueil (iOS 16.4 ou plus récent)
  if (isIOS() && !standalone()) return 'ios-home'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

/** Demande l'autorisation et enregistre l'appareil ; message d'erreur lisible sinon */
export async function enablePush(): Promise<void> {
  const key = await api.pushKey()
  if (!key) throw new Error('Les notifications ne sont pas encore configurées sur le serveur.')
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications refusées. Tu peux les autoriser dans les réglages du téléphone.')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(key) })
  await api.savePush(sub.endpoint)
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await api.removePush(sub.endpoint).catch(() => {})
  await sub.unsubscribe()
}
