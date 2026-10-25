import { useState } from 'react'
import { api } from '../api'
import { useData } from '../lib/data'
import { errorMessage, inviteLink, nativeShare, whatsappUrl } from '../lib/utils'

/** Lien d'inscription à partager dans le groupe WhatsApp : un par groupe, ou un lien général */
export function InviteCard() {
  const { me, groups, refreshMe } = useData()
  const [copied, setCopied] = useState(false)
  const [choice, setGroupId] = useState<string | null>(null)
  const groupId = choice ?? groups[0]?.id ?? ''
  if (!me?.invite_code) return null
  const group = groups.find((g) => g.id === groupId)
  const link = inviteLink(me.invite_code, group?.id)
  const message =
    `Rejoins le programme d’entraînement${group ? ` du groupe ${group.name}` : ''} sur Coach Athlé !\n` +
    `Tu y trouveras tes séances, tes progrès et plein de conseils (nutrition, sommeil…).\n\n` +
    `Crée ton compte ici ${link}\n\nPuis installe l’app sur ton écran d’accueil`

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
    if (!confirm('Créer de nouveaux liens ? Les anciens liens (de tous les groupes) ne permettront plus de s’inscrire. Les athlètes déjà inscrits ne sont pas touchés.')) return
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
        <strong>Lien d’inscription</strong>
        <div className="muted small">Un lien par groupe : l’athlète crée son compte et rejoint directement le programme du groupe. Partage-le dans le groupe WhatsApp.</div>
      </div>
      <select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Groupe du lien">
        {groups.map((g) => <option key={g.id} value={g.id}>Programme du groupe {g.name}</option>)}
        <option value="">Lien général (l’athlète choisit son groupe)</option>
      </select>
      <div className="invite-code">
        <code>{link.replace(/^https?:\/\//, '')}</code>
      </div>
      <div className="row gap wrap">
        <a className="btn small whatsapp" href={whatsappUrl(message)} target="_blank" rel="noreferrer">WhatsApp</a>
        {typeof navigator.share === 'function' && <button className="btn small" onClick={() => nativeShare(message)}>Partager</button>}
        <button className="btn small" onClick={copy}>{copied ? '✓ Copié' : 'Copier'}</button>
        <button className="btn small ghost" onClick={regenerate}>Nouveaux liens</button>
      </div>
      <div className="tiny muted">Code : <b>{me.invite_code}</b></div>
    </div>
  )
}
