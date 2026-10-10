import { useState } from 'react'
import { api } from '../api'
import { useData } from '../lib/data'
import { errorMessage, inviteLink, nativeShare, whatsappUrl } from '../lib/utils'

/** Le lien unique d'inscription du club, à partager dans le groupe WhatsApp */
export function InviteCard() {
  const { me, refreshMe } = useData()
  const [copied, setCopied] = useState(false)
  if (!me?.invite_code) return null
  const link = inviteLink(me.invite_code)
  const message =
    `🏃 Rejoins ${me.club_name} sur Coach Athlé !\n` +
    `Tu y trouveras tes entraînements, tes progrès et plein de conseils (nutrition, sommeil…).\n\n` +
    `Crée ton compte ici 👉 ${link}\n\nPuis installe l’app sur ton écran d’accueil 📲`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      prompt('Copie ce lien :', link)
    }
  }
  const regenerate = async () => {
    if (!confirm('Créer un nouveau lien ? L’ancien ne permettra plus de s’inscrire (les athlètes déjà inscrits ne sont pas touchés).')) return
    try {
      await api.regenerateInviteCode()
      await refreshMe()
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  return (
    <div className="card invite">
      <div>
        <strong>📨 Lien d’inscription du club</strong>
        <div className="muted small">Un seul lien pour tous : chaque athlète crée son compte et rejoint le club. Partage-le dans le groupe WhatsApp.</div>
      </div>
      <div className="invite-code">
        <code>{link.replace(/^https?:\/\//, '')}</code>
      </div>
      <div className="row gap wrap">
        <a className="btn small whatsapp" href={whatsappUrl(message)} target="_blank" rel="noreferrer">📲 WhatsApp</a>
        {typeof navigator.share === 'function' && <button className="btn small" onClick={() => nativeShare(message)}>📤 Partager</button>}
        <button className="btn small" onClick={copy}>{copied ? '✓ Copié' : '🔗 Copier'}</button>
        <button className="btn small ghost" onClick={regenerate}>Nouveau lien</button>
      </div>
      <div className="tiny muted">Code : <b>{me.invite_code}</b></div>
    </div>
  )
}
