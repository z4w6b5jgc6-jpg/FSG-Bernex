import { useSyncExternalStore } from 'react'

// Personnalisation propre à l'appareil (comme le thème) : style des tuiles, icône de l'app, ordre de l'accueil
export type TileStyle = 'sobre' | 'couleur'
export type TileSize = 'grande' | 'compacte'
export type AppIcon = 'clair' | 'sombre' | 'vert' | 'jaune'
export interface TileLayout { order: string[]; hidden: string[] }

export const APP_ICONS: { v: AppIcon; label: string; src: string }[] = [
  { v: 'clair', label: 'Clair', src: 'apple-touch-icon.png' },
  { v: 'sombre', label: 'Sombre', src: 'icon-sombre-180.png' },
  { v: 'vert', label: 'Vert', src: 'icon-vert-180.png' },
  { v: 'jaune', label: 'Jaune', src: 'icon-jaune-180.png' },
]

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem('athle-' + key)
    return v == null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}
function write(key: string, v: unknown) {
  try { localStorage.setItem('athle-' + key, JSON.stringify(v)) } catch { /* stockage indisponible */ }
  applyPrefs()
}

export const tileStyle = () => read<TileStyle>('tile-style', 'sobre')
export const tileSize = () => read<TileSize>('tile-size', 'grande')
export const appIcon = () => read<AppIcon>('app-icon', 'clair')
export const tileLayout = (who: string) => read<TileLayout>('tiles-' + who, { order: [], hidden: [] })
export const setTileStyle = (v: TileStyle) => write('tile-style', v)
export const setTileSize = (v: TileSize) => write('tile-size', v)
export const setAppIcon = (v: AppIcon) => write('app-icon', v)
export const setTileLayout = (who: string, v: TileLayout) => write('tiles-' + who, v)

/** Pose les attributs lus par le CSS et l'icône d'écran d'accueil (lue par l'iPhone au moment de « Sur l'écran d'accueil ») */
export function applyPrefs() {
  const root = document.documentElement
  root.dataset.tiles = tileStyle()
  root.dataset.density = tileSize()
  const src = APP_ICONS.find((i) => i.v === appIcon())?.src ?? APP_ICONS[0].src
  document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', '/' + src)
  version++
  window.dispatchEvent(new Event('athle-prefs'))
}

let version = 0
const subscribe = (cb: () => void) => {
  window.addEventListener('athle-prefs', cb)
  return () => window.removeEventListener('athle-prefs', cb)
}
/** Re-rend le composant quand une préférence change */
export const usePrefsVersion = () => useSyncExternalStore(subscribe, () => version)
