import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { errorMessage } from '../lib/utils'

export function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const demo = api.mode === 'demo'

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
        <p className="muted small center">
          Tu es athlète ? Utilise le lien personnel envoyé par ton entraîneur.
        </p>
      </form>
    </div>
  )
}
