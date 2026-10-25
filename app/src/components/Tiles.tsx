import { Link } from 'react-router-dom'
import { Icon } from './Icon'

export interface Tile {
  to: string
  icon: string
  label: string
  /** info du moment affichée sous le titre */
  info?: string
  /** pastille (ex. nombre d'éléments à traiter) */
  badge?: number
  tone: 'green' | 'yellow' | 'blue' | 'pink' | 'violet' | 'orange'
}

/** Grille de grandes tuiles de l'accueil : un volet par tuile, avec l'info utile du moment */
export function Tiles({ items }: { items: Tile[] }) {
  return (
    <nav className="tiles" aria-label="Volets">
      {items.map((t) => (
        <Link key={t.to} to={t.to} className={`tile tone-${t.tone}`}>
          <span className="tile-icon" aria-hidden><Icon name={t.icon} /></span>
          <span className="tile-label">{t.label}</span>
          {t.info && <span className="tile-info">{t.info}</span>}
          {!!t.badge && <span className="tile-badge" aria-label={`${t.badge} à traiter`}>{t.badge}</span>}
        </Link>
      ))}
    </nav>
  )
}
