import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../lib/utils'
import { parseAthleteToken } from '../lib/pwa'

export function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const demo = api.mode === 'demo'
  const nav = useNavigate()
  const [link, setLink] = useState('')
  const [linkErr, setLinkErr] = useState(false)
  const openLink = (e: FormEvent) => {
    e.preventDefault()
    const token = parseAthleteToken(link)
    if (token) nav(`/a/${token}`)
    else setLinkErr(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'in') await api.signIn(email, password)
      else await api.signUp(email, password)
    } catch (err) {
      setMsg(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <h1>🏃 Coach Athlé</h1>
        <p className="muted">Espace entraîneur</p>
        {demo && (
          <div className="alert info">
            Mode démo : saisis n’importe quel email pour essayer l’application avec des données d’exemple.
          </div>
        )}
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={!demo} autoComplete="email" />
        </label>
        <label className="field">
          <span className="field-label">Mot de passe</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!demo} minLength={demo ? 0 : 6}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        </label>
        {msg && <div className="alert warn">{msg}</div>}
        <button className="btn primary block" disabled={busy}>
          {mode === 'in' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        <button type="button" className="btn ghost block" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Première fois ? Créer un compte entraîneur' : 'J’ai déjà un compte'}
        </button>
      </form>
      <form className="card login-card" onSubmit={openLink}>
        <h2>Tu es athlète ?</h2>
        <p className="muted small">Ouvre le lien personnel reçu par WhatsApp, ou colle-le ici :</p>
        <input value={link} onChange={(e) => { setLink(e.target.value); setLinkErr(false) }} placeholder="https://…/#/a/…" inputMode="url" />
        {linkErr && <div className="alert warn small">Ce lien ne semble pas correct.</div>}
        <button className="btn block" disabled={!link}>Ouvrir mes entraînements</button>
      </form>
    </div>
  )
}
