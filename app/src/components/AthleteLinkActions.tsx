import { useState } from 'react'
import type { Athlete } from '../types'
import { athleteLink, nativeShare, whatsappUrl } from '../lib/utils'

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
    `Astuce : ouvre-le puis installe l’app sur ton écran d’accueil.`
  const canShare = typeof navigator.share === 'function'
  return (
    <div className="row gap wrap">
      <a className="btn small whatsapp" href={whatsappUrl(message, athlete.phone)} target="_blank" rel="noreferrer">
        📲 {compact ? 'WhatsApp' : athlete.phone ? `WhatsApp à ${athlete.first_name}` : 'Envoyer par WhatsApp'}
      </a>
      {canShare && <button className="btn small" onClick={() => nativeShare(message)}>📤 Partager</button>}
      <button className="btn small" onClick={copy}>{copied ? '✓ Copié' : '🔗 Copier'}</button>
      {!compact && <a className="btn small ghost" href={link} target="_blank" rel="noreferrer">Voir comme l’athlète</a>}
    </div>
  )
}
