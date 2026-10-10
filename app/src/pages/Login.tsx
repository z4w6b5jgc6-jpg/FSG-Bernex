import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { errorMessage } from '../lib/utils'

export function Login() {
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ kind: 'warn' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const demo = api.mode === 'demo'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'in') await api.signIn(email, password)
      else if (mode === 'reset') {
        await api.resetPassword(email)
        setMsg({ kind: 'info', text: 'Si un compte existe, un email pour choisir un nouveau mot de passe vient d’être envoyé.' })
      } else {
        const ok = await api.signUp(email, password)
        if (!ok) setMsg({ kind: 'info', text: 'Compte créé ! Confirme ton adresse via l’email reçu, puis connecte-toi.' })
      }
    } catch (err) {
      setMsg({ kind: 'warn', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-hero">
        <img src="logo-club.png" alt="FSG Bernex-Confignon" className="club-logo" />
        <div className="stripes" />
        <h1>Coach Athlé</h1>
        <p className="club-name">Athlétisme</p>
        <p className="muted">Tes entraînements, tes progrès, tes conseils.</p>
      </div>
      <form className="card login-card" onSubmit={submit}>
        {mode !== 'reset' && (
          <div className="tabs">
            <button type="button" className={mode === 'in' ? 'active' : ''} onClick={() => setMode('in')}>Connexion</button>
            <button type="button" className={mode === 'up' ? 'active' : ''} onClick={() => setMode('up')}>Créer un compte</button>
          </div>
        )}
        {mode === 'reset' && <h2>Mot de passe oublié</h2>}
        {demo && mode === 'in' && (
          <div className="alert info small">
            <b>Mode démo</b> — Entraîneur : n’importe quel email. Athlète : <code>lea@demo.ch</code>.
            Inscription d’un nouvel athlète : <a href="#/rejoindre/DEMO2026">lien du club démo</a>.
          </div>
        )}
        {mode === 'up' && (
          <p className="small muted">
            Tu es <b>athlète</b> ? Utilise plutôt le <b>lien d’inscription</b> envoyé par ton entraîneur : tu rejoindras directement ton programme d’entraînement.
          </p>
        )}
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required={!demo} autoComplete="email" />
        </label>
        {mode !== 'reset' && (
          <label className="field">
            <span className="field-label">Mot de passe</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!demo} minLength={demo ? 0 : 6}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
          </label>
        )}
        {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
        <button className="btn primary block" disabled={busy}>
          {mode === 'in' ? 'Se connecter' : mode === 'up' ? 'Créer mon compte' : 'Recevoir l’email'}
        </button>
        {mode === 'in' && <button type="button" className="link small center" onClick={() => setMode('reset')}>Mot de passe oublié ?</button>}
        {mode === 'reset' && <button type="button" className="link small center" onClick={() => setMode('in')}>← Retour</button>}
      </form>
    </div>
  )
}
