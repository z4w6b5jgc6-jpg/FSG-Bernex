import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'

export const MORE_ITEMS = [
  { to: '/seances', label: 'Séances', info: 'Bibliothèque et import Excel', icon: 'list' },
  { to: '/saison', label: 'Saison', info: 'Macro-planification : phases et charge', icon: 'chart' },
  { to: '/assistant', label: 'Assistant IA', info: 'Discuter, demander une séance', icon: 'sparkles' },
  { to: '/sources', label: 'Sources de l’IA', info: 'Publications utilisées par l’Assistant', icon: 'bulb' },
  { to: '/lundi', label: 'Temps cibles', info: 'Plan du lundi, mode piste', icon: 'timer' },
  { to: '/competitions', label: 'Compétitions', info: 'Calendrier et inscriptions', icon: 'trophy' },
  { to: '/tests', label: 'Tests', info: 'Résultats et VMA', icon: 'ruler' },
  { to: '/conseils', label: 'Conseils', info: 'Nutrition, sommeil, récup', icon: 'bulb' },
  { to: '/reglages', label: 'Réglages', info: 'Lieux, groupe, affichage, Face ID', icon: 'settings' },
]

/** « Plus » : tout ce qui n'est pas dans la barre du bas, en une liste */
export function More() {
  return (
    <div>
      <h1>Plus</h1>
      <div className="rows">
        {MORE_ITEMS.map((m) => (
          <Link key={m.to} to={m.to} className="row-item">
            <span className="row-icon"><Icon name={m.icon} size={20} /></span>
            <span className="row-main">{m.label}<small>{m.info}</small></span>
            <span className="chev" aria-hidden>›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
