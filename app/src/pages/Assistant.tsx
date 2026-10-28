import { Link } from 'react-router-dom'

/** Assistant entraîneur : discussion libre avec l'IA */
export function Assistant() {
  return (
    <div>
      <h1>Assistant</h1>
      <div className="card"><h2>Préparation confidentielle</h2><p>Le service d’IA externe est désactivé. La revue individuelle rapproche les cycles, les objectifs et les données disponibles dans le navigateur, sans génération de prescriptions.</p><Link className="btn primary" to="/saison">Ouvrir les cycles et la revue individuelle</Link></div>
    </div>
  )
}
