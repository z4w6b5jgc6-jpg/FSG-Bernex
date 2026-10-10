import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useData } from '../lib/data'
import { Field } from '../components/ui'
import type { ClubInfo, JoinProfile } from '../types'
import { clearPendingJoin, savePendingJoin } from '../lib/pwa'
import { errorMessage } from '../lib/utils'

/** Page d'inscription des athlètes : #/rejoindre/<CODE> ou #/rejoindre/<CODE>/<groupe> */
export function Join() {
  const { code = '', group: groupParam } = useParams()
  const { me, refreshMe } = useData()
  const [club, setClub] = useState<ClubInfo | null | undefined>(undefined)
  const [hasAccount, setHasAccount] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [p, setP] = useState<JoinProfile>({ first_name: '', last_name: '', birth_year: null, group_id: null, events: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'warn' | 'info'; text: string } | null>(null)

  useEffect(() => {
    api.clubByCode(code)
      .then((c) => {
        setClub(c)
        const g = c?.groups.find((x) => x.id === groupParam)
        if (g) setP((x) => ({ ...x, group_id: g.id }))
      })
      .catch(() => setClub(null))
  }, [code, groupParam])

  if (me?.role === 'athlete' || me?.role === 'coach') return <Navigate to="/" replace />
  const set = (patch: Partial<JoinProfile>) => setP({ ...p, ...patch })
  const loggedIn = me?.role === 'new'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (!loggedIn) {
        if (hasAccount) {
          await api.signIn(email, password)
        } else {
          savePendingJoin({ code, profile: p })
          const ok = await api.signUp(email, password)
          if (!ok) {
            setMsg({ kind: 'info', text: '📧 Presque fini ! Ouvre l’email de confirmation qu’on vient de t’envoyer, puis connecte-toi : ton inscription au club se terminera automatiquement.' })
            return
          }
        }
      }
      await api.joinClub(code, p)
      clearPendingJoin()
      await refreshMe()
    } catch (err) {
      setMsg({ kind: 'warn', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  if (club === undefined) return <div className="login"><p className="muted">Chargement…</p></div>
  if (club === null) {
    return (
      <div className="login">
        <div className="card login-card">
          <h2>Lien invalide</h2>
          <p>Ce lien d’inscription n’existe pas ou a été changé. Demande le nouveau lien à ton entraîneur.</p>
          <Link className="btn block" to="/">Aller à la connexion</Link>
        </div>
      </div>
    )
  }

  const year = new Date().getFullYear()
  // Lien d'un groupe précis : le groupe est déjà choisi
  const linkGroup = club.groups.find((g) => g.id === groupParam)
  return (
    <div className="login">
      <div className="login-hero">
        <img src="logo-club.png" alt="FSG Bernex-Confignon" className="club-logo" />
        <h1>Rejoins le programme d’entraînement{linkGroup && <> du groupe <span className="nowrap">{linkGroup.name}</span></>}</h1>
        <p className="muted">Crée ton compte pour retrouver tes séances, suivre tes progrès et donner ton ressenti à ton coach.</p>
      </div>
      <form className="card login-card form" onSubmit={submit}>
        {!loggedIn && (
          <>
            <div className="tabs">
              <button type="button" className={!hasAccount ? 'active' : ''} onClick={() => setHasAccount(false)}>Nouveau compte</button>
              <button type="button" className={hasAccount ? 'active' : ''} onClick={() => setHasAccount(true)}>J’ai déjà un compte</button>
            </div>
            <Field label="Email"><input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required={api.mode !== 'demo'} /></Field>
            <Field label="Mot de passe" hint={hasAccount ? undefined : '6 caractères minimum'}>
              <input type="password" autoComplete={hasAccount ? 'current-password' : 'new-password'} minLength={api.mode === 'demo' ? 0 : 6}
                value={password} onChange={(e) => setPassword(e.target.value)} required={api.mode !== 'demo'} />
            </Field>
          </>
        )}
        <h3>Ton profil</h3>
        <div className="grid2">
          <Field label="Prénom"><input value={p.first_name} onChange={(e) => set({ first_name: e.target.value })} required autoComplete="given-name" /></Field>
          <Field label="Nom"><input value={p.last_name} onChange={(e) => set({ last_name: e.target.value })} autoComplete="family-name" /></Field>
        </div>
        <div className="grid2">
          <Field label="Année de naissance">
            <input type="number" inputMode="numeric" min={year - 80} max={year - 10} value={p.birth_year ?? ''}
              onChange={(e) => set({ birth_year: e.target.value ? Number(e.target.value) : null })} required />
          </Field>
          {linkGroup ? (
            <Field label="Groupe">
              <div className="fixed-value"><span className="dot" style={{ background: linkGroup.color }} />{linkGroup.name}</div>
            </Field>
          ) : (
            <Field label="Groupe">
              <select value={p.group_id ?? ''} onChange={(e) => set({ group_id: e.target.value || null })}>
                <option value="">Je ne sais pas</option>
                {club.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
          )}
        </div>
        <Field label="Tes disciplines"><input value={p.events} onChange={(e) => set({ events: e.target.value })} placeholder="Ex. 100 m, longueur" /></Field>
        <Field label="Téléphone (facultatif)" hint="Pour que ton coach puisse te contacter sur WhatsApp">
          <input type="tel" inputMode="tel" autoComplete="tel" value={p.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="079 123 45 67" />
        </Field>
        <label className="check small">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          J’accepte que mes entraînements, mes retours et mes check-ins bien-être soient visibles par mes entraîneurs.
        </label>
        {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
        <button className="btn primary block" disabled={busy || !consent}>{busy ? '…' : 'Rejoindre le programme 🚀'}</button>
      </form>
    </div>
  )
}
