import {Link} from 'react-router-dom'
import {AvailabilityPanel} from '../../components/AthleteMonitoring'
import { Avatar } from '../../components/Avatar'
import { useState } from 'react'
import { api } from '../../api'
import { useData, useMyAthlete } from '../../lib/data'
import { Field } from '../../components/ui'
import { PushToggle } from '../../components/PushToggle'
import { DevicePrefs } from '../../components/DevicePrefs'
import { logout } from '../../lib/lock'
import { ACCENTS, applyAccent, shownColor } from '../../lib/athlete'
import type { Athlete } from '../../types'
import { errorMessage } from '../../lib/utils'

export function AthleteProfile() {
  const me = useMyAthlete()
  const { me: account, groups, save } = useData()
  const [p, setP] = useState<Partial<Athlete> | null>(me)
  const [saved, setSaved] = useState(false)
  if (!me || !p) return null
  const set = (patch: Partial<Athlete>) => {
    setP({ ...p, ...patch })
    setSaved(false)
    if (patch.color) applyAccent(patch.color)
  }
  const persist = async () => {
    try {
      await save('athletes', {
        id: me.id, events: p.events, goals: p.goals,
        phone: p.phone, avatar: p.avatar, color: p.color,
      })
      setSaved(true)
    } catch (e) {
      alert(errorMessage(e))
    }
  }
  const group = groups.find((g) => g.id === me.group_id)

  return (
    <div>
      <div className="hero">
        <Avatar a={{ first_name: p.first_name ?? '', last_name: p.last_name ?? '', color: shownColor(p.color) }} />
        <div>
          <h1>{p.first_name} {p.last_name}</h1>
          <div className="hero-sub"><span>{account?.club_name}</span>{group && <span>{group.name}</span>}</div>
        </div>
      </div>

      <p><Link className="btn" to="/confidentialite">Confidentialité et mes données</Link></p>
      <AvailabilityPanel athleteId={me.id} />
      <PushToggle />
      {account && <DevicePrefs email={account.email} />}

      <section>
        <h2>Ma couleur</h2>
        <div className="row gap wrap">
          {ACCENTS.map((c) => (
            <button key={c} className={`swatch big ${shownColor(p.color) === c ? 'active' : ''}`} style={{ background: c }} onClick={() => set({ color: c })} aria-label={c} />
          ))}
        </div>
      </section>

      <section className="card form">
        <div className="grid2">
          <Field label="Prénom"><input value={p.first_name ?? ''} readOnly /></Field>
          <Field label="Nom"><input value={p.last_name ?? ''} readOnly /></Field>
        </div>
        <p className="tiny muted">Prénom, nom et année de naissance : demande à ton coach de les corriger si besoin.</p>
        <Field label="Mes disciplines"><input value={p.events ?? ''} onChange={(e) => set({ events: e.target.value })} placeholder="Ex. 100 m, longueur" /></Field>
        <Field label="Mon objectif de la saison"><textarea rows={2} value={p.goals ?? ''} onChange={(e) => set({ goals: e.target.value })} placeholder="Ex. Passer sous les 13 secondes au 100 m" /></Field>
        <div className="grid2">
          <Field label="Année de naissance"><input type="number" value={p.birth_year ?? ''} readOnly /></Field>
          <Field label="Téléphone"><input type="tel" inputMode="tel" value={p.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} /></Field>
        </div>
        <button className="btn primary block" onClick={persist}>{saved ? '✓ Enregistré' : 'Enregistrer'}</button>
      </section>

      <section className="card">
        <div className="muted small">Connecté·e avec {account?.email}</div>
        <p className="small">Ton groupe est géré par ton entraîneur.</p>
        <button className="btn ghost danger" onClick={() => logout(account?.email, api.signOut)}>Se déconnecter</button>
      </section>
    </div>
  )
}
