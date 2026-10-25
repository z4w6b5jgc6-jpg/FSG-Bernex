import { useState } from 'react'
import { Link } from 'react-router-dom'
import { setTileLayout, tileLayout, usePrefsVersion } from '../lib/prefs'
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

/** Grille de grandes tuiles de l'accueil : un volet par tuile, ordre et tuiles affichées au choix de chacun */
export function Tiles({ items, who }: { items: Tile[]; who: string }) {
  usePrefsVersion()
  const [editing, setEditing] = useState(false)
  const layout = tileLayout(who)
  const rank = (t: Tile) => { const i = layout.order.indexOf(t.to); return i < 0 ? 1000 + items.indexOf(t) : i }
  const sorted = [...items].sort((a, b) => rank(a) - rank(b))
  const shown = sorted.filter((t) => !layout.hidden.includes(t.to))

  const move = (k: number, d: number) => {
    const order = sorted.map((t) => t.to)
    ;[order[k], order[k + d]] = [order[k + d], order[k]]
    setTileLayout(who, { ...layout, order })
  }
  const toggle = (to: string) =>
    setTileLayout(who, { ...layout, hidden: layout.hidden.includes(to) ? layout.hidden.filter((x) => x !== to) : [...layout.hidden, to] })

  if (editing) return (
    <section className="card tiles-edit">
      <div className="row between"><b>Organiser l’accueil</b><button className="btn small primary" onClick={() => setEditing(false)}>Terminé</button></div>
      <ul className="plain rows">
        {sorted.map((t, k) => (
          <li key={t.to} className="row between gap">
            <label className="check"><input type="checkbox" checked={!layout.hidden.includes(t.to)} onChange={() => toggle(t.to)} /> <Icon name={t.icon} size={18} /> <span>{t.label}</span></label>
            <span className="row gap">
              <button className="btn ghost icon small" aria-label="Monter" disabled={k === 0} onClick={() => move(k, -1)}>↑</button>
              <button className="btn ghost icon small" aria-label="Descendre" disabled={k === sorted.length - 1} onClick={() => move(k, 1)}>↓</button>
            </span>
          </li>
        ))}
      </ul>
      <button className="link small" onClick={() => setTileLayout(who, { order: [], hidden: [] })}>Revenir à l’ordre d’origine</button>
    </section>
  )

  return (
    <>
      <nav className="tiles" aria-label="Volets">
        {shown.map((t) => (
          <Link key={t.to} to={t.to} className={`tile tone-${t.tone}`}>
            <span className="tile-icon" aria-hidden><Icon name={t.icon} /></span>
            <span className="tile-label">{t.label}</span>
            {t.info && <span className="tile-info">{t.info}</span>}
            {!!t.badge && <span className="tile-badge" aria-label={`${t.badge} à traiter`}>{t.badge}</span>}
          </Link>
        ))}
      </nav>
      <div className="row end"><button className="link tiny tiles-custom" onClick={() => setEditing(true)}>Organiser l’accueil</button></div>
    </>
  )
}
