import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useData } from '../lib/data'
import { Field } from '../components/ui'
import { clearPendingJoin, parseInviteCode, pendingJoin } from '../lib/pwa'
import { errorMessage } from '../lib/utils'

/** Compte créé mais pas encore rattaché à un club */
export function Onboarding() {
  const { me, refreshMe } = useData()
  const nav = useNavigate()
  const [link, setLink] = useState('')
  const [clubName, setClubName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  // Termine automatiquement une inscription commencée avant la confirmation de l'email
  useEffect(() => {
    const pending = pendingJoin()
    if (me?.role !== 'new' || !pending || started.current) return
    started.current = true
    setBusy(true)
    api.joinClub(pending.code, pending.profile)
      .then(() => { clearPendingJoin(); return refreshMe() })
      .catch((e) => { clearPendingJoin(); setErr(errorMessage(e)) })
      .finally(() => setBusy(false))
  }, [me?.role, refreshMe])

  if (me?.role === 'inactive') {
    return (
      <div className="login">
        <div className="card login-card">
          <h2>Compte en pause</h2>
          <p>Ton entraîneur a désactivé ton compte. Contacte-le si c’est une erreur.</p>
          <button className="btn block" onClick={() => api.signOut()}>Se déconnecter</button>
        </div>
      </div>
    )
  }

  const join = (e: FormEvent) => {
    e.preventDefault()
    const code = parseInviteCode(link)
    if (code) nav(`/rejoindre/${code}`)
    else setErr('Ce lien ou ce code ne semble pas correct.')
  }
  const create = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.createClub(clubName.trim())
      await refreshMe()
    } catch (e2) {
      setErr(errorMessage(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-hero">
        <h1>Bienvenue 👋</h1>
        <p className="muted">{me?.email}</p>
      </div>
      {busy && <p className="muted">Un instant…</p>}
      {err && <div className="alert warn login-card">{err}</div>}
      <form className="card login-card form" onSubmit={join}>
        <h2>🏃 Je suis athlète</h2>
        <p className="small muted">Colle le lien d’inscription ou le code envoyé par ton entraîneur.</p>
        <input value={link} onChange={(e) => { setLink(e.target.value); setErr(null) }} placeholder="Lien ou code (ex. 7F3K9Q2A)" autoCapitalize="characters" />
        <button className="btn primary block" disabled={!link}>Continuer</button>
      </form>
      <form className="card login-card form" onSubmit={create}>
        <h2>📋 Je suis entraîneur</h2>
        <Field label="Nom de ton club ou de ton groupe"><input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Ex. FSG Bernex – Athlétisme" required /></Field>
        <button className="btn block" disabled={busy || !clubName.trim()}>Créer mon espace entraîneur</button>
      </form>
      <button className="link small" onClick={() => api.signOut()}>Se déconnecter</button>
    </div>
  )
}
