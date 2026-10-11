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

// Inscription en attente (si l'email doit être confirmé avant de rejoindre le club)
const PENDING_KEY = 'athle-pending-join'

export interface PendingJoin {
  code: string
  profile: import('../types').JoinProfile
}

export function savePendingJoin(p: PendingJoin) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)) } catch { /* ignore */ }
}
export function pendingJoin(): PendingJoin | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingJoin) : null
  } catch { return null }
}
export function clearPendingJoin() {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* ignore */ }
}

/** Chemin d'inscription à partir d'un lien collé (avec son groupe éventuel) ou du code seul */
export function parseInvitePath(input: string): string | null {
  const coach = input.match(/entraineur\/([A-Za-z0-9-]{20,})/)
  if (coach) return `/entraineur/${coach[1]}`
  const fromLink = input.match(/rejoindre\/([A-Za-z0-9]+)(?:\/([0-9a-f-]{36}))?/i)
  if (fromLink) return `/rejoindre/${fromLink[1].toUpperCase()}${fromLink[2] ? `/${fromLink[2].toLowerCase()}` : ''}`
  const raw = input.trim()
  return /^[A-Za-z0-9]{4,12}$/.test(raw) ? `/rejoindre/${raw.toUpperCase()}` : null
}

const COACH_KEY = 'athle-pending-coach'
/** Invitation entraîneur commencée avant la confirmation de l'email */
export function savePendingCoach(token: string) {
  try { localStorage.setItem(COACH_KEY, token) } catch { /* ignore */ }
}
export function pendingCoach(): string | null {
  try { return localStorage.getItem(COACH_KEY) } catch { return null }
}
export function clearPendingCoach() {
  try { localStorage.removeItem(COACH_KEY) } catch { /* ignore */ }
}
