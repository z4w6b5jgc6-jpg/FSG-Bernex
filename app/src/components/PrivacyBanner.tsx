import { Link } from 'react-router-dom'
import { useData } from '../lib/data'

/** Coach : tant que l'information sur les données n'est pas publiée, les inscriptions et le suivi de forme restent fermés */
export function PrivacyBanner() {
  const { me } = useData()
  if (me?.role !== 'coach' || me.settings?.privacy?.published) return null
  return (
    <Link to="/confidentialite" className="alert warn link-card">
      <b>Inscriptions fermées</b> : publie d’abord l’information sur les données du groupe (quelques minutes, formulaire pré-rempli). Sans elle, les athlètes ne peuvent ni s’inscrire ni remplir le suivi de forme. →
    </Link>
  )
}
