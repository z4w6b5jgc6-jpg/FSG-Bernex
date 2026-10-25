import { useSyncExternalStore } from 'react'

export type ThemePref = 'auto' | 'light' | 'dark'
const KEY = 'athle-theme'
const media = () => window.matchMedia?.('(prefers-color-scheme: dark)')

export function themePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

/** Pose data-theme="light|dark" sur <html> (le CSS suit cet attribut) */
export function applyTheme() {
  const pref = themePref()
  const dark = pref === 'dark' || (pref === 'auto' && !!media()?.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  window.dispatchEvent(new Event('athle-theme'))
}

export function setThemePref(v: ThemePref) {
  try {
    if (v === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, v)
  } catch { /* stockage indisponible : le choix vaut pour cette visite */ }
  applyTheme()
}

/** À appeler une fois au démarrage : suit le réglage du téléphone en mode auto */
export function initTheme() {
  applyTheme()
  media()?.addEventListener?.('change', () => themePref() === 'auto' && applyTheme())
}

const subscribe = (cb: () => void) => {
  window.addEventListener('athle-theme', cb)
  return () => window.removeEventListener('athle-theme', cb)
}
export const useDark = () => useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === 'dark')
