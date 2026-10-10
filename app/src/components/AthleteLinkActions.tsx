import { useState } from 'react'
import type { Athlete } from '../types'
import { athleteLink, whatsappUrl } from '../lib/utils'

export function AthleteLinkActions({ athlete, compact }: { athlete: Athlete; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const link = athleteLink(athlete.access_token)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      prompt('Copie ce lien :', link)
    }
  }
  const message =
    `Salut ${athlete.first_name} ! 🏃\nVoici ton lien perso pour voir tes entraînements et me donner ton ressenti après chaque séance :\n${link}\n\n` +
    `Astuce : ouvre-le puis « Ajouter à l’écran d’accueil » pour l’avoir comme une app.`
  return (
    <div className="row gap wrap">
      <a className="btn small whatsapp" href={whatsappUrl(message)} target="_blank" rel="noreferrer">📲 {compact ? 'WhatsApp' : 'Envoyer par WhatsApp'}</a>
      <button className="btn small" onClick={copy}>{copied ? '✓ Copié' : '🔗 Copier le lien'}</button>
      {!compact && <a className="btn small ghost" href={link} target="_blank" rel="noreferrer">Voir comme l’athlète</a>}
    </div>
  )
}
