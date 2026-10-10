// Outils pour l'installation de l'app sur l'écran d'accueil (Android / iPhone)

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallPromptEvent
  listeners.forEach((l) => l())
})
window.addEventListener('appinstalled', () => {
  deferred = null
  listeners.forEach((l) => l())
})

export function canPromptInstall(): boolean {
  return deferred != null
}

export function onInstallAvailabilityChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  listeners.forEach((l) => l())
  return outcome === 'accepted'
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * Sur la page d'un athlète, remplace le manifeste pour que l'app installée
 * s'ouvre directement sur SON espace (et pas sur la connexion entraîneur).
 */
export function applyAthleteManifest(token: string, firstName: string) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!link) return
  const base = window.location.href.split('#')[0]
  const abs = (p: string) => new URL(p, base).href
  const manifest = {
    name: `Coach Athlé – ${firstName}`,
    short_name: 'Mes entraînements',
    lang: 'fr',
    start_url: `${base}#/a/${token}`,
    scope: abs('./'),
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f6fb',
    theme_color: '#e85d04',
    icons: [
      { src: abs('icon-192.png'), sizes: '192x192', type: 'image/png' },
      { src: abs('icon-512.png'), sizes: '512x512', type: 'image/png' },
    ],
  }
  link.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifest))
}

// Mémorise le lien de l'athlète sur cet appareil, pour rouvrir directement son espace
const TOKEN_KEY = 'athle-athlete-token'

export function rememberAthleteToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token) } catch { /* ignore */ }
}
export function rememberedAthleteToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function forgetAthleteToken() {
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

/** Extrait le jeton d'un lien collé (ou du jeton seul) */
export function parseAthleteToken(input: string): string | null {
  const m = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return m ? m[0].toLowerCase() : null
}
